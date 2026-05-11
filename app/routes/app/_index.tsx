import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import i18n from "~/i18n";
import { Clock3, List, ListX, Play, Star } from "lucide-react";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { Progress } from "~/components/ui/progress";
import {
  RecentListsSchema,
  RecentSubjectsSchema,
  extractRecentItems,
} from "~/lib/list";
import z from "zod";
import { subjects as subjectsList } from "~/lib/subjects";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "~/server/react";
import { createCallerFactory, createTRPCContext } from "~/server/trpc";
import type { Route } from "./+types/_index";
import { appRouter } from "~/server/main";
import { prisma } from "~/lib/db";

interface LoaderData {
  recentItems: {
    recent_subjects: z.infer<typeof RecentSubjectsSchema>;
    recent_lists: (z.infer<typeof RecentListsSchema>[number] & {
      name?: string;
      subject?: string;
      authorId?: string;
      authorName?: string;
    })[];
  };
  recentSessions: {
    id: string;
    listId: string;
    updatedAt: string;
    list: {
      id: string;
      name: string;
      subject: string;
    };
    progress: {
      completed: number;
      total: number;
      percentage: number;
    };
  }[];
}

export async function loader(loaderArgs: Route.LoaderArgs) {
  const headers = new Headers(loaderArgs.request.headers);
  const context = await createTRPCContext({ headers });
  if (!context.user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const caller = createCallerFactory(appRouter)(context);
  const recentLists = await caller.list.getRecentLists();
  const recentSubjects = await caller.list.getRecentSubjects();
  const recentSessions = await prisma.learnSession.findMany({
    where: {
      userId: context.user.id,
      isComplete: false,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 5,
    select: {
      id: true,
      listId: true,
      updatedAt: true,
      queue: true,
      answerLog: true,
      list: {
        select: {
          id: true,
          name: true,
          subject: true,
        },
      },
    },
  });

  return {
    recentItems: {
      recent_lists: recentLists,
      recent_subjects: recentSubjects,
    },
    recentSessions: recentSessions.map((session) => {
      const answerLog = session.answerLog as Array<{ isCorrect?: boolean }>;
      const completed = answerLog.reduce<number>((count, entry) => {
        if (
          entry &&
          typeof entry === "object" &&
          "isCorrect" in entry &&
          (entry as { isCorrect?: boolean }).isCorrect
        ) {
          return count + 1;
        }

        return count;
      }, 0);
      const total = session.queue.length + completed;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: session.id,
        listId: session.listId,
        updatedAt: session.updatedAt.toISOString(),
        list: session.list,
        progress: {
          completed,
          total,
          percentage,
        },
      };
    }),
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const trpc = useTRPC();
  const t = i18n.t;
  const removeRecentListMutation = useMutation({
    ...trpc.list.rmListFromRecent.mutationOptions(),
    onSuccess: async () => {
      await revalidator.revalidate();
    },
    onError: () => {
      toast.error(t("errors.unknown"));
    },
  });

  const { recentItems, recentSessions } = useLoaderData<LoaderData>();
  return (
    <div className="flex min-w-0 flex-col p-4">
      <h1 className="font-bold text-3xl">{t("home.quickstart")}</h1>
      <ScrollArea className="mt-4 w-full max-w-full overflow-hidden">
        <div className="flex w-max flex-row gap-x-4">
          <button
            type="button"
            className="flex flex-col gap-y-2 p-2 h-30 w-50 bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 hover:bg-neutral-200 transition-all rounded-xl items-center justify-center cursor-pointer border-none"
            onClick={() => {
              void navigate("/app/favorites");
            }}
          >
            <Star size={48} />
            <h1 className="font-bold">{t("favorites.title")}</h1>
          </button>
          <button
            type="button"
            className="flex flex-col gap-y-2 p-2 h-30 w-50 bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 hover:bg-neutral-200 transition-all rounded-xl items-center justify-center cursor-pointer border-none"
            onClick={() => {
              void navigate("/app/mylists");
            }}
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
            {recentItems.recent_subjects.length === 0
              ? Object.entries(subjectsList).map(([subjectName, subject]) => {
                  const subjectLabel = t(subject.labelKey);

                  return (
                    <div
                      key={subjectName}
                      className="relative flex flex-col gap-y-2 p-2 h-20 w-50 bg-neutral-200 cursor-not-allowed dark:bg-neutral-700 rounded-xl items-center justify-center before:absolute before:inset-0 before:bg-black/30 before:rounded-xl"
                    >
                      <img
                        src={subject.icon}
                        alt={subjectLabel}
                        className="h-8 w-8 relative z-10"
                      />
                      <h2 className="font-bold relative z-10">
                        {subjectLabel}
                      </h2>
                    </div>
                  );
                })
              : recentItems.recent_subjects.map((subjectName) => {
                  const subject = subjectsList[subjectName];
                  if (subjectName === "other") return null;
                  const subjectLabel = t(subject.labelKey);
                  return (
                    <div
                      key={subjectName}
                      className="relative flex flex-col gap-y-2 p-2 h-24 w-50 bg-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all cursor-pointer dark:bg-neutral-800 rounded-xl items-center justify-center"
                    >
                      <img
                        src={subject.icon}
                        alt={subjectLabel}
                        className="h-8 w-8 relative z-10"
                      />
                      <h2 className="font-bold relative z-10">
                        {subjectLabel}
                      </h2>
                    </div>
                  );
                })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <h1 className="font-bold text-3xl mt-4">{t("home.recentLists")}</h1>

      <div className="mt-4 flex w-full flex-col gap-y-3">
        {recentItems.recent_lists.length === 0 ? (
          <EmptyRecentBlock>{t("home.noRecentLists")}</EmptyRecentBlock>
        ) : (
          recentItems.recent_lists.map((list: any) => {
            const hasSubject =
              typeof list.subject === "string" &&
              Object.prototype.hasOwnProperty.call(subjectsList, list.subject);
            const subject = hasSubject
              ? subjectsList[list.subject as keyof typeof subjectsList]
              : null;
            const subjectLabel = subject ? t(subject.labelKey) : null;

            return (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <div
                key={list.id}
                role="button"
                tabIndex={0}
                className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl bg-neutral-200 hover:bg-neutral-300 px-4 py-3 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                onClick={() => {
                  void navigate(`/app/viewlist/${list.id}`);
                }}
              >
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-x-3 text-left"
                >
                  {subject ? (
                    <img
                      src={subject.icon}
                      alt={subjectLabel ?? ""}
                      className="h-6 w-6 shrink-0"
                    />
                  ) : (
                    <List size={20} className="shrink-0" />
                  )}
                  <span className="truncate text-base font-semibold">
                    {list.name ?? t("lists.namePlaceholder")}
                  </span>
                </button>
                {list.user?.id ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void navigate(`/app/viewuser/${list.user.id}`);
                    }}
                    className="justify-self-center font-bold truncate text-sm text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
                  >
                    {list.user?.name ?? list.user?.id}
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
                      removeRecentListMutation.mutate({ listId: list.id });
                    }}
                    className="h-10 w-10 bg-neutral-300 dark:bg-neutral-700 hover:dark:bg-neutral-600 text-red-400 rounded-full items-center justify-center flex transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ListX />
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>

      <h1 className="mt-4 text-3xl font-bold">{t("home.recentSessions")}</h1>
      <div className="mt-4 flex w-full flex-col gap-y-3">
        {recentSessions.length === 0 ? (
          <EmptyRecentBlock>{t("home.noRecentSessions")}</EmptyRecentBlock>
        ) : (
          recentSessions.map((session) => {
            const subject =
              subjectsList[session.list.subject as keyof typeof subjectsList];
            const subjectLabel = subject ? t(subject.labelKey) : null;

            return (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                className="grid w-full grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] items-center gap-x-4 rounded-xl bg-neutral-200 px-4 py-3 transition-all hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 cursor-pointer"
                onClick={() => {
                  void navigate(`/app/session/${session.id}`);
                }}
              >
                <div className="flex min-w-0 items-center gap-x-3">
                  {subject ? (
                    <img
                      src={subject.icon}
                      alt={subjectLabel ?? ""}
                      className="h-6 w-6 shrink-0"
                    />
                  ) : (
                    <Clock3 size={20} className="shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="block truncate text-base font-semibold">
                      {session.list.name ?? t("lists.namePlaceholder")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-x-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center justify-between gap-x-3 text-sm text-neutral-600 dark:text-neutral-300">
                      <span>
                        {t("learn.session.progress", {
                          completed: session.progress.completed,
                          total: session.progress.total,
                        })}
                      </span>
                      <span>
                        {t("learn.session.percentage", {
                          percentage: session.progress.percentage,
                        })}
                      </span>
                    </div>
                    <Progress
                      value={session.progress.percentage}
                      className="h-2"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={t("home.resumeSession")}
                    title={t("home.resumeSession")}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-neutral-700 transition-all hover:bg-neutral-400 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600"
                    onClick={(event) => {
                      event.stopPropagation();
                      void navigate(`/app/session/${session.id}`);
                    }}
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function EmptyRecentBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-neutral-100 px-5 py-4 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
      {children}
    </div>
  );
}
