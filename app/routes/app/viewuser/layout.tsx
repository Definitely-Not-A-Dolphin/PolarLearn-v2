import {
  Outlet,
  useLocation,
  useNavigate,
  useLoaderData,
  useRouteLoaderData,
} from "react-router";
import { Tabs } from "@polarnl/polarui-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type { RootLoaderData } from "~/lib/root-data";
import { prisma } from "~/lib/db";
import type { Route } from "./+types/layout";
import i18n from "~/i18n";

const tabs = [
  { label: i18n.t("navigation.lists"), path: "lists" },
  { label: i18n.t("navigation.groups"), path: "groups" },
  { label: i18n.t("navigation.folders"), path: "folders" },
  { label: i18n.t("navigation.posts"), path: "posts" },
];

export async function loader({ params }: Route.LoaderArgs) {
  const userId = params.id;
  if (!userId) {
    throw new Response("", { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      displayUsername: true,
      image: true,
      lists: {
        orderBy: {
          updatedAt: "desc",
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
      },
      forumPosts: {
        select: {
          id: true,
          title: true,
          content: true,
        },
      },
    },
  });
  if (!user) {
    throw new Response("", { status: 404 });
  }
  return { user };
}

export default function Layout() {
  const { user } = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigate = useNavigate();
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "dark";

  const basePath = `/app/viewuser/${user.id}`;
  const normalizedPath = location.pathname.replace(/\/+$/, "");
  const activeIndex = tabs.findIndex(
    ({ path }) =>
      normalizedPath === `${basePath}/${path}` ||
      normalizedPath.startsWith(`${basePath}/${path}/`),
  );

  const handleTabChange = (idx: number) => {
    const tab = tabs[idx];
    if (tab) {
      void navigate(`${basePath}/${tab.path}`);
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-row items-center gap-3">
        <Avatar className="size-12">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>
            {(user.displayUsername ?? user.name ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold">
            {user.displayUsername ?? user.name ?? "User"}
          </h1>
          {user.name &&
          user.displayUsername &&
          user.name !== user.displayUsername ? (
            <p className="truncate text-sm text-muted-foreground">
              @{user.name}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-row items-center">
        <Tabs
          scheme={theme}
          tabs={tabs.map((tab) => tab.label)}
          activeIndex={activeIndex === -1 ? 0 : activeIndex}
          onActiveIndexChange={handleTabChange}
        />
      </div>
      <hr />
      <div className="py-4">
        <Outlet />
      </div>
    </div>
  );
}
