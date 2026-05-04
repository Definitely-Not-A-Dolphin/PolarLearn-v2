import { useTRPC } from "~/server/react";
import { createCallerFactory, createTRPCContext } from "~/server/trpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

import type { Route } from "./+types/layout";
import { appRouter } from "~/server/main";
import { Outlet, useLoaderData, useLocation, useNavigate, useRouteLoaderData, useRevalidator } from "react-router";
import { Button, Tabs } from "@polarnl/polarui-react";
import { Subject } from "~/lib/subjects";
import i18n from "~/i18n";
import { prisma } from "~/lib/db";
import { Loader2, Pencil, BookOpen, Trash, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import type { LoaderData, ListData } from "~/lib/viewlist";
import type { RootLoaderData } from "~/lib/root-data";

export async function loader({ params, request }: Route.LoaderArgs): Promise<LoaderData> {
  const id = params.id as string | undefined;
  if (!id) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response("", { status: 400 });
  }
  const headers = new Headers(request.headers);
  const context = await createTRPCContext({ headers });

  if (!context.user) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response("", { status: 401 });
  }
  const userId = context.user.id;
  const caller = createCallerFactory(appRouter)(context);
  try {
    const list: ListData = await caller.list.getLatestListData({ listId: id });
    const canEdit = list.userId === userId || list.collaborators.some((collaborator) => collaborator.id === userId);

    const collaborators = []
    for (const collaborator of list.collaborators) {
      const collaboratorId = typeof collaborator === 'string' ? collaborator : collaborator.id
      const user = await prisma.user.findUnique({
        where: {
          id: collaboratorId
        }
      });
      if (user) {
        collaborators.push({ name: user.name || "?", id: user.id });
      }
    }

    return {
      list,
      collaborators,
      canEdit,
      canDelete: list.userId === userId,
      user_liked: list.favoritedBy.some((fav) => fav.id === userId)
    };
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response(error as string, { status: 500 });
  }
}

export default function Layout() {
  const data = useLoaderData<LoaderData>();
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const subjects = new Subject();
  const icon = subjects.getIcon(data.list.subject, { width: 50, height: 50 })
  const t = i18n.t
  const location = useLocation();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const theme = rootData?.theme ?? "dark";
  const rpc = useTRPC();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const generateSessionMutation = useMutation({
    ...rpc.learning.generateLearnSession.mutationOptions(),
    onSuccess: (data: { id: string }) => {
      void navigate(`/app/session/${data.id}`)
    },
    onError: () => {
      toast.error(t("errors.unknown"))
    }
  })
  const deleteListMutation = useMutation({
    ...rpc.list.deleteList.mutationOptions({
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        toast.success(t("lists.delete.success"));
        void navigate("/app");
      },
      onError: () => {
        toast.error(t("errors.unknown"));
      },
    }),
  })
  const likeListMutation = useMutation({
    ...rpc.list.starList.mutationOptions({
      onSuccess: () => {
        void revalidator.revalidate();
      },
      onError: () => {
        toast.error(t("errors.unknown"));
      },
    }),
  })
  return (
    <div className="p-4">
      <div className="flex flex-row items-center gap-3">
        {icon}
        <h1 className="text-4xl font-bold">{data.list.name}</h1>
      </div>
      {/* <p>{data.list.description}</p> implement later */}
      <p className="mt-4">
        {t("lists.madeBy")}
        {data.collaborators.map((collaborator, index) => (
          <span key={collaborator.id}>
            {index > 0 && ", "}
            <button
              type="button"
              onClick={() => { void navigate(`/app/viewuser/${collaborator.id}`); }}
              className="font-bold text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
            >
              {collaborator.name}
            </button>
          </span>
        ))}
      </p>

      <div className="mt-4">
        <Tabs
          scheme={theme}
          tabs={[t("lists.words") || "Words", t("lists.stats") || "Stats"]}
          activeIndex={(() => {
            const p = location.pathname.replace(/\/+$/, "");
            if (p.includes(`/app/viewlist/${data.list.id}/stats`)) return 1;
            return 0;
          })()}
          onActiveIndexChange={(idx: number) => {
            if (idx === 0) {
              void navigate(`/app/viewlist/${data.list.id}/words`);
            } else if (idx === 1) {
              void navigate(`/app/viewlist/${data.list.id}/stats`);
            }
          }}
        />
      </div>
      <div className="py-4 flex flex-row gap-4">
        <Button
          scheme={theme}
          color="sky"
          textColor="white"
          icon={generateSessionMutation.isPending ? <Loader2 className="animate-spin" /> : <BookOpen />}
          onClick={() => {
            generateSessionMutation.mutate({ listId: data.list.id })
          }}
          disabled={generateSessionMutation.isPending}
        >
          {t("home.learn")}
        </Button>
        {data.canEdit && (
          <Button
            scheme={theme}
            variant="transparent"
            icon={<Pencil />}
            onClick={() => {
              void navigate(`/app/editlist/${data.list.id}`);
            }}
            className="hover:bg-neutral-200/70 dark:hover:bg-white/10"
          >
            {t("lists.edit.title")}
          </Button>
        )}
        <Button
          scheme={theme}
          variant="transparent"
          icon={likeListMutation.isPending
            ? <Loader2 className="animate-spin" />
            : <Star className={data.user_liked ? "text-amber-300" : ""} />}
          onClick={() => {
            likeListMutation.mutate({ id: data.list.id });
          }}
          disabled={likeListMutation.isPending}
          className="hover:bg-neutral-200/70 dark:hover:bg-white/10"
        >
          {data.user_liked ? t("lists.favourites.unlike") : t("lists.favourites.like")}
        </Button>
        {data.canDelete && (
          <>
            <Button
              scheme={theme}
              variant="transparent"
              icon={deleteListMutation.isPending ? <Loader2 className="animate-spin" /> : <Trash />}
              onClick={() => {
                setIsDeleteDialogOpen(true);
              }}
              disabled={deleteListMutation.isPending}
              className="text-red-600 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15"
            >
              {t("lists.delete.title")}
            </Button>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-bold text-2xl">{t("lists.delete.title")}</DialogTitle>
                  <DialogDescription>
                    {t("lists.delete.description")}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="transparent"
                    scheme={theme}
                    onClick={() => {
                      setIsDeleteDialogOpen(false);
                    }}
                    disabled={deleteListMutation.isPending}
                  >
                    {t("lists.delete.cancel") || "Cancel"}
                  </Button>
                  <Button
                    scheme={theme}
                    onClick={() => {
                      deleteListMutation.mutate({ id: data.list.id });
                    }}
                    disabled={deleteListMutation.isPending}
                    className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                    icon={deleteListMutation.isPending ? <Loader2 className="animate-spin" /> : <Trash />}
                  >
                    {t("lists.delete.title") || "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      <hr className="mb-4" />
      <Outlet />
    </div>
  )
}
