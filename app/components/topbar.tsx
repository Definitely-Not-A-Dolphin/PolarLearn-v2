import { List, Loader, Plus } from "lucide-react";
import { useLocation, useNavigate, useRouteLoaderData } from "react-router";

import { SidebarTrigger } from "~/components/ui/sidebar";
import i18n from "~/i18n";
import { PopoverTrigger, Popover, PopoverContent, PopoverHeader } from "./ui/popover";
import { Button } from "@polarnl/polarui-react";
import { useTRPC } from '~/server/react';
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function TopBar() {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-non-null-assertion
  const rootData = useRouteLoaderData("root")! as {
    theme: string
    user: { name: string; image: string; email: string; role: string }
  }
  const location = useLocation()
  const theme = rootData.theme || "dark"
  const t = i18n.t;
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

  if (location.pathname.startsWith("/app/editlist/") || location.pathname.startsWith("/app/learn/")) {
    return null;
  }

  return (
    <div className="border-b dark:border-neutral-700 border-neutral-300 min-h-16 w-full flex items-center gap-3 px-4 top-0 z-10 bg-neutral-50 dark:bg-neutral-900 ">
      <SidebarTrigger
        className="md:hidden shrink-0"
        scheme={theme as "dark" | "light"}
      />
      {location.pathname === "/app" && (
        <h1 className="text-2xl font-bold">👋 {t("home.welcomeText", { username: rootData.user.name })}</h1>
      )}
      {location.pathname === "/app/forum" && (
        <h1 className="text-2xl font-bold">{t("navigation.forum")}</h1>
      )}
      {location.pathname.startsWith("/app/viewlist/") && (
        <h1 className="text-2xl font-bold">{t("navigation.list")}</h1>
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
              Nieuw
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
            scheme={theme as "light" | "dark"}
            disabled={createList.isPending}
          >
            {createList.isPending ? (
              <Loader className="animate-spin" />
            ) : (
              <List />
            )}
            <span className="ml-2">Lijst aanmaken</span>
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}