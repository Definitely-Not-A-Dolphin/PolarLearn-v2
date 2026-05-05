import { createTRPCRouter } from './trpc'

import { forumRouter } from './routers/forum'
import { ListRouter } from './routers/lists'
import { learningRouter } from './routers/learning'
import { groupsRouter } from './routers/groups'

export const appRouter = createTRPCRouter({
  list: ListRouter,
  forum: forumRouter,
  learning: learningRouter,
  groups: groupsRouter
})

export type AppRouter = typeof appRouter
