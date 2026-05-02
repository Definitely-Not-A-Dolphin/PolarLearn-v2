import { TRPCError } from '@trpc/server'
import crypto from 'crypto'
import {
  getPostsInputSchema,
  getPostInputSchema,
  createPostInputSchema,
  editPostInputSchema,
  deletePostInputSchema,
  votersSchema,
  replyToPostInputSchema,
  votePostInputSchema,
  getPostRepliesInputSchema,
} from '~/lib/forum'

import { createTRPCRouter, protectedProcedure, publicProcedure } from '~/server/trpc'

export const forumRouter = createTRPCRouter({
  getPosts: publicProcedure
    .input(getPostsInputSchema)
    .query(async ({ input, ctx }) => {
      const { cursor, limit, category, authorId } = input
      const posts = await ctx.prisma.forumPost.findMany({
        where: {
          category: category ?? undefined,
          authorId: authorId ?? undefined,
          deleted: false,
          NOT: {
            category: 'pr-discussion',
          },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              displayUsername: true,
              image: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      })
      const hasNextPage = posts.length > limit
      let nextCursor: string | null = null
      if (hasNextPage) {
        const lastPost = posts.pop()
        if (lastPost) {
          nextCursor = lastPost.id
        }
      }

      return { posts, nextCursor }
    }),
  getPost: publicProcedure
    .input(getPostInputSchema)
    .query(async ({ input, ctx }) => {
      const { id } = input
      const post = await ctx.prisma.forumPost.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              displayUsername: true,
              image: true,
            },
          },
        },
      })
      if (!post || post.deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      }
      return post
    }),
  createPost: protectedProcedure
    .input(createPostInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { title, content, subject, category } = input
      if (category === "announcement" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
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
              id: ctx.user.id
            }
          },
        },
      })
      return post
    }),
  editPost: protectedProcedure
    .input(editPostInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, title, content, subject, category } = input
      const post = await ctx.prisma.forumPost.findUnique({
        where: { id },
        select: { authorId: true },
      })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      if (post.authorId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only edit your own posts' })

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
    .input(deletePostInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { id } = input
      const post = await ctx.prisma.forumPost.findUnique({
        where: { id },
        select: { authorId: true },
      })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      if (post.authorId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own posts' })

      await ctx.prisma.forumPost.update({
        where: { id },
        data: { deleted: true },
      })
      return 'OK'
    }),
  votePost: protectedProcedure
    .input(votePostInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, vote } = input
      const post = await ctx.prisma.forumPost.findUnique({
        where: { id },
        select: { voters: true, deleted: true },
      })
      if (!post || post.deleted) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })

      const parsedVoters = votersSchema.safeParse(post.voters)
      let voters = parsedVoters.success ? parsedVoters.data : {}
      const userId = ctx.user.id
      const currentVote = voters[userId]

      if (currentVote === vote) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [userId]: _, ...restVoters } = voters
        voters = restVoters
      } else {
        voters = { ...voters, [userId]: vote }
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
    .input(replyToPostInputSchema)
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
          isReply: true,
          replyToId: postId,
          authorId: ctx.user.id,
          category: parentPost.category,
          subject: parentPost.subject,
          voters: {},
          cachedTotalVotes: 0,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              displayUsername: true,
              image: true,
            },
          },
        },
      })
      return reply
    }),
  pinPost: protectedProcedure
    .input(deletePostInputSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can pin posts' })
      const { id } = input
      const post = await ctx.prisma.forumPost.findUnique({
        where: { id },
        select: { pinned: true, deleted: true },
      })
      if (!post || post.deleted) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      await ctx.prisma.forumPost.update({
        where: { id },
        data: { pinned: !post.pinned },
      })
      return 'OK'
    }),
  getPostReplies: publicProcedure
    .input(getPostRepliesInputSchema)
    .query(async ({ input, ctx }) => {
      const { postId, cursor, limit } = input

      // First verify the parent post exists and is not deleted
      const parentPost = await ctx.prisma.forumPost.findUnique({
        where: { id: postId },
        select: { id: true, deleted: true },
      })
      if (!parentPost || parentPost.deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      }

      const replies = await ctx.prisma.forumPost.findMany({
        where: {
          replyToId: postId,
          deleted: false,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              displayUsername: true,
              image: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      })

      const hasNextPage = replies.length > limit
      let nextCursor: string | null = null
      if (hasNextPage) {
        const lastReply = replies.pop()
        if (lastReply) {
          nextCursor = lastReply.id
        }
      }

      return { replies, nextCursor }
    }),
})
