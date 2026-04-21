import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import crypto from 'crypto'
import z from 'zod'
import { CATEGORIES } from '~/lib/forum'

import { protectedProcedure, publicProcedure } from '~/server/trpc'

const voteSchema = z.enum(['up', 'down'])
const votersSchema = z.record(z.string().min(1) /* user id */, voteSchema)

export const forumRouter = {
  getPosts: publicProcedure
    .input(z.object({
      cursor: z.string().min(1).optional(),
      limit: z.number().int().min(1).max(50).default(10),
      category: z.enum(CATEGORIES).optional(),
      authorId: z.string().min(1).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { cursor, limit, category, authorId } = input
      const posts = await ctx.prisma.forumPost.findMany({
        where: {
          category: category ?? undefined,
          authorId: authorId ?? undefined,
          deleted: false,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
      })
      const hasNextPage = posts.length > limit
      const nextCursor = hasNextPage ? posts.pop()!.id : null

      return { posts, nextCursor }
    }),
  createPost: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      content: z.string().min(1),
      subject: z.string().min(1).max(255).optional(),
      category: z.enum(CATEGORIES),
    }))
    .mutation(async ({ input, ctx }) => {
      const { title, content, subject, category } = input
      const post = await ctx.prisma.forumPost.create({
        data: {
          id: crypto.randomUUID(),
          title,
          content,
          subject: subject ?? null,
          category,
          voters: {},
          cachedTotalVotes: 0,
          author: {
            connect: {
              id: ctx.user!.id
            }
          },
        },
      })
      return post
    }),
  editPost: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(255).optional(),
      content: z.string().min(1).optional(),
      subject: z.string().min(1).max(255).optional(),
      category: z.enum(CATEGORIES).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, title, content, subject, category } = input
      const post = await ctx.prisma.forumPost.findUnique({
        where: { id },
        select: { authorId: true },
      })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      if (post.authorId !== ctx.user!.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only edit your own posts' })

      const updatedPost = await ctx.prisma.forumPost.update({
        where: { id },
        data: {
          title: title ?? undefined,
          content: content ?? undefined,
          subject: subject ?? undefined,
          category: category ?? undefined,
        },
      })
      return updatedPost
    }),
  deletePost: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input
      const post = await ctx.prisma.forumPost.findUnique({
        where: { id },
        select: { authorId: true },
      })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      if (post.authorId !== ctx.user!.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own posts' })

      await ctx.prisma.forumPost.update({
        where: { id },
        data: { deleted: true },
      })
      return 'OK'
    }),
  votePost: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      vote: voteSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, vote } = input
      const post = await ctx.prisma.forumPost.findUnique({
        where: { id },
        select: { voters: true, deleted: true },
      })
      if (!post || post.deleted) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })

      const parsedVoters = votersSchema.safeParse(post.voters)
      const voters = parsedVoters.success ? parsedVoters.data : {}
      const currentVote = voters[ctx.user!.id]

      if (currentVote === vote) {
        delete voters[ctx.user!.id]
      } else {
        voters[ctx.user!.id] = vote
      }

      const voteValues = Object.values(voters)
      const votes = voteValues.reduce((total, currentVote) => total + (currentVote === 'up' ? 1 : -1), 0)
      const cachedTotalVotes = voteValues.length

      return await ctx.prisma.forumPost.update({
        where: { id },
        data: {
          voters,
          votes,
          cachedTotalVotes,
        },
      })
    }),
  replyToPost: protectedProcedure
    .input(z.object({
      postId: z.string().min(1),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const { postId, content } = input
      const parentPost = await ctx.prisma.forumPost.findUnique({
        where: { id: postId },
        select: { category: true, subject: true, deleted: true },
      })
      if (!parentPost || parentPost.deleted) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })

      const reply = await ctx.prisma.forumPost.create({
        data: {
          id: crypto.randomUUID(),
          content,
          author: {
            connect: {
              id: ctx.user!.id
            }
          },
          category: parentPost.category,
          subject: parentPost.subject,
          voters: {},
          cachedTotalVotes: 0,
        }
      })
      return reply
    }),
} satisfies TRPCRouterRecord