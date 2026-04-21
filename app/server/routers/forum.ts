import type { TRPCRouterRecord } from '@trpc/server'

import { publicProcedure } from '~/server/trpc'

export const forumRouter = {
  getPosts: publicProcedure.query(() => {
    return []
  })
} satisfies TRPCRouterRecord