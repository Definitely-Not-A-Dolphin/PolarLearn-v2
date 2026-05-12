import { z } from "zod"
import { Prisma } from "~/prisma/client"
import { answerLogSchema } from "~/lib/learn"

export const sessionSummarySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.literal("finished"),
  correct: z.number(),
  incorrect: z.number(),
  total: z.number(),
  scorePercentage: z.number(),
  grade: z.number(),
})

export type SessionSummary = z.infer<typeof sessionSummarySchema>

export const sessionSummaryLoaderSchema = z.object({
  listId: z.string(),
  sessions: z.array(sessionSummarySchema),
})

export type SessionSummaryLoaderData = z.infer<typeof sessionSummaryLoaderSchema>

export type SessionSummarySource = Prisma.LearnSessionGetPayload<{
  select: {
    id: true
    createdAt: true
    updatedAt: true
    answerLog: true
  }
}>

export function buildSessionSummary(session: SessionSummarySource): SessionSummary {
  const parsedAnswerLog = answerLogSchema.safeParse(session.answerLog)
  const answerLog = parsedAnswerLog.success ? parsedAnswerLog.data : []
  const total = answerLog.length
  const correct = answerLog.filter((entry) => entry.isCorrect).length
  const incorrect = total - correct
  const scorePercentage = total > 0 ? Math.round((correct / total) * 100) : 0
  const grade = total > 0 ? Number((((correct / total) * 9) + 1).toFixed(1)) : 1

  return sessionSummarySchema.parse({
    id: session.id,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    status: "finished",
    correct,
    incorrect,
    total,
    scorePercentage,
    grade,
  })
}