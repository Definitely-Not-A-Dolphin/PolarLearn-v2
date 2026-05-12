import { redirect, useLoaderData, useNavigate } from "react-router"
import { createTRPCContext } from "~/server/trpc"
import { prisma } from "~/lib/db"
import { buildSessionSummary, sessionSummaryLoaderSchema, type SessionSummaryLoaderData, type SessionSummarySource } from "~/lib/stats"
import i18n from "~/i18n"
import type { Route } from "./+types/stats"

export async function loader({ params, request }: Route.LoaderArgs): Promise<SessionSummaryLoaderData> {
  const listId = params.id

  if (!listId) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response("Missing list id", { status: 400 })
  }

  const headers = new Headers(request.headers)
  const context = await createTRPCContext({ headers })

  if (!context.user) {
    const url = new URL(request.url)
    return redirect(`/auth/sign-in?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`)
  }

  const sessions = (await prisma.learnSession.findMany({
    where: {
      listId,
      userId: context.user.id,
      isComplete: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      answerLog: true,
    },
  })) as SessionSummarySource[]

  return sessionSummaryLoaderSchema.parse({
    listId,
    sessions: sessions.map((session) => buildSessionSummary(session)),
  })
}

export default function StatsPage() {
  const t = i18n.t
  const navigate = useNavigate()
  const { listId, sessions } = useLoaderData<typeof loader>()

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-300">
        {t("learn.stats.noFinishedSessions")}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => {
            void navigate(`/app/viewlist/${listId}/stats/${session.id}`)
          }}
          className="w-full rounded-2xl border border-neutral-200 bg-white p-5 text-left transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/80 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/90"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {t("learn.stats.sessionTitle", { id: session.id.slice(0, 8) })}
              </h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {t("learn.stats.finishedAt", {
                  date: new Date(session.updatedAt).toLocaleString("nl-NL"),
                })}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{t("learn.stats.grade")}</div>
              <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{session.grade.toFixed(1)}</div>
            </div>
            <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{t("learn.stats.score")}</div>
              <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{`${String(session.scorePercentage)}%`}</div>
            </div>
            <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{t("learn.stats.correct")}</div>
              <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{String(session.correct)}</div>
            </div>
            <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{t("learn.stats.incorrect")}</div>
              <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{String(session.incorrect)}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
