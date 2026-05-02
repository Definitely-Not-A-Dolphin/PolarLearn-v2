import { createTRPCRouter } from './trpc'

import { forumRouter } from './routers/forum'
import { ListRouter } from './routers/lists'
import { learningRouter } from './routers/learning'

export const appRouter = createTRPCRouter({
  list: ListRouter,
  forum: forumRouter,
  learning: learningRouter,
})

export type AppRouter = typeof appRouter
