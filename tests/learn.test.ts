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

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLearningQueue } from '~/lib/learn'

const items = [
  { id: '1', question: 'A', answer: '1' },
  { id: '2', question: 'B', answer: '2' },
  { id: '3', question: 'C', answer: '3' },
  { id: '4', question: 'D', answer: '4' },
]

describe('createLearningQueue', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shuffles the queue order', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const queue = createLearningQueue(items, 'test')

    expect(queue.map((entry) => entry.question)).toEqual(['B', 'C', 'D', 'A'])
  })

  it('shuffles multiple choice decoys and keeps three distractors', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const queue = createLearningQueue(items, 'multiplechoice')
    const firstQuestion = queue[0]
    const sourceItem = items.find((item) => item.question === firstQuestion.question)

    expect(firstQuestion.type).toBe('multiplechoice')
    if (firstQuestion.type !== 'multiplechoice') {
      throw new Error('Expected a multiple choice question')
    }

    const decoys = firstQuestion.decoys
    if (!decoys) {
      throw new Error('Expected multiple choice decoys')
    }

    expect(decoys).toHaveLength(3)
    expect(decoys).not.toContain(sourceItem?.answer)
    expect([...decoys].sort()).toEqual(
      items
        .filter((item) => item.id !== sourceItem?.id)
        .map((item) => item.answer)
        .sort(),
    )
  })
})
