import {
  Outlet,
  useLocation,
  useNavigate,
  useRouteLoaderData,
} from "react-router";
import { Tabs } from "@polarnl/polarui-react";
import { t } from "~/i18n";
import type { RootLoaderData } from "~/lib/root-data";
import type { Route } from "./+types/layout";

const tabs = [
  { label: t("forum.tabs.allPosts"), path: "posts" },
  { label: t("forum.tabs.myPosts"), path: "myPosts" },
  { label: t("forum.tabs.myReplies"), path: "myReplies" },
];

export function meta(): Route.MetaDescriptors {
  return [
    { title: t("forum.metaTitle") },
    {
      name: "description",
      content: t("forum.metaDescription"),
    },
  ];
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "dark";
  const isLoggedIn = Boolean(rootData?.user?.id);
  const visibleTabs = isLoggedIn ? tabs : tabs.slice(0, 1);

  const normalizedPath = location.pathname.replace(/\/+$/, "");
  const basePath = "/app/forum";
  const activeIndex = visibleTabs.findIndex(
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
      <h1 className="truncate text-3xl font-bold">{t("navigation.forum")}</h1>
      {!isLoggedIn ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("forum.loginPrompt")}
        </p>
      ) : null}
      <div className="mt-4 flex flex-row items-center gap-3">
        <Tabs
          scheme={theme}
          tabs={visibleTabs.map((tab) => tab.label)}
          activeIndex={activeIndex === -1 ? 0 : activeIndex}
          onActiveIndexChange={handleTabChange}
        />
      </div>
      <hr className="mt-4" />
      <div className="py-4">
        <Outlet />
      </div>
    </div>
  );
}
