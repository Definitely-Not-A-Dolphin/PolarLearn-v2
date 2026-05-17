import { useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Ban, Loader2, LogIn, MessageSquareOff, ShieldAlert, ShieldUser, Trash2 } from "lucide-react";
import { redirect, useLoaderData, useNavigate, useRouteLoaderData } from "react-router";
import { Button } from "@polarnl/polarui-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { authClient } from "~/lib/auth/client";
import { auth } from "~/lib/auth/server";
import type { Route } from "./+types/users";
import i18n from "~/i18n";

const PAGE_SIZE = 50;

type AdminUser = typeof auth.$Infer.Session.user;
type UsersPage = Omit<Awaited<ReturnType<typeof auth.api.listUsers>>, "users"> & {
  users: AdminUser[];
};
type BanScope = "platform" | "forum";
type PendingBan = {
  scope: BanScope;
  user: AdminUser;
};
type PendingDelete = {
  user: AdminUser;
};

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers(request.headers);
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    const url = new URL(request.url);
    return redirect(`/auth/sign-in?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
  }

  if (session.user.role !== "admin") {
    return redirect("/app");
  }

  const initialPage = await auth.api.listUsers({
    headers,
    query: {
      limit: PAGE_SIZE,
      offset: 0,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });

  return {
    currentUserId: session.user.id,
    initialPage: normalizeUsersPage(initialPage),
  };
}

export default function UsersAdminPage() {
  const { initialPage, currentUserId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>(initialPage.users);
  const [total, setTotal] = useState(initialPage.total);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingBan, setPendingBan] = useState<PendingBan | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banReasonError, setBanReasonError] = useState<string | null>(null);
  const [isBanPending, setIsBanPending] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const t = i18n.t;

  const hasMore = users.length < total;

  const loadMoreUsers = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setLoadError(null);

    const { data, error } = await authClient.admin.listUsers({
      query: {
        limit: PAGE_SIZE,
        offset: users.length,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    });

    if (error || !data) {
      setLoadError(error?.message ?? t("admin.users.loadError"));
      setIsLoadingMore(false);
      return;
    }

    const nextPage = normalizeUsersPage(data);
    setUsers((currentUsers) => mergeUsersById(currentUsers, nextPage.users));
    setTotal(nextPage.total);
    setIsLoadingMore(false);
  };

  const patchUserInList = (userId: string, patch: Partial<AdminUser>) => {
    setUsers((currentUsers) => currentUsers.map((user) => (user.id === userId ? { ...user, ...patch } : user)));
  };

  const openBanDialog = (scope: BanScope, user: AdminUser) => {
    setLoadError(null);
    setPendingBan({ scope, user });
    setBanReason("");
    setBanReasonError(null);
  };

  const openDeleteDialog = (user: AdminUser) => {
    setLoadError(null);
    setPendingDelete({ user });
  };

  const closeBanDialog = () => {
    if (isBanPending) {
      return;
    }

    setPendingBan(null);
    setBanReason("");
    setBanReasonError(null);
  };

  const closeDeleteDialog = () => {
    if (isDeletePending) {
      return;
    }

    setPendingDelete(null);
  };

  const togglePlatformBan = async (user: AdminUser) => {
    setLoadError(null);

    if (!user.banned) {
      openBanDialog("platform", user);
      return;
    }

    const response = await authClient.admin.unbanUser({ userId: user.id });

    if (response.error) {
      setLoadError(response.error.message ?? t("admin.users.actionError"));
      return;
    }

    patchUserInList(user.id, { banned: false, banReason: undefined });
  };

  const toggleForumBan = async (user: AdminUser) => {
    setLoadError(null);

    if (!user.forumBanned) {
      openBanDialog("forum", user);
      return;
    }

    const response = await authClient.admin.updateUser({
      userId: user.id,
      data: { forumBanned: false, forumBanReason: null },
    });

    if (response.error) {
      setLoadError(response.error.message ?? t("admin.users.actionError"));
      return;
    }

    patchUserInList(user.id, { forumBanned: false, forumBanReason: undefined });
  };

  const deleteUser = async () => {
    if (!pendingDelete) {
      return;
    }

    setIsDeletePending(true);
    setLoadError(null);

    try {
      const response = await authClient.admin.removeUser({ userId: pendingDelete.user.id });

      if (response.error) {
        setLoadError(response.error.message ?? t("admin.users.actionError"));
        return;
      }

      setUsers((currentUsers) => currentUsers.filter((user) => user.id !== pendingDelete.user.id));
      setTotal((currentTotal) => Math.max(0, currentTotal - 1));
      setPendingDelete(null);
    } finally {
      setIsDeletePending(false);
    }
  };

  const confirmBan = async () => {
    if (!pendingBan) {
      return;
    }

    const reason = banReason.trim();

    if (!reason) {
      setBanReasonError(t("admin.users.banDialog.reasonRequired"));
      return;
    }

    setIsBanPending(true);
    setLoadError(null);

    try {
      if (pendingBan.scope === "platform") {
        const response = await authClient.admin.banUser({
          userId: pendingBan.user.id,
          banReason: reason,
        });

        if (response.error) {
          setLoadError(response.error.message ?? t("admin.users.actionError"));
          return;
        }

        patchUserInList(pendingBan.user.id, { banned: true, banReason: reason });
      } else {
        const response = await authClient.admin.updateUser({
          userId: pendingBan.user.id,
          data: { forumBanned: true, forumBanReason: reason },
        });

        if (response.error) {
          setLoadError(response.error.message ?? t("admin.users.actionError"));
          return;
        }

        patchUserInList(pendingBan.user.id, { forumBanned: true, forumBanReason: reason });
      }

      setPendingBan(null);
      setBanReason("");
      setBanReasonError(null);
    } finally {
      setIsBanPending(false);
    }
  };

  return (
    <section className="space-y-4">
      <BanReasonDialog
        pendingBan={pendingBan}
        reason={banReason}
        reasonError={banReasonError}
        isPending={isBanPending}
        onReasonChange={(value) => {
          setBanReason(value);
          if (banReasonError) {
            setBanReasonError(null);
          }
        }}
        onCancel={closeBanDialog}
        onConfirm={confirmBan}
      />

      <DeleteUserDialog
        pendingDelete={pendingDelete}
        isPending={isDeletePending}
        onCancel={closeDeleteDialog}
        onConfirm={deleteUser}
      />

      {loadError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <ShieldAlert className="size-4" />
          <span>{loadError}</span>
        </div>
      ) : null}

      <InfiniteScroll
        dataLength={users.length}
        next={loadMoreUsers}
        hasMore={hasMore}
        loader={
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>{t("admin.users.loadingMore")}</span>
          </div>
        }
        endMessage={
          users.length > 0 ? (
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              {t("admin.users.allLoaded")}
            </div>
          ) : null
        }
      >
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(22rem,auto)_auto] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground max-lg:hidden">
            <span>{t("admin.users.columns.user")}</span>
            <span>{t("admin.users.columns.actions")}</span>
            <span>{t("admin.users.columns.createdAt")}</span>
          </div>

          {
            users.map((user) => (
              <div
                key={user.id}
                className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(22rem,auto)_auto] items-center gap-3 border-b border-border px-4 py-3 transition last:border-b-0 hover:bg-muted/60 max-lg:grid-cols-1"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-col gap-2 text-left"
                  onClick={() => void navigate(`/app/viewuser/${user.id}`)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? user.email} />
                      <AvatarFallback>
                        {(user.name ?? user.email).trim().charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">
                        {user.name ?? user.email}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.role === "admin" ? (
                      <Badge
                        variant="outline"
                        className="h-auto rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white"
                      >
                        <ShieldUser />
                        {t("userMenu.admin")}
                      </Badge>
                    ) : null}
                    {user.banned ? <Badge variant="destructive">{t("admin.users.badges.platformBanned")}</Badge> : null}
                    {user.forumBanned ? (
                      <Badge variant="outline" className="h-auto rounded bg-orange-500 px-2 py-1 text-xs font-semibold text-white">
                        {t("admin.users.badges.forumBanned")}
                      </Badge>
                    ) : null}
                    {user.emailVerified ? (
                      <Badge variant="outline">{t("admin.users.badges.verified")}</Badge>
                    ) : (
                      <Badge variant="outline" className="h-auto rounded px-2 py-1 text-xs font-semibold bg-amber-500 text-white">
                        {t("admin.users.badges.unverified")}
                      </Badge>
                    )}
                  </div>
                </button>

                <div className="flex flex-wrap items-center gap-2 lg:justify-center">
                  <Button
                    className="min-w-36"
                    color={user.banned ? "green" : "red"}
                    disabled={user.id === currentUserId || isBanPending || isDeletePending}
                    icon={<Ban className="size-4" />}
                    onClick={() => {
                      void togglePlatformBan(user);
                    }}
                  >
                    {user.banned ? t("admin.users.actions.platformUnban") : t("admin.users.actions.platformBan")}
                  </Button>

                  <Button
                    className="min-w-32"
                    color={user.forumBanned ? "green" : "orange"}
                    disabled={user.id === currentUserId || isBanPending || isDeletePending}
                    icon={<MessageSquareOff className="size-4" />}
                    onClick={() => {
                      void toggleForumBan(user);
                    }}
                  >
                    {user.forumBanned ? t("admin.users.actions.forumUnban") : t("admin.users.actions.forumBan")}
                  </Button>

                  <Button
                    className="min-w-32"
                    color="sky"
                    textColor="white"
                    disabled={user.id === currentUserId || isBanPending || isDeletePending}
                    icon={<LogIn className="size-4" />}
                    onClick={() => {
                      setLoadError(null);

                      void (async () => {
                        const response = await authClient.admin.impersonateUser({ userId: user.id });

                        if (response.error) {
                          setLoadError(response.error.message ?? t("admin.users.actionError"));
                          return;
                        }

                        void navigate("/app");
                      })();
                    }}
                  >
                    {t("admin.users.actions.impersonate")}
                  </Button>

                  <Button
                    className="min-w-32"
                    color="red"
                    disabled={user.id === currentUserId || isBanPending || isDeletePending}
                    icon={<Trash2 className="size-4" />}
                    onClick={() => {
                      openDeleteDialog(user);
                    }}
                  >
                    {t("admin.users.actions.delete")}
                  </Button>
                </div>

                <div className="whitespace-nowrap text-sm text-muted-foreground max-md:whitespace-normal">
                  {formatDate(user.createdAt)}
                </div>
              </div>
            ))
          }
        </div>
      </InfiniteScroll>
    </section>
  );
}

function BanReasonDialog({
  pendingBan,
  reason,
  reasonError,
  isPending,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  pendingBan: PendingBan | null;
  reason: string;
  reasonError: string | null;
  isPending: boolean;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const t = i18n.t;
  const scope = pendingBan?.scope ?? "platform";
  const targetName = pendingBan?.user.name ?? pendingBan?.user.email ?? "";
  const reasonId = `ban-reason-${scope}`;
  const isPlatformBan = scope === "platform";
  const rootData = useRouteLoaderData("root")

  return (
    <Dialog
      open={Boolean(pendingBan)}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isPlatformBan
              ? t("admin.users.banDialog.platformTitle")
              : t("admin.users.banDialog.forumTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.users.banDialog.description", { user: targetName })}
          </DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={reasonId}>
          {t("admin.users.banDialog.reasonLabel")}
          <textarea
            id={reasonId}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            aria-invalid={Boolean(reasonError)}
            className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            placeholder={t("admin.users.banDialog.reasonPlaceholder")}
          />
        </label>
        {reasonError ? (
          <p className="text-sm text-destructive">{reasonError}</p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="transparent" disabled={isPending}>
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button
            color={isPlatformBan ? "red" : "orange"}
            disabled={isPending}
            icon={isPending ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
            onClick={() => {
              void onConfirm();
            }}
            scheme={rootData!.theme}
          >
            {isPending
              ? t("admin.users.banDialog.saving")
              : t("admin.users.banDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({
  pendingDelete,
  isPending,
  onCancel,
  onConfirm,
}: {
  pendingDelete: PendingDelete | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const t = i18n.t;
  const targetName = pendingDelete?.user.name ?? pendingDelete?.user.email ?? "";
  const rootData = useRouteLoaderData("root");

  return (
    <Dialog
      open={Boolean(pendingDelete)}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-red-700 dark:text-red-300">
            {t("admin.users.deleteDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.users.deleteDialog.description", { user: targetName })}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t("admin.users.deleteDialog.warning")}
        </p>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="transparent" disabled={isPending}>
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button
            color="red"
            disabled={isPending}
            icon={isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            onClick={() => {
              void onConfirm();
            }}
            scheme={rootData!.theme}
          >
            {isPending ? t("admin.users.deleteDialog.saving") : t("admin.users.deleteDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizeUsersPage(page: unknown): UsersPage {
  const value = page as Partial<UsersPage>;

  return {
    users: Array.isArray(value.users) ? value.users : [],
    total: typeof value.total === "number" ? value.total : 0,
  };
}

function mergeUsersById(currentUsers: AdminUser[], nextUsers: AdminUser[]) {
  const seen = new Set(currentUsers.map((user) => user.id));
  const mergedUsers = [...currentUsers];

  for (const user of nextUsers) {
    if (!seen.has(user.id)) {
      seen.add(user.id);
      mergedUsers.push(user);
    }
  }

  return mergedUsers;
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
