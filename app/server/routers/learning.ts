 
import type { TRPCRouterRecord } from '@trpc/server'

import { protectedProcedure } from '~/server/trpc'
import { z } from 'zod'
import { listItem } from '~/lib/list'
import { prisma } from '~/lib/db'

export const queueQuestion = z.object({
  type: z.enum(["test", "hint", "multiplechoice"]),
  question: z.string(),
  answer: z.array(z.string()), // one answer for test/hints, multiple for multiple choice
})

export const queueSchema = z.array(queueQuestion)

export const greetingRouter = {
  createLearningQueue: protectedProcedure
    .input(z.object({
      mode: z.enum(["test", "hint", "multiplechoice", "quiz"]),
      items: z.array(listItem)
    }))
    .query(({ input }) => {
      const queue: z.infer<typeof queueSchema> = []
      for (const item of input.items) {
        if (input.mode === "quiz") {
          queue.push({
            type: "test",
            question: item.question,
            answer: [item.answer],
          })
          queue.push({
            type: "hint",
            question: item.question,
            answer: [item.answer],
          })

          const otherAnswers = input.items
            .filter(i => i.id !== item.id) // exclude current item
            .map(i => i.answer)

          const distractors = otherAnswers
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)

          const allOptions = [...distractors, item.answer]
            .sort(() => Math.random() - 0.5)

          queue.push({
            type: "multiplechoice",
            question: item.question,
            answer: allOptions,
          })
        }
        if (input.mode === "test" || input.mode === "hint") {
          queue.push({
            type: input.mode,
            question: item.question,
            answer: [item.answer],
          })
        }

        if (input.mode === "multiplechoice") {
          const otherAnswers = input.items
            .filter(i => i.id !== item.id) // exclude current item
            .map(i => i.answer)
          const distractors = otherAnswers
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
          const allOptions = [...distractors, item.answer]
            .sort(() => Math.random() - 0.5)
          queue.push({
            type: "multiplechoice",
            question: item.question,
            answer: allOptions,
          })
        }
      }
      return queue
    }),
  initSession: protectedProcedure
    .input(z.object({
      listId: z.string(),
      queue: queueSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await prisma.listSession.create({
        data: {
          id: crypto.randomUUID(),
          listId: input.listId,
          userId: ctx.user.id,
          queue: input.queue,
          answerLog: [],
        }
      })
      return session.id
    })
} satisfies TRPCRouterRecord