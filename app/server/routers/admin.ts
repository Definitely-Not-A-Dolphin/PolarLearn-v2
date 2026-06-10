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
import z from 'zod'

import { logger as appLogger } from '~/lib/logger'
import { protectedProcedure } from '~/server/trpc'

export const adminRouter = {
  setForumBan: protectedProcedure
    .input(z.object({
      userId: z.string(),
      banned: z.boolean(),
      reason: z.string().optional(),
    }).superRefine((input, ctx) => {
      if (input.banned && !input.reason?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["reason"],
          message: "A ban reason is required",
        })
      }
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'no' })
      }
      const reason = input.reason?.trim()
      await ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          forumBanned: input.banned,
          forumBanReason: input.banned ? (reason ?? null) : null,
        },
      })
      appLogger.info({
        event: 'admin.forum_ban.updated',
        userId: ctx.user.id,
        targetUserId: input.userId,
        banned: input.banned,
        reasonProvided: Boolean(reason),
      })
      return input.banned ? 'BANNED' : 'UNBANNED'
    }),
  setAnnouncement: protectedProcedure
    .input(z.object({
      content: z.string().max(5000),
      scope: z.string().optional() // if no scope then global
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'nice try lmao' })
      }
      await ctx.prisma.config.update({
        where: {
          key: "announcement",
          scope: input.scope || "global",
        },
        data: {
          value: input.content,
        }
      })
    })
} satisfies TRPCRouterRecord
