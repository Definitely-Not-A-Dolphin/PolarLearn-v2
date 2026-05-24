// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { z } from 'zod'
import type { ListItem } from './list'

export const modes = z.enum(["test", "hint", "multiplechoice", "quiz"])

export const queueQuestion = z.object({
  id: z.string(),
  type: modes,
  question: z.string(),
  answer: z.array(z.string()), // correct answer(s)
  decoys: z.array(z.string()).optional(),
})
export const queueSchema = z.array(queueQuestion)

export const answerLogEntrySchema = z.object({
  question: z.string(),
  answer: z.string(),
  isCorrect: z.boolean(),
  timestamp: z.number(),
  questionText: z.string().optional(),
  correctAnswer: z.string().optional(),
  questionType: modes.optional(),
})

export const answerLogSchema = z.array(answerLogEntrySchema)

function shuffleArray<T>(values: T[]): T[] {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))

      ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

export function generateHint(answer: string): string {
  return answer
    .split(/(\s+)/)
    .map((segment) => {
      if (/^\s+$/.test(segment)) {
        return segment
      }

      if (segment.length <= 1) {
        return segment
      }

      return `${segment.charAt(0)}${'_'.repeat(Math.max(2, segment.length - 1))}`
    })
    .join('')
}

export function createLearningQueue(items: ListItem[], mode: z.infer<typeof modes>): z.infer<typeof queueSchema> {
  const queue: z.infer<typeof queueSchema> = []

  const getMultipleChoiceDecoys = (item: ListItem): string[] => {
    const otherAnswers = items
      .filter(i => i.id !== item.id)
      .map(i => i.answer)

    const decoys = shuffleArray(otherAnswers).slice(0, 3)

    return decoys
  }

  for (const item of items) {
    if (mode === "quiz") {
      queue.push({
        id: crypto.randomUUID(),
        type: "test",
        question: item.question,
        answer: [item.answer],
      })
      queue.push({
        id: crypto.randomUUID(),
        type: "hint",
        question: item.question,
        answer: [item.answer],
      })
      queue.push({
        id: crypto.randomUUID(),
        type: "multiplechoice",
        question: item.question,
        answer: [item.answer],
        decoys: getMultipleChoiceDecoys(item),
      })
    }

    if (mode === "test" || mode === "hint") {
      queue.push({
        id: crypto.randomUUID(),
        type: mode,
        question: item.question,
        answer: [item.answer],
      })
    }

    if (mode === "multiplechoice") {
      queue.push({
        id: crypto.randomUUID(),
        type: "multiplechoice",
        question: item.question,
        answer: [item.answer],
        decoys: getMultipleChoiceDecoys(item),
      })
    }
  }

  return shuffleArray(queue)
}