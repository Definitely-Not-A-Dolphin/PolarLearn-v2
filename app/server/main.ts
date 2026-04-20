import { createTRPCRouter } from './trpc'

import { ListRouter } from './routers/lists'

export const appRouter = createTRPCRouter({
  list: ListRouter
})

export type AppRouter = typeof appRouter
