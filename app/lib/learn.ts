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

import { z } from "zod";
import type { ListItem } from "./list";
import { t } from "~/i18n";
import {
  GraduationCap,
  PencilLine,
  Lightbulb,
  CheckSquare,
} from "lucide-react";

export const modes = z.enum(["test", "hint", "multiplechoice", "learn"]);

export const queueQuestion = z.object({
  id: z.string(),
  type: modes,
  question: z.string(),
  answer: z.array(z.string()), // correct answer(s)
  decoys: z.array(z.string()).optional(),
});
export const queueSchema = z.array(queueQuestion);

export const answerLogEntrySchema = z.object({
  question: z.string(),
  answer: z.string(),
  isCorrect: z.boolean(),
  timestamp: z.number(),
  questionText: z.string().optional(),
  correctAnswer: z.string().optional(),
  questionType: modes.optional(),
});

export const answerLogSchema = z.array(answerLogEntrySchema);

function shuffleArray<T>(values: T[]): T[] {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));

    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

export function generateHint(answer: string): string {
  return answer
    .split(/(\s+)/)
    .map((segment) => {
      if (/^\s+$/.test(segment)) {
        return segment;
      }

      if (segment.length <= 1) {
        return segment;
      }

      return `${segment.charAt(0)}${"_".repeat(Math.max(2, segment.length - 1))}`;
    })
    .join("");
}

export function createLearningQueue(
  items: ListItem[],
  mode: z.infer<typeof modes>,
  ask: "q" | "a" | "both" = "q",
): z.infer<typeof queueSchema> {
  const queue: z.infer<typeof queueSchema> = [];

  const directions = ask === "both" ? (["q", "a"] as const) : ([ask] as const);

  for (const item of items) {
    for (const direction of directions) {
      const isReversed = direction === "a";
      const getQuestion = (i: ListItem) => (isReversed ? i.answer : i.question);
      const getAnswer = (i: ListItem) => (isReversed ? i.question : i.answer);

      const getMultipleChoiceDecoys = (target: ListItem): string[] => {
        const otherAnswers = items
          .filter((i) => i.id !== target.id)
          .map((i) => getAnswer(i));

        return shuffleArray(otherAnswers).slice(0, 3);
      };

      if (mode === "learn") {
        queue.push({
          id: crypto.randomUUID(),
          type: "test",
          question: getQuestion(item),
          answer: [getAnswer(item)],
        });
        queue.push({
          id: crypto.randomUUID(),
          type: "hint",
          question: getQuestion(item),
          answer: [getAnswer(item)],
        });
        queue.push({
          id: crypto.randomUUID(),
          type: "multiplechoice",
          question: getQuestion(item),
          answer: [getAnswer(item)],
          decoys: getMultipleChoiceDecoys(item),
        });
      }

      if (mode === "test" || mode === "hint") {
        queue.push({
          id: crypto.randomUUID(),
          type: mode,
          question: getQuestion(item),
          answer: [getAnswer(item)],
        });
      }

      if (mode === "multiplechoice") {
        queue.push({
          id: crypto.randomUUID(),
          type: "multiplechoice",
          question: getQuestion(item),
          answer: [getAnswer(item)],
          decoys: getMultipleChoiceDecoys(item),
        });
      }
    }
  }

  return shuffleArray(queue);
}

export const learningModes = [
  {
    mode: "learn" as const,
    title: t("learn.modes.learn"),
    icon: GraduationCap,
  },
  {
    mode: "test" as const,
    title: t("learn.modes.test"),
    icon: PencilLine,
  },
  {
    mode: "hint" as const,
    title: t("learn.modes.hint"),
    icon: Lightbulb,
  },
  {
    mode: "multiplechoice" as const,
    title: t("learn.modes.multiplechoice"),
    icon: CheckSquare,
  },
] as const;

export const listPrefsSchema = z.record(
  z.string(),
  z.object({
    ask: z.enum(["q", "a", "both"]),
  }),
);

export type listPrefs = z.infer<typeof listPrefsSchema>;
