import { createTRPCRouter } from './trpc'

import { forumRouter } from './routers/forum'
import { ListRouter } from './routers/lists'

export const appRouter = createTRPCRouter({
  list: ListRouter,
  forum: forumRouter,
})

export type AppRouter = typeof appRouter
