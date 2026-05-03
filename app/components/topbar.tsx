import { List, Loader2, Plus, MessageCircle } from "lucide-react";
import { useState } from "react";
import { CreatePostDialog } from "~/routes/app/forum/CreatePostDialog";
import { useLocation, useNavigate, useRouteLoaderData } from "react-router";

import { SidebarTrigger } from "~/components/ui/sidebar";
import i18n from "~/i18n";
import { PopoverTrigger, Popover, PopoverContent, PopoverHeader } from "./ui/popover";
import { Button } from "@polarnl/polarui-react";
import { useTRPC } from '~/server/react';
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RootLoaderData } from "~/lib/root-data";

export function TopBar() {
  const rootData = useRouteLoaderData<RootLoaderData>("root")
  const location = useLocation()
  const theme = rootData?.theme ?? "dark"
  const t = i18n.t;
  const userName = rootData?.user.name ?? t("userMenu.guest")
  const rpc = useTRPC()
  const navigate = useNavigate()
  const createList = useMutation({
    ...rpc.list.createList.mutationOptions(),
    onSuccess: async (data) => {
      await navigate(`/app/editlist/${data.id}`)
    },
    onError: () => {
      toast.error(t("lists.create.error"))
    }
  })

  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);

  if (location.pathname.startsWith("/app/editlist/") || location.pathname.startsWith("/app/session/")) {
    return null;
  }

  return (
    <div className="border-b dark:border-neutral-700 border-neutral-300 min-h-16 w-full flex items-center gap-3 px-4 top-0 z-10 bg-neutral-50 dark:bg-neutral-900 ">
      <SidebarTrigger
        className="md:hidden shrink-0"
        scheme={theme}
      />
      {location.pathname === "/app" && (
        <h1 className="text-2xl font-bold">👋 {t("home.welcomeText", { username: userName })}</h1>
      )}
      {location.pathname === "/app/forum" && (
        <h1 className="text-2xl font-bold">{t("navigation.forum")}</h1>
      )}
      {location.pathname.startsWith("/app/viewlist/") && (
        <h1 className="text-2xl font-bold">{t("navigation.list")}</h1>
      )}
      {location.pathname === "/app/favorites" && (
        <h1 className="text-2xl font-bold">{t("favorites.title")}</h1>
      )}
      {location.pathname === "/app/mylists" && (
        <h1 className="text-2xl font-bold">{t("mylists.title")}</h1>
      )}
      {location.pathname.startsWith("/app/forum") && (
        <h1 className="text-2xl font-bold">{t("navigation.forum")}</h1>
      )}
      <div className="grow"></div>
      <Popover>
        <PopoverTrigger>
          <div className="h-10 w-10 flex flex-row items-center justify-center rounded-full bg-neutral-200 cursor-pointer hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-all">
            <Plus />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="center">
          <PopoverHeader>
            <h1 className="font-bold text-xl">
              {t("topbar.new")}
            </h1>
          </PopoverHeader>
          <Button
            variant="transparent"
            onClick={() => {
              createList.mutate({
                name: t("lists.namePlaceholder"),
                subject: "other"
              })
            }}
            scheme={theme}
            disabled={createList.isPending}
          >
            {createList.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <List />
            )}
            <span className="ml-2">{t("lists.create.createList")}</span>
          </Button>
          <Button
            variant="transparent"
            scheme={theme}
            onClick={() => {
              setIsCreatePostDialogOpen(true);
            }}
          >
            <MessageCircle className="size-4" />
            <span className="ml-2">{t("forum.createPost.title")}</span>
          </Button>
          <CreatePostDialog open={isCreatePostDialogOpen} onOpenChange={setIsCreatePostDialogOpen} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
