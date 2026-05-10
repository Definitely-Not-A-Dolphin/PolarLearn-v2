import { createStore } from 'zustand/vanilla'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { z } from 'zod'
import { answerLogSchema, queueSchema, queueQuestion } from '~/lib/learn'

type LearnQueue = z.infer<typeof queueSchema>
type QueueQuestion = z.infer<typeof queueQuestion>
type AnswerLogEntry = z.infer<typeof answerLogSchema>[number]

export interface FeedbackState {
  isVisible: boolean
  isCorrect: boolean
  correctAnswer: string
  userAnswer: string
  questionId: string
}

export interface LearnStoreInitData {

  listId: string
  queue: LearnQueue
  answerLog?: AnswerLogEntry[]
  isComplete?: boolean
}

export interface LearnStoreState {
  listId: string
  queue: LearnQueue
  answerLog: AnswerLogEntry[]
  isComplete: boolean
  feedback: FeedbackState | null

  submitAnswer: (answer: string) => boolean
  onCorrectAnswer: (questionId: string, answer: string) => void
  onIncorrectAnswer: (questionId: string, answer: string) => void
  getCurrentQuestion: () => QueueQuestion | undefined
  getProgress: () => { completed: number; total: number; percentage: number }
  dismissFeedback: () => void
  considerRight: () => void
}


const normalizeAnswer = (answer: string) => answer.trim().toLowerCase()

export const createLearnStore = (initData: LearnStoreInitData) => {
  const initialAnswerLog = initData.answerLog ?? []

  return createStore<LearnStoreState>((set, get) => ({
    listId: initData.listId,
    queue: initData.queue,
    answerLog: initialAnswerLog,
    isComplete: initData.isComplete ?? initData.queue.length === 0,
    feedback: null,


    getCurrentQuestion: () => {
      const { queue } = get()
      return queue[0]
    },

    submitAnswer: (answer: string) => {
      const currentQuestion = get().getCurrentQuestion()

      if (!currentQuestion) {
        return false
      }

      const isCorrect = currentQuestion.answer.some(
        (expectedAnswer) => normalizeAnswer(expectedAnswer) === normalizeAnswer(answer),
      )

      set({
        feedback: {
          isVisible: true,
          isCorrect,
          correctAnswer: currentQuestion.answer[0] ?? '',
          userAnswer: answer,
          questionId: currentQuestion.id,
        },
      })

      return isCorrect
    },

    dismissFeedback: () => {
      const { feedback } = get()
      if (!feedback) return

      if (feedback.isCorrect) {
        get().onCorrectAnswer(feedback.questionId, feedback.userAnswer)
      } else {
        get().onIncorrectAnswer(feedback.questionId, feedback.userAnswer)
      }

      set({ feedback: null })
    },

    considerRight: () => {
      const { feedback } = get()
      if (!feedback) return

      get().onCorrectAnswer(feedback.questionId, feedback.userAnswer)
      set({ feedback: null })
    },


    onCorrectAnswer: (questionId: string, answer: string) => {
      set((state) => {
        const currentQuestion = state.queue.find((q) => q.id === questionId)
        const newQueue = state.queue.filter((q) => q.id !== questionId)
        const newAnswerLog: AnswerLogEntry[] = [
          ...state.answerLog,
          {
            question: questionId,
            answer,
            isCorrect: true,
            timestamp: Date.now(),
            questionText: currentQuestion?.question,
            correctAnswer: currentQuestion?.answer[0],
            questionType: currentQuestion?.type,
          },
        ]
        const isComplete = newQueue.length === 0

        return {
          queue: newQueue,
          answerLog: newAnswerLog,
          isComplete,
        }
      })
    },

    onIncorrectAnswer: (questionId: string, answer: string) => {
      set((state) => {
        const questionIndex = state.queue.findIndex((q) => q.id === questionId)
        if (questionIndex === -1) return state

        const newQueue = state.queue.filter((q) => q.id !== questionId)

        const currentQuestion = state.queue[questionIndex]
        const randomIndex = Math.floor(Math.random() * (newQueue.length + 1))
        newQueue.splice(randomIndex, 0, currentQuestion)

        const newAnswerLog: AnswerLogEntry[] = [
          ...state.answerLog,
          {
            question: questionId,
            answer,
            isCorrect: false,
            timestamp: Date.now(),
            questionText: currentQuestion.question,
            correctAnswer: currentQuestion.answer[0],
            questionType: currentQuestion.type,
          },
        ]

        return {
          queue: newQueue,
          answerLog: newAnswerLog,
        }
      })
    },

    getProgress: () => {
      const state = get()
      const completed = state.answerLog.filter((entry) => entry.isCorrect).length
      const total = state.queue.length + completed
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

      return {
        completed,
        total,
        percentage,
      }
    },
  }))
}

type LearnStoreApi = ReturnType<typeof createLearnStore>

const LearnStoreContext = createContext<LearnStoreApi | null>(null)

export function LearnStoreProvider({
  children,
  initialData,
}: {
  children: ReactNode
  initialData: LearnStoreInitData
}) {
  const [store] = useState(() => createLearnStore(initialData))

  return (
    <LearnStoreContext.Provider value={store}>
      {children}
    </LearnStoreContext.Provider>
  )
}

const selectLearnStoreState = (state: LearnStoreState) => state

export function useLearnStore(): LearnStoreState
export function useLearnStore<T>(selector: (state: LearnStoreState) => T): T
export function useLearnStore<T>(selector?: (state: LearnStoreState) => T) {
  const store = useContext(LearnStoreContext)

  if (!store) {
    throw new Error('useLearnStore must be used within LearnStoreProvider')
  }

  const selectedState = selector ?? selectLearnStoreState

  return useStore(store, selectedState as (state: LearnStoreState) => T)
}
