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

import { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useLoaderData, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { createCallerFactory, createTRPCContext } from "~/server/trpc";
import { appRouter } from "~/server/main";
import { t } from "~/i18n";
import type { Route } from "./+types/users";
import type { SearchUser, SearchUsersOutput } from "~/lib/search";
import { useTRPC } from "~/server/react";

const PAGE_SIZE = 10;

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers(request.headers);
  const context = await createTRPCContext({ headers, request });
  const caller = createCallerFactory(appRouter)(context);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!q) {
    return { users: { users: [], nextCursor: null }, q };
  }

  const initialUsers = await caller.search.searchUser({ q, limit: PAGE_SIZE, cursor: undefined });

  return { users: initialUsers, q };
}

export default function SearchUsers() {
  const { users: initialUsers, q } = useLoaderData<typeof loader>();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [users, setUsers] = useState<SearchUser[]>(initialUsers.users);
  const [nextCursor, setNextCursor] = useState<string | null>(initialUsers.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setUsers(initialUsers.users);
    setNextCursor(initialUsers.nextCursor);
    setLoadError(null);
    setIsLoadingMore(false);
  }, [initialUsers.users, initialUsers.nextCursor, q]);

  const fetchMore = async () => {
    if (!q || !nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const nextPage = await queryClient.fetchQuery(
        trpc.search.searchUser.queryOptions({
          q,
          limit: PAGE_SIZE,
          cursor: nextCursor,
        }),
      );

      setUsers((currentUsers) => mergeUsersById(currentUsers, nextPage.users));
      setNextCursor(nextPage.nextCursor);
    } catch {
      setLoadError(t("errors.unknown"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {loadError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <InfiniteScroll
        dataLength={users.length}
        next={() => {
          void fetchMore();
        }}
        hasMore={Boolean(q && nextCursor)}
        loader={
          <div className="flex items-center justify-center p-4">
            <div className="text-muted-foreground">{t("forum.posts.loadingMore")}</div>
          </div>
        }
        endMessage={
          users.length > 0 ? (
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              {t("forum.posts.noMore")}
            </div>
          ) : null
        }
      >
        <div className="flex flex-col gap-4">
          {users.length === 0 ? (
            <p className="text-sm text-neutral-500">{q ? t("search.notFound") : t("search.placeholder")}</p>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                type="button"
                className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:bg-muted max-lg:grid-cols-1"
                onClick={() => {
                  void navigate(`/app/viewuser/${user.id}`);
                }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.image ?? undefined} alt={user.displayUsername ?? user.name} />
                    <AvatarFallback>
                      {(user.displayUsername ?? user.name ?? "?").trim().charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">
                      {user.displayUsername ?? user.name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      @{user.username ?? user.displayUsername ?? user.name}
                    </span>
                  </span>
                </span>

                <span className="flex flex-wrap items-center gap-2">
                  {user.role === "admin" ? (
                    <Badge variant="outline" className="h-auto rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                      {t("userMenu.admin")}
                    </Badge>
                  ) : null}
                  {user.banned ? (
                    <Badge variant="destructive">{t("admin.users.badges.platformBanned")}</Badge>
                  ) : null}
                  {user.forumBanned ? (
                    <Badge variant="outline" className="h-auto rounded bg-orange-500 px-2 py-1 text-xs font-semibold text-white">
                      {t("admin.users.badges.forumBanned")}
                    </Badge>
                  ) : null}
                </span>

                <span className="justify-self-end whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300 max-lg:justify-self-start">
                  {new Date(user.createdAt).toLocaleDateString("nl-NL")}
                </span>
              </button>
            ))
          )}
        </div>
      </InfiniteScroll>
    </div>
  );
}

function mergeUsersById(currentUsers: SearchUser[], nextUsers: SearchUser[]) {
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
