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
    const sourceItem = items.find((item) => item.question === firstQuestion?.question)

    expect(firstQuestion?.type).toBe('multiplechoice')
    expect(firstQuestion?.decoys).toHaveLength(3)
    expect(firstQuestion?.decoys).not.toContain(sourceItem?.answer)
    expect([...firstQuestion!.decoys!].sort()).toEqual(
      items
        .filter((item) => item.id !== sourceItem?.id)
        .map((item) => item.answer)
        .sort(),
    )
  })
})
