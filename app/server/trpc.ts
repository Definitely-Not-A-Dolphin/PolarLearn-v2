

import superjson from 'superjson'

import { z, ZodError } from 'zod'
import { initTRPC, TRPCError } from '@trpc/server'

import { prisma } from '~/lib/db'
import { auth } from '~/lib/auth/server'

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const authSession = await auth.api.getSession({
    headers: opts.headers
  })
  return {
    prisma,
    user: authSession?.user
  }
}
type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? z.treeifyError(error.cause) : null
    }
  })
})

export const createCallerFactory = t.createCallerFactory

export const createTRPCRouter = t.router

export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      user: ctx.user
    }
  })
})