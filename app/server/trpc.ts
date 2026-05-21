

import superjson from 'superjson'

import { z, ZodError } from 'zod'
import { initTRPC, TRPCError } from '@trpc/server'

import { prisma } from '~/lib/db'
import { auth } from '~/lib/auth/server'
function extractIpFromHeaders(headers: Headers): string | null {
  const headerKeys = ['cf-connecting-ip', 'true-client-ip', 'x-forwarded-for', 'x-real-ip'] as const
  for (const header of headerKeys) {
    const value = headers.get(header)
    if (value) {
      if (header === 'x-forwarded-for') {
        return value.split(',')[0]?.trim() ?? null
      }
      return value
    }
  }
  return null
}

export const createTRPCContext = async (opts: { headers: Headers; request?: Request }) => {
  const authSession = await auth.api.getSession({
    headers: opts.headers
  })
  const ipAddress = opts.request
    ? extractIpFromHeaders(opts.request.headers)
    : extractIpFromHeaders(opts.headers)
  return {
    prisma,
    user: authSession?.user,
    ipAddress,
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
      user: ctx.user,
      ipAddress: ctx.ipAddress,
    }
  })
})