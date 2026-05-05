/* (accessibility) clickable container now has keyboard handlers */
import { auth } from "~/lib/auth/server";
import { redirect, useLoaderData, useNavigate, useRevalidator } from "react-router";
import i18n from "~/i18n";
import { List, Star, ListX } from "lucide-react";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area"
import { prisma } from "~/lib/db";
import { RecentListsSchema, RecentSubjectsSchema, extractRecentItems } from "~/lib/list";
import z from "zod";
import { subjects as subjectsList } from "~/lib/subjects";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "~/server/react";

interface LoaderData {
  recentItems: {
    recent_subjects: z.infer<typeof RecentSubjectsSchema>,
    recent_lists: (z.infer<typeof RecentListsSchema>[number] & {
      name?: string,
      subject?: string,
      authorId?: string,
      authorName?: string,
    })[]
  }
}

export async function loader(loaderArgs: { request: Request }) {
  const headers = new Headers(loaderArgs.request.headers)
  const result = await auth.api.getSession({ headers })
  const user = result?.user
  if (!user) {
    return redirect('/app')
  }

  const rawUser = await prisma.user.findUnique({
    where: { id: user.id },
  })
  const recentItems = extractRecentItems(rawUser?.recentItems);

  const recentListIds = recentItems.recent_lists.map((list) => list.id)
  const lists = recentListIds.length > 0
    ? await prisma.list.findMany({
      where: {
        id: {
          in: recentListIds,
        },
      },
      select: {
        id: true,
        name: true,
        subject: true,
        userId: true,
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
    : []

  const listsById = new Map(lists.map((list) => [list.id, list]))

  const hydratedRecentItems = {
    ...recentItems,
    recent_lists: recentItems.recent_lists.map((list) => {
      const matched = listsById.get(list.id)

      return {
        ...list,
        name: matched?.name,
        subject: matched?.subject,
        authorId: matched?.userId,
        authorName: matched?.user.name,
      }
    }),
  }

  return { recentItems: hydratedRecentItems };
}

export default function HomePage() {
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const trpc = useTRPC()
  const t = i18n.t;
  const removeRecentListMutation = useMutation({
    ...trpc.list.rmListFromRecent.mutationOptions(),
    onSuccess: async () => {
      await revalidator.revalidate()
    },
    onError: () => {
      toast.error(t("errors.unknown"))
    },
  })

  const { recentItems } = useLoaderData<LoaderData>()
  return (
    <div className="flex min-w-0 flex-col p-4">
      <h1 className="font-bold text-3xl">{t("home.quickstart")}</h1>
      <ScrollArea className="mt-4 w-full max-w-full overflow-hidden">
        <div className="flex w-max flex-row gap-x-4">
          <button
            type="button"
            className="flex flex-col gap-y-2 p-2 h-30 w-50 bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 hover:bg-neutral-200 transition-all rounded-xl items-center justify-center cursor-pointer border-none"
            onClick={() => { void navigate("/app/favorites"); }}
          >
            <Star size={48} />
            <h1 className="font-bold">{t("favorites.title")}</h1>
          </button>
          <button
            type="button"
            className="flex flex-col gap-y-2 p-2 h-30 w-50 bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 hover:bg-neutral-200 transition-all rounded-xl items-center justify-center cursor-pointer border-none"
            onClick={() => { void navigate("/app/mylists"); }}
          >
            <List size={48} />
            <h1 className="font-bold">{t("mylists.title")}</h1>
          </button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <h1 className="font-bold text-3xl mt-4">{t("home.recentSubjects")}</h1>
      <ScrollArea className="mt-4 w-full max-w-full overflow-hidden">
        <div className="relative w-full">
          {recentItems.recent_subjects.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center rounded-xl bg-neutral-900/40 px-6 text-center text-sm font-semibold text-white backdrop-blur-[1px]">
              {t("home.noRecentSubjects")}
            </div>
          )}
          <div className="flex w-max flex-row gap-x-4">
            {recentItems.recent_subjects.length === 0 ? (
              Object.entries(subjectsList).map(([subjectName, subject]) => {
                const subjectLabel = t(subject.labelKey);

                return (
                  <div key={subjectName} className="relative flex flex-col gap-y-2 p-2 h-20 w-50 bg-neutral-200 cursor-not-allowed dark:bg-neutral-700 rounded-xl items-center justify-center before:absolute before:inset-0 before:bg-black/30 before:rounded-xl">
                    <img src={subject.icon} alt={subjectLabel} className="h-8 w-8 relative z-10" />
                    <h2 className="font-bold relative z-10">{subjectLabel}</h2>
                  </div>
                );
              })
            ) : (
              recentItems.recent_subjects.map((subjectName) => {
                const subject = subjectsList[subjectName];
                if (subjectName === "other") return null
                const subjectLabel = t(subject.labelKey);
                return (
                  <div key={subjectName} className="relative flex flex-col gap-y-2 p-2 h-24 w-50 bg-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all cursor-pointer dark:bg-neutral-800 rounded-xl items-center justify-center">
                    <img src={subject.icon} alt={subjectLabel} className="h-8 w-8 relative z-10" />
                    <h2 className="font-bold relative z-10">{subjectLabel}</h2>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
        <h1 className="font-bold text-3xl mt-4">{t("home.recentLists")}</h1>

        <div className="mt-4 flex w-full flex-col gap-y-3">
          {recentItems.recent_lists.length === 0 ? (
            <div className="rounded-xl bg-neutral-100 px-5 py-4 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              {t("home.noRecentLists")}
            </div>
          ) : (
            recentItems.recent_lists.map((list) => {
              const hasSubject = typeof list.subject === "string"
                && Object.prototype.hasOwnProperty.call(subjectsList, list.subject)
              const subject = hasSubject
                ? subjectsList[list.subject as keyof typeof subjectsList]
                : null
              const subjectLabel = subject ? t(subject.labelKey) : null
              const authorId = list.authorId

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
                      onClick={(event) => {
                        event.stopPropagation();
                        void navigate(`/app/viewuser/${authorId}`);
                      }}
                      className="justify-self-center font-bold truncate text-sm text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
                    >
                      {list.authorName ?? authorId}
                    </button>
                  ) : (
                    <span className="justify-self-center truncate text-sm text-neutral-600 dark:text-neutral-300">
                      {t("lists.unknownAuthor")}
                    </span>
                  )}

                  <span className="shrink-0 text-sm items-center gap-4 text-neutral-600 dark:text-neutral-300 flex flex-row">
                    {new Date(list.updatedAt).toLocaleDateString("nl-NL")}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeRecentListMutation.mutate({ listId: list.id })
                      }}
                      className="h-10 w-10 bg-neutral-300 dark:bg-neutral-700 hover:dark:bg-neutral-600 text-red-400 rounded-full items-center justify-center flex transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ListX />
                    </button>
                  </span>
                </div>
              )
            })
          )}
        </div>

      </ScrollArea>
    </div>
  );
}
