import type { TRPCRouterRecord } from '@trpc/server'
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
} satisfies TRPCRouterRecord