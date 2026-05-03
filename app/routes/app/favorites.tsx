import { auth } from "~/lib/auth/server";
import { redirect, useLoaderData, useNavigate } from "react-router";
import i18n from "~/i18n";
import { List, ListX } from "lucide-react";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area"
import { prisma } from "~/lib/db";
import { subjects as subjectsList } from "~/lib/subjects";
import type { Route } from "./+types/favorites";

interface LoaderData {
  lists: {
    id: string,
    name: string | null,
    subject: string | null,
    updatedAt: Date,
    user: {
      id: string,
      displayUsername: string | null,
      username: string | null,
      name: string | null,
    } | null,
  }[]
}

export async function loader(loaderArgs: Route.LoaderArgs) {
  const headers = new Headers(loaderArgs.request.headers)
  const result = await auth.api.getSession({ headers })
  const user = result?.user
  if (!user) {
    return redirect('/app')
  }

  const rawUser = await prisma.user.findUnique({
    where: { id: user.id },
  })

  const lists = await prisma.list.findMany({
    where: {
      favoritedBy: {
        some: {
          id: rawUser?.id,
        }
      },
    },
    select: {
      id: true,
      name: true,
      subject: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          displayUsername: true,
          username: true,
          name: true,
        },
      },
    },
  })
  return { lists }
}

export default function FavoritesPage() {
  const navigate = useNavigate()
  const t = i18n.t;

  const { lists } = useLoaderData<LoaderData>()

  return (
    <div className="flex min-w-0 flex-col p-4">
      <ScrollArea className="mt-4 w-full max-w-full overflow-hidden">
        <div className="mt-4 flex w-full flex-col gap-y-3">
          {lists.length === 0 ? (
            <div className="rounded-xl bg-neutral-100 px-5 py-4 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              {t("favorites.empty")}
            </div>
          ) : (
            lists.map((list) => {
              const hasSubject = typeof list.subject === "string"
                && Object.prototype.hasOwnProperty.call(subjectsList, list.subject)
              const subject = hasSubject
                ? subjectsList[list.subject as keyof typeof subjectsList]
                : null
              const subjectLabel = subject ? t(subject.labelKey) : null
              const authorId = list.user?.id

              return (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <div
                  key={list.id}
                  role="button"
                  tabIndex={0}
                  className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl bg-neutral-200 hover:bg-neutral-300 px-4 py-3 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                  onClick={() => { void navigate(`/app/viewlist/${list.id}`); }}
                >
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-x-3 text-left"
                  >
                    {subject ? (
                      <img src={subject.icon} alt={subjectLabel ?? ""} className="h-6 w-6 shrink-0" />
                    ) : (
                      <List size={20} className="shrink-0" />
                    )}
                    <span className="truncate text-base font-semibold">
                      {list.name ?? t("lists.namePlaceholder")}
                    </span>
                  </button>

                  {authorId ? (
                    <button
                      type="button"
                      onClick={() => { void navigate(`/app/viewuser/${authorId}`); }}
                      className="justify-self-center font-bold truncate text-sm text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
                    >
                      {list.user?.name ?? list.user?.displayUsername ?? list.user?.username ?? authorId}
                    </button>
                  ) : (
                    <span className="justify-self-center truncate text-sm text-neutral-600 dark:text-neutral-300">
                      {t("lists.unknownAuthor")}
                    </span>
                  )}

                  <span className="shrink-0 text-sm items-center gap-4 text-neutral-600 dark:text-neutral-300 flex flex-row">
                    {new Date(list.updatedAt).toLocaleDateString("nl-NL")}
                    <div className="h-10 w-10 bg-neutral-300 dark:bg-neutral-700 hover:dark:bg-neutral-600 text-red-400 rounded-full items-center justify-center flex transition-all">
                      <ListX />
                    </div>
                  </span>
                </div>
              )
            })
          )}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}
