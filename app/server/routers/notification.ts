// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import crypto from 'crypto'
import z from 'zod'

import { protectedProcedure } from '~/server/trpc'
import { logger as appLogger } from '~/lib/logger'
import { getNotificationsInputSchema, getNotificationsOutputSchema } from '~/lib/notifications'

export const notificationRouter = {
  getNotifications: protectedProcedure
    .input(getNotificationsInputSchema)
    .output(getNotificationsOutputSchema)
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input
      const notifs = await ctx.prisma.notification.findMany({
        where: {
          userId: ctx.user.id
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : undefined,
      })
      const hasNextPage = notifs.length > limit
      let nextCursor: string | undefined
      if (hasNextPage) {
        const last = notifs.pop()
        nextCursor = last!.id
      }
      return {
        notifications: notifs.map((n) => ({
          id: n.id,
          userId: n.userId,
          content: n.content,
          icon: n.icon,
          navigate: n.navigate ?? undefined,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
        })),
        nextCursor,
      }
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