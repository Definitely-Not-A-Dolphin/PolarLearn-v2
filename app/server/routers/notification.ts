import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import crypto from 'crypto'
import z from 'zod'

import { protectedProcedure, publicProcedure } from '~/server/trpc'
import { logger as appLogger } from '~/lib/logger'

export const notificationRouter = {
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    const notifs = await ctx.prisma.notification.findMany({
      where: {
        userId: ctx.user.id
      }
    })
    return notifs
  }),
  readNotification: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.notification.updateMany({
        where: {
          id: input.id,
          userId: ctx.user.id
        },
        data: {
          read: true
        }
      })
      return 'OK'
    }),
  sendNotification: protectedProcedure
    .input(z.object({
      userId: z.string(),
      content: z.string(),
      icon: z.string(),
      navigate: z.string().optional(),
      system: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.system && input.system !== process.env.SECRET) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'really' })
      }
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'fuk yu' })
      }
      await ctx.prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: input.userId,
          content: input.content,
          icon: input.icon,
          navigate: input.navigate
        }
      })
      appLogger.info({
        event: "admin.notification.sent",
        userId: ctx.user.id,
        targetUserId: input.userId,
        content: input.content,
        icon: input.icon,
      })
      return 'OK'
    })
} satisfies TRPCRouterRecord