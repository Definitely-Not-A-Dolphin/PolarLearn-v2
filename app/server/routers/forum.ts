import type { TRPCRouterRecord } from '@trpc/server'

import { protectedProcedure, publicProcedure } from '~/server/trpc'

export const forumRouter = {
  getPosts: publicProcedure.query(async ({ ctx }) => {
    
  })
} satisfies TRPCRouterRecord