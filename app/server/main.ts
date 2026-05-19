import { createTRPCRouter } from './trpc'

import { forumRouter } from './routers/forum'
import { ListRouter } from './routers/lists'
import { learningRouter } from './routers/learning'
import { groupsRouter } from './routers/groups'
import { searchRouter } from './routers/search'

export const appRouter = createTRPCRouter({
  list: ListRouter,
  forum: forumRouter,
  learning: learningRouter,
  groups: groupsRouter,
  search: searchRouter,
})

export type AppRouter = typeof appRouter
