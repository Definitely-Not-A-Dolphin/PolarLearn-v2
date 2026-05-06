import { List, Loader2, Plus, MessageCircle, Users, UserPlus } from "lucide-react";
import { useState } from "react";
import { CreatePostDialog } from "~/routes/app/forum/CreatePostDialog";
import { useLocation, useNavigate, useRouteLoaderData } from "react-router";

import { SidebarTrigger } from "~/components/ui/sidebar";
import i18n from "~/i18n";
import { PopoverTrigger, Popover, PopoverContent, PopoverHeader } from "./ui/popover";
import { Button, CheckWithLabel, Input } from "@polarnl/polarui-react";
import { useTRPC } from '~/server/react';
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RootLoaderData } from "~/lib/root-data";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

export function TopBar() {
  const rootData = useRouteLoaderData<RootLoaderData>("root")
  const location = useLocation()
  const theme = rootData?.theme ?? "dark"
  const t = i18n.t;
  const userName = rootData?.user.name ?? t("userMenu.guest")
  const rpc = useTRPC()
  const navigate = useNavigate()
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [requiresModeratorApproval, setRequiresModeratorApproval] = useState(false)
  const [onlyModsCanAddLists, setOnlyModsCanAddLists] = useState(false)

  const createList = useMutation({
    ...rpc.list.createList.mutationOptions(),
    onSuccess: async (data) => {
      await navigate(`/app/editlist/${data.id}`)
    },
    onError: () => {
      toast.error(t("lists.create.error"))
    }
  })
  const createGroup = useMutation({
    ...rpc.groups.createGroup.mutationOptions(),
    onSuccess: async (data) => {
      setIsCreateGroupDialogOpen(false)
      setGroupName("")
      setGroupDescription("")
      setRequiresModeratorApproval(false)
      setOnlyModsCanAddLists(false)
      toast.success(t("groups.create.success"))
      navigate(`/app/group/${data.id}`)
    },
    onError: () => {
      toast.error(t("errors.unknown"))
    }
  })

  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);

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
      {location.pathname.startsWith("/app/viewuser/") && (
        <h1 className="text-2xl font-bold">{t("navigation.userProfile")}</h1>
      )}
      {location.pathname === "/app/groups" && (
        <h1 className="text-2xl font-bold">{t("navigation.groups")}</h1>
      )}
      {location.pathname.startsWith("/app/group/") && (
        <h1 className="text-2xl font-bold">{t("navigation.group")}</h1>
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
            icon={createList.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <List />
            )}
            disabled={createList.isPending}
          >
            <span className="ml-2">{t("lists.create.createList")}</span>
          </Button>
          <Button
            variant="transparent"
            scheme={theme}
            onClick={() => {
              setIsCreatePostDialogOpen(true);
            }}
            icon={<MessageCircle />}
          >
            <span className="ml-2">{t("forum.createPost.title")}</span>
          </Button>
          <CreatePostDialog open={isCreatePostDialogOpen} onOpenChange={setIsCreatePostDialogOpen} />
          <Button
            scheme={theme}
            variant="transparent"
            icon={<Users />}
            onClick={() => {
              setIsCreateGroupDialogOpen(true);
            }}
          >
            {t("groups.create.title")}
          </Button>
          <Dialog
            open={isCreateGroupDialogOpen}
            onOpenChange={(open) => {
              setIsCreateGroupDialogOpen(open);
              if (!open) {
                setGroupName("")
                setGroupDescription("")
                setRequiresModeratorApproval(false)
                setOnlyModsCanAddLists(false)
              }
            }}
          >
            <DialogContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  createGroup.mutate({
                    name: groupName.trim(),
                    description: groupDescription.trim() || undefined,
                    approvalRequired: requiresModeratorApproval,
                    onlyModsCanAddLists,
                  });
                }}
                className="space-y-4"
              >
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">{t("groups.create.title")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <label>{t("groups.create.nameLabel")}</label>
                  <Input
                    scheme={theme}
                    value={groupName}
                    onChange={(event) => {
                      setGroupName(event.target.value);
                    }}
                    placeholder={t("groups.create.namePlaceholder")}
                    autoFocus
                  />

                  <label>{t("groups.create.descriptionLabel")}</label>
                  <Input
                    scheme={theme}
                    value={groupDescription}
                    onChange={(event) => {
                      setGroupDescription(event.target.value);
                    }}
                    placeholder={t("groups.create.descriptionPlaceholder")}
                  />
                  <div className="rounded-xl border border-neutral-300/80 dark:border-neutral-700 p-3 space-y-3 bg-neutral-50/70 dark:bg-neutral-900/40">
                    <div>
                      <h3 className="font-semibold">{t("groups.create.settingsTitle")}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {t("groups.create.settingsDescription")}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <CheckWithLabel
                        label={t("groups.create.approvalRequiredLabel")}
                        checked={requiresModeratorApproval}
                        onChange={() => setRequiresModeratorApproval((prev) => !prev)}
                        className="[&>span:last-child]:text-neutral-900! dark:[&>span:last-child]:text-neutral-100!"
                      />
                      <p className="ml-6 text-sm text-neutral-500 dark:text-neutral-400">
                        {t("groups.create.approvalRequiredDescription")}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <CheckWithLabel
                        label={t("groups.create.onlyModsCanAddListsLabel")}
                        checked={onlyModsCanAddLists}
                        onChange={() => setOnlyModsCanAddLists((prev) => !prev)}
                        className="[&>span:last-child]:text-neutral-900! dark:[&>span:last-child]:text-neutral-100!"
                      />
                      <p className="ml-6 text-sm text-neutral-500 dark:text-neutral-400">
                        {t("groups.create.onlyModsCanAddListsDescription")}
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      variant="transparent"
                      scheme={theme}
                      onClick={() => {
                        setGroupName("")
                        setGroupDescription("")
                        setRequiresModeratorApproval(false)
                        setOnlyModsCanAddLists(false)
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                  </DialogClose>
                  <Button
                    scheme={theme}
                    type="submit"
                    disabled={createGroup.isPending || groupName.trim().length < 3}
                    icon={createGroup.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
                  >
                    {createGroup.isPending ? t("common.saving") : t("groups.create.create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </PopoverContent>
      </Popover>
    </div>
  )
}
