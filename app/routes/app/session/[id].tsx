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

import type { Route } from "./+types/[id]";
import { redirect } from "react-router";
import { createCallerFactory, createTRPCContext } from "~/server/trpc";
import { appRouter } from "~/server/main";
import { useLoaderData, useNavigate, useRouteLoaderData } from "react-router";
import { LearnStoreProvider, useLearnStore } from "./store";
import { Input, Button } from "@polarnl/polarui-react";
import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";

import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/server/react";
import { toast } from "sonner";
import { generateHint } from "~/lib/learn";
import { BookOpenCheck, MoveLeft, X, Check, XCircle } from "lucide-react";
import { Progress } from "~/components/ui/progress";
import i18n from "~/i18n";

export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id

  if (!id) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response("Missing session id", { status: 400 })
  }

  const headers = new Headers(request.headers)
  const context = await createTRPCContext({ headers, request })

  if (!context.user) {
    const url = new URL(request.url)
    return redirect(`/auth/sign-in?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`)
  }

  const caller = createCallerFactory(appRouter)(context)
  const session = await caller.learning.getLearnSession({ sessionId: id })

  return { session }
}

export default function LearnPage() {
  const { session } = useLoaderData<typeof loader>()
  const rootData = useRouteLoaderData("root")
  const theme = rootData?.theme === "dark" ? "dark" : "light"

  return (
    <LearnStoreProvider
      initialData={{
        listId: session.listId,
        queue: session.queue,
        answerLog: session.answerLog,
        isComplete: session.isComplete,
      }}
    >
      <TopBar theme={theme} />
      <div className={`flex min-h-dvh w-full items-center justify-center p-4 sm:p-6 ${theme === "dark" ? "bg-neutral-900" : "bg-neutral-50"}`}>
        <LearnTool sessionId={session.id} theme={theme} />
      </div>
    </LearnStoreProvider>
  )
}

function TopBar({ theme }: { theme: "light" | "dark" }) {
  const navigate = useNavigate()
  const store = useLearnStore()
  const { answerLog, getProgress } = store
  const progress = getProgress()

  const correctCount = answerLog.filter((entry) => entry.isCorrect).length
  const incorrectCount = answerLog.filter((entry) => !entry.isCorrect).length

  return (
    <div className={`sticky top-0 flex h-16 w-full items-center gap-4 px-4 ${theme === "dark" ? "border-b border-neutral-700 bg-neutral-800" : "border-b border-neutral-200 bg-neutral-100"}`}>
      <button
        type="button"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${theme === "dark" ? "bg-neutral-700 text-white hover:bg-neutral-600" : "bg-neutral-200 text-neutral-900 hover:bg-neutral-300"}`}
        onClick={() => {
          void navigate(`/app/viewlist/${store.listId}`)
        }}
      >
        <X />
      </button>
      <div className="flex-1">
        <Progress value={progress.percentage} className="h-2" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${theme === "dark" ? "bg-green-900/50" : "bg-green-100"}`}>
          <Check className={`h-4 w-4 ${theme === "dark" ? "text-green-400" : "text-green-700"}`} />
          <span className={`text-sm font-medium ${theme === "dark" ? "text-green-400" : "text-green-700"}`}>{correctCount}</span>
        </div>
        <div className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${theme === "dark" ? "bg-red-900/50" : "bg-red-100"}`}>
          <XCircle className={`h-4 w-4 ${theme === "dark" ? "text-red-400" : "text-red-700"}`} />
          <span className={`text-sm font-medium ${theme === "dark" ? "text-red-400" : "text-red-700"}`}>{incorrectCount}</span>
        </div>
      </div>
    </div>
  )
}

function LearnTool({ sessionId, theme }: { sessionId: string; theme: "light" | "dark" }) {
  const t = i18n.t
  const rpc = useTRPC()
  const updateSessionMutation = useMutation({
    ...rpc.learning.updateSession.mutationOptions(),
    onError: () => {
      toast.error(t("learn.session.failedToSave"))
      void navigate('/app')
    },
  })
  const { queue, answerLog, isComplete, getCurrentQuestion, submitAnswer, feedback, dismissFeedback, considerRight, listId } = useLearnStore()


  const currentQuestion = getCurrentQuestion()
  const inputRef = useRef<HTMLInputElement>(null)
  const hasMountedRef = useRef(false)
  const lastSavedCountRef = useRef(0)
  const navigate = useNavigate()

  const scoreOption = (seed: string, value: string) => {
    let hash = 0

    for (let i = 0; i < seed.length + value.length; i += 1) {
      const charCode = (seed.charCodeAt(i % seed.length) || 0) ^ (value.charCodeAt(i % value.length) || 0)
      hash = (hash * 31 + charCode) >>> 0
    }

    return hash
  }
  const multipleChoiceOptions = useMemo(() => {
    if (currentQuestion?.type !== "multiplechoice") {
      return []
    }

    const correctAnswer = currentQuestion.answer[0]
    const options = [correctAnswer, ...(currentQuestion.decoys ?? [])]

    return [...options].sort((left, right) => {
      return scoreOption(currentQuestion.id, left) - scoreOption(currentQuestion.id, right)
    })
  }, [currentQuestion])
  const hintText = useMemo(() => {
    if (currentQuestion?.type !== "hint") {
      return ""
    }

    return generateHint(currentQuestion.answer[0] ?? "")
  }, [currentQuestion])

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    if (answerLog.length === lastSavedCountRef.current) return

    lastSavedCountRef.current = answerLog.length
    updateSessionMutation.mutate({
      sessionId,
      answerLog,
      queue,
      isComplete,
    })
  }, [answerLog, isComplete, queue, sessionId, updateSessionMutation])

  return (
    <>
      {!isComplete && currentQuestion && (
        <div className={`relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl shadow-xl sm:max-h-[calc(100dvh-3rem)] ${theme === "dark" ? "bg-neutral-800" : "border border-neutral-200 bg-white"}`}>

          <div className="flex shrink-0 items-center justify-center px-6 py-4 text-center sm:px-8 sm:py-10">
            <h1 className={`text-balance text-2xl font-bold leading-tight sm:text-3xl ${theme === "dark" ? "text-white" : "text-neutral-900"}`}>
              {currentQuestion.question}
            </h1>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-6 pb-8 sm:px-8 sm:pb-10">
            {currentQuestion.type === "test" && (
              <>
                <Input
                  ref={inputRef}
                  scheme={theme}
                  key={currentQuestion.id}
                  placeholder={t("learn.session.answerPlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const answer = e.currentTarget.value
                      if (!answer.trim()) return

                      submitAnswer(answer)
                      e.currentTarget.value = ""
                    }
                  }}
                />
                <Button
                  scheme={theme}
                  onClick={() => {
                    const answer = inputRef.current?.value ?? ""
                    if (!answer.trim()) return
                    submitAnswer(answer)
                    if (inputRef.current) {
                      inputRef.current.value = ""
                    }
                  }}
                >
                  {t("learn.session.submit")}
                </Button>
              </>
            )}
            {currentQuestion.type === "multiplechoice" && (
              <div className="flex w-full flex-col gap-2">
                {multipleChoiceOptions.map((option) => (
                  <Button
                    key={option}
                    scheme={theme}
                    variant="transparent"
                    onClick={() => {
                      submitAnswer(option)
                    }}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}
            {currentQuestion.type === "hint" && (
              <div className="flex w-full flex-col items-center gap-4">
                <p className={`text-balance text-center text-lg font-medium ${theme === "dark" ? "text-neutral-100" : "text-neutral-700"}`}>
                  {hintText}
                </p>
                <Input
                  ref={inputRef}
                  scheme={theme}
                  key={currentQuestion.id}
                  placeholder={t("learn.session.answerPlaceholder")}

                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const answer = e.currentTarget.value
                      if (!answer.trim()) return

                      submitAnswer(answer)
                      e.currentTarget.value = ""
                    }
                  }}
                />
                <Button
                  scheme={theme}
                  onClick={() => {
                    const answer = inputRef.current?.value ?? ""
                    if (!answer.trim()) return
                    submitAnswer(answer)
                    if (inputRef.current) {
                      inputRef.current.value = ""
                    }
                  }}
                >
                  {t("learn.session.submit")}
                </Button>

              </div>
            )}
          </div>
          {feedback?.isVisible && (
            <FeedbackOverlay
              isCorrect={feedback.isCorrect}
              correctAnswer={feedback.correctAnswer}
              onDismiss={dismissFeedback}
              onConsiderRight={considerRight}
              theme={theme}
            />
          )}
        </div>
      )}

      {isComplete && (
        <div className={`flex h-70 max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col items-center justify-center overflow-hidden rounded-xl shadow-xl ${theme === "dark" ? "bg-neutral-800" : "border border-neutral-200 bg-white"}`}>
          <p className={`text-center font-bold ${theme === "dark" ? "text-white" : "text-neutral-900"}`}>
            {t("learn.session.complete")}
          </p>

          <div className="flex flex-row items-center justify-center w-full mt-4 gap-x-4">
            <Button
              scheme={theme}
              color={theme === "light" ? "light" : "dark"}
              onClick={() => {
                void navigate(`/app/viewlist/${listId}`)
              }}
              icon={<MoveLeft />}
            >

              {t("learn.session.backToList")}
            </Button>
            <Button
              scheme={theme}
              color={theme === "light" ? "light" : "dark"}
              icon={<BookOpenCheck />}
              onClick={() => {
                void navigate(`/app/viewlist/${listId}/stats/${sessionId}`)
              }}
            >
              {t("learn.session.viewResults")}
            </Button>

          </div>
        </div>
      )}
    </>
  )
}

function FeedbackOverlay({
  isCorrect,
  correctAnswer,
  onDismiss,
  onConsiderRight,
  theme,
}: {
  isCorrect: boolean
  correctAnswer: string
  onDismiss: () => void
  onConsiderRight: () => void
  theme: "light" | "dark"
}) {
  const t = i18n.t
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDismissRef = useRef(onDismiss)
  const onConsiderRightRef = useRef(onConsiderRight)

  useEffect(() => {
    onDismissRef.current = onDismiss
    onConsiderRightRef.current = onConsiderRight
  }, [onConsiderRight, onDismiss])

  useEffect(() => {
    const overlay = overlayRef.current
    const content = contentRef.current
    const progress = progressRef.current

    if (!overlay || !content || !progress) return

    const tl = gsap.timeline()

    tl.fromTo(
      overlay,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: "power2.out" }
    )
    tl.fromTo(
      content.children,
      { opacity: 0, scale: 0.8, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "back.out(1.7)" },
      "-=0.1"
    )
    tl.fromTo(
      progress,
      { scaleX: 1 },
      { scaleX: 0, duration: 1.5, ease: "linear" },
      "-=0.3"
    )

    timerRef.current = setTimeout(() => {
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          onDismissRef.current()
        },
      })
    }, 1800)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      tl.kill()
    }
  }, [])

  const handleConsiderRight = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        onConsiderRightRef.current()
      },
    })
  }

  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl ${isCorrect
        ? theme === "light" ? "bg-green-600/90" : "bg-green-500/80"
        : theme === "light" ? "bg-red-600/90" : "bg-red-500/80"
        }`}
      style={{ opacity: 0 }}
    >

      <div ref={contentRef} className="flex flex-col items-center gap-3 px-6 text-center">
        {isCorrect ? (
          <Check className="h-16 w-16 text-white" strokeWidth={3} />
        ) : (
          <X className="h-16 w-16 text-white" strokeWidth={3} />
        )}
        <span className="text-3xl font-bold text-white">
          {isCorrect ? t("learn.session.correct") : t("learn.session.wrong")}
        </span>
        {!isCorrect && (
          <>
            <span className="text-lg text-white/90">
              {t("learn.session.answerWas", { answer: correctAnswer })}
            </span>
            <button
              onClick={handleConsiderRight}
              className="mt-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
            >
              {t("learn.session.considerRight")}
            </button>
          </>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/30">
        <div
          ref={progressRef}
          className="h-full bg-white origin-left"
          style={{ transform: "scaleX(1)" }}
        />
      </div>
    </div>
  )
}
