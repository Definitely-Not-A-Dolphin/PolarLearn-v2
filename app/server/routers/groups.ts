import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import z from 'zod'

import { protectedProcedure } from '~/server/trpc'

export const groupsRouter = {
  getJoinedGroups: protectedProcedure.query(async ({ ctx }) => {
    const groups = await ctx.prisma.group.findMany({
      where: {
        members: {
          some: {
            id: ctx.user.id,
          },
        }
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
      }
    })
    return groups
  }),
  getListsInGroup: protectedProcedure.input(
    z.object({
      id: z.string(),
    })
  ).query(async ({ ctx, input }) => {
    const lists = await ctx.prisma.list.findMany({
      where: {
        inGroups: {
          some: {
            id: input.id,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
      }
    })
    return lists
  }),
  createGroup: protectedProcedure.input(
    z.object({
      name: z.string().min(3).max(50),
      description: z.string().max(255).optional(),
      image: z.string().url().optional(),
      approvalRequired: z.boolean().optional(),
      onlyModsCanAddLists: z.boolean().optional(),
    })
  ).mutation(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.create({
      data: {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description,
        image: input.image ?? null,
        approvalRequired: input.approvalRequired ?? false,
        onlyModsCanAddLists: input.onlyModsCanAddLists ?? false,
        creator: {
          connect: {
            id: ctx.user.id,
          },
        },
        members: {
          connect: {
            id: ctx.user.id,
          },
        },
        moderators: {
          connect: {
            id: ctx.user.id,
          },
        },
      },
    })
    return group
  }),
  getGroupData: protectedProcedure.input(
    z.object({
      id: z.string(),
    })
  ).query(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.findUnique({
      where: {
        id: input.id,
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        moderators: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        lists: {
          select: {
            id: true,
            name: true,
            description: true,
            subject: true,
            user: {
              select: {
                id: true,
                name: true,
              }
            },
          }
        }
        ,
        approvalQueue: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    })
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    return group
  }),
  addListToGroup: protectedProcedure.input(
    z.object({
      groupId: z.string(),
      listId: z.string(),
    })
  ).mutation(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.findUnique({
      where: {
        id: input.groupId,
      },
      include: {
        members: {
          select: {
            id: true,
          }
        }, moderators: {
          select: {
            id: true,
          }
        },
      }
    })
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    const isMember = group.members.some((member) => member.id === ctx.user.id)
    const isModerator = group.moderators.some((mod) => mod.id === ctx.user.id)
    if (!isMember) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be a member of the group to add lists' })
    }
    if (group.onlyModsCanAddLists && !isModerator) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only moderators can add lists to this group' })
    }
    const existing = await ctx.prisma.list.findFirst({
      where: { id: input.listId },
      include: { inGroups: { select: { id: true } } },
    })
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    if ((existing.inGroups ?? []).some((g) => g.id === input.groupId)) {
      return 'ALREADY'
    }

    await ctx.prisma.list.update({
      where: {
        id: input.listId,
      },
      data: {
        inGroups: {
          connect: {
            id: input.groupId,
          },
        },
      },
    })
    return 'OK'
  }),
  removeListFromGroup: protectedProcedure.input(
    z.object({
      groupId: z.string(),
      listId: z.string(),
    })
  ).mutation(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.findUnique({
      where: { id: input.groupId },
      include: {
        moderators: { select: { id: true } },
      },
    })
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    const isModerator = group.moderators.some((mod) => mod.id === ctx.user.id)
    const isOwner = group.creatorId === ctx.user.id
    if (!isModerator && !isOwner) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners or moderators can remove lists from this group' })
    }

    await ctx.prisma.list.update({
      where: { id: input.listId },
      data: {
        inGroups: {
          disconnect: {
            id: input.groupId,
          },
        },
      },
    })

    return 'OK'
  }),
  joinGroup: protectedProcedure.input(
    z.object({
      id: z.string(),
    })
  ).mutation(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.findUnique({
      where: {
        id: input.id,
      },
      include: {
        members: {
          select: {
            id: true,
          }
        }
      }
    })
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    if (group.members.some((member) => member.id === ctx.user.id)) {
      throw new TRPCError({ code: 'BAD_REQUEST' })
    }
    if (group.approvalRequired) {
      await ctx.prisma.group.update({
        where: {
          id: input.id,
        },
        data: {
          approvalQueue: {
            connect: {
              id: ctx.user.id,
            },
          },
        },
      })
      return 'PENDING'
    }
    await ctx.prisma.group.update({
      where: {
        id: input.id,
      },
      data: {
        members: {
          connect: {
            id: ctx.user.id,
          },
        },
      },
    })
    return 'OK'
  }),
  approveGroupMember: protectedProcedure.input(
    z.object({
      groupId: z.string(),
      userId: z.string(),
    })
  ).mutation(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.findUnique({
      where: {
        id: input.groupId,
      },
      include: {
        approvalQueue: {
          select: {
            id: true,
          },
        },
      },
    })
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    if (group.creatorId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    if (!group.approvalQueue.some((member) => member.id === input.userId)) {
      throw new TRPCError({ code: 'BAD_REQUEST' })
    }

    await ctx.prisma.group.update({
      where: {
        id: input.groupId,
      },
      data: {
        members: {
          connect: {
            id: input.userId,
          },
        },
        approvalQueue: {
          disconnect: {
            id: input.userId,
          },
        },
      },
    })

    return 'OK'
  }),
  rejectGroupMember: protectedProcedure.input(
    z.object({
      groupId: z.string(),
      userId: z.string(),
    })
  ).mutation(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.findUnique({
      where: {
        id: input.groupId,
      },
      include: {
        approvalQueue: {
          select: {
            id: true,
          },
        },
      },
    })
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    if (group.creatorId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    if (!group.approvalQueue.some((member) => member.id === input.userId)) {
      throw new TRPCError({ code: 'BAD_REQUEST' })
    }

    await ctx.prisma.group.update({
      where: {
        id: input.groupId,
      },
      data: {
        approvalQueue: {
          disconnect: {
            id: input.userId,
          },
        },
      },
    })

    return 'OK'
  }),
  toggleGroupModerator: protectedProcedure.input(
    z.object({
      groupId: z.string(),
      userId: z.string(),
    })
  ).mutation(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.findUnique({
      where: {
        id: input.groupId,
      },
      include: {
        members: {
          select: {
            id: true,
          },
        },
        moderators: {
          select: {
            id: true,
          },
        },
      },
    })
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    if (group.creatorId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    if (input.userId === group.creatorId) {
      throw new TRPCError({ code: 'BAD_REQUEST' })
    }
    if (!group.members.some((member) => member.id === input.userId)) {
      throw new TRPCError({ code: 'BAD_REQUEST' })
    }

    const isModerator = group.moderators.some((moderator) => moderator.id === input.userId)

    await ctx.prisma.group.update({
      where: {
        id: input.groupId,
      },
      data: isModerator
        ? {
          moderators: {
            disconnect: {
              id: input.userId,
            },
          },
        }
        : {
          moderators: {
            connect: {
              id: input.userId,
            },
          },
        },
    })

    return isModerator ? 'UNPROMOTED' : 'PROMOTED'
  }),
  kickGroupMember: protectedProcedure.input(
    z.object({
      groupId: z.string(),
      userId: z.string(),
    })
  ).mutation(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.findUnique({
      where: {
        id: input.groupId,
      },
      include: {
        members: {
          select: {
            id: true,
          },
        },
        moderators: {
          select: {
            id: true,
          },
        },
      },
    })
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    if (group.creatorId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    if (input.userId === group.creatorId) {
      throw new TRPCError({ code: 'BAD_REQUEST' })
    }
    if (!group.members.some((member) => member.id === input.userId)) {
      throw new TRPCError({ code: 'BAD_REQUEST' })
    }

    await ctx.prisma.group.update({
      where: {
        id: input.groupId,
      },
      data: {
        members: {
          disconnect: {
            id: input.userId,
          },
        },
        moderators: {
          disconnect: {
            id: input.userId,
          },
        },
      },
    })

    return 'OK'
  }),
  leaveGroup: protectedProcedure.input(
    z.object({
      id: z.string(),
    })
  ).mutation(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.findUnique({
      where: {
        id: input.id,
      },
    })
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    await ctx.prisma.group.update({
      where: {
        id: input.id,
      },
      data: {
        members: {
          disconnect: {
            id: ctx.user.id,
          },
        },
      },
    })
    return 'OK'
  }),
  updateGroup: protectedProcedure.input(
    z.object({
      id: z.string(),
      name: z.string().min(3).max(50).optional(),
      description: z.string().max(255).optional(),
      approvalRequired: z.boolean().optional(),
      onlyModsCanAddLists: z.boolean().optional(),
    })
  ).mutation(async ({ ctx, input }) => {
    const group = await ctx.prisma.group.findUnique({
      where: {
        id: input.id,
      },
      include: {
        moderators: {
          select: {
            id: true,
          }
        }
      }
    })
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    if (group.creatorId !== ctx.user.id || !group.moderators.some((mod) => mod.id === ctx.user.id)) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    const updatedGroup = await ctx.prisma.group.update({
      where: {
        id: input.id,
      },
      data: {
        name: input.name ?? group.name,
        description: input.description ?? group.description,
        approvalRequired: input.approvalRequired ?? group.approvalRequired,
        onlyModsCanAddLists: input.onlyModsCanAddLists ?? group.onlyModsCanAddLists,
      },
    })
    return updatedGroup
  }),
} satisfies TRPCRouterRecord