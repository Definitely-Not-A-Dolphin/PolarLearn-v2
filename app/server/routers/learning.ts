import { TRPCError } from '@trpc/server'

import { createTRPCRouter, protectedProcedure } from '~/server/trpc'
import { z } from 'zod'
import { answerLogSchema, createLearningQueue, modes, queueSchema } from '~/lib/learn'
import { listSnapshot } from '~/lib/list'
import { prisma } from '~/lib/db'

export const learningRouter = createTRPCRouter({
  generateLearnSession: protectedProcedure
    .input(z.object({
      listId: z.string(),
      mode: modes.optional().default('quiz'),
    }))
    .mutation(async ({ input, ctx }) => {
      const existingSession = await prisma.learnSession.findFirst({
        where: {
          listId: input.listId,
          userId: ctx.user.id,
          isComplete: false,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })

      if (existingSession) {
        return { id: existingSession.id }
      }

      const list = await prisma.list.findFirst({
        where: {
          id: input.listId,
        },
        select: {
          id: true,
          items: true,
        },
      })

      if (!list) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'List not found' })
      }

      const parsedItems = listSnapshot.parse(list.items)
      const queue = createLearningQueue(parsedItems, input.mode)

      const session = await prisma.learnSession.create({
        data: {
          id: crypto.randomUUID(),
          listId: input.listId,
          userId: ctx.user.id,
          queue,
          answerLog: [],
          isComplete: false,
        },
      })

      return { id: session.id }
    }),
  getLearnSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const session = await prisma.learnSession.findFirst({
        where: {
          id: input.sessionId,
          userId: ctx.user.id,
        },
        select: {
          id: true,
          listId: true,
          queue: true,
          answerLog: true,
          isComplete: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      return {
        id: session.id,
        listId: session.listId,
        queue: queueSchema.parse(session.queue),
        answerLog: answerLogSchema.parse(session.answerLog),
        isComplete: session.isComplete,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }
    }),
  updateSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      answerLog: answerLogSchema,
      queue: queueSchema,
      isComplete: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await prisma.learnSession.findFirst({
        where: {
          id: input.sessionId,
          userId: ctx.user.id,
        },
      })

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      await prisma.learnSession.update({
        where: {
          id: input.sessionId,
        },
        data: {
          answerLog: input.answerLog,
          queue: input.queue,
          isComplete: input.isComplete,
        },
      })
    }),
})