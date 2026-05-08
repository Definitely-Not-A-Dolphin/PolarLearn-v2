import {
  Outlet,
  useLocation,
  useNavigate,
  useRouteLoaderData,
} from "react-router";
import { Tabs } from "@polarnl/polarui-react";
import { t } from "~/i18n";
import type { RootLoaderData } from "~/lib/root-data";

const tabs = [
  { label: t("forum.tabs.allPosts"), path: "posts" },
  { label: t("forum.tabs.myPosts"), path: "myPosts" },
  { label: t("forum.tabs.myReplies"), path: "myReplies" },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "dark";

  const normalizedPath = location.pathname.replace(/\/+$/, "");
  const basePath = "/app/forum";
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
      <h1 className="truncate text-3xl font-bold">{t("navigation.forum")}</h1>
      <div className="mt-4 flex flex-row items-center gap-3">
        <Tabs
          scheme={theme}
          tabs={tabs.map((tab) => tab.label)}
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
