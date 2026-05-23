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
} satisfies TRPCRouterRecord
