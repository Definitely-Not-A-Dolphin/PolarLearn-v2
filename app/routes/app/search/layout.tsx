
import { Outlet, useLocation, useNavigate, useRouteLoaderData } from "react-router";
import { Tabs } from "@polarnl/polarui-react";
import { t } from "~/i18n";
import type { RootLoaderData } from "~/lib/root-data";

const tabs = [
  { label: t("navigation.lists"), path: "lists" },
  { label: t("navigation.groups"), path: "groups" },
  { label: t("navigation.forum"), path: "forum" },
  { label: t("admin.tabs.users"), path: "users" },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "dark";

  const normalizedPath = location.pathname.replace(/\/+$/, "");
  const basePath = "/app/search";
  const activeIndex = tabs.findIndex(
    ({ path }) =>
      normalizedPath === `${basePath}/${path}` ||
      (path === "" && normalizedPath === basePath) ||
      normalizedPath.startsWith(`${basePath}/${path}/`),
  );

  const handleTabChange = (idx: number) => {
    const tab = tabs[idx];
    if (tab) {
      const search = typeof location.search === "string" && location.search.length > 0 ? location.search : "";
      void navigate(`${basePath}/${tab.path}${search}`);
    }
  };

  return (
    <div className="p-4">
      <div className="mt-4 flex flex-row items-center gap-3">
        <Tabs
          scheme={theme}
          tabs={tabs.map((tab) => tab.label)}
          activeIndex={activeIndex === -1 ? 0 : activeIndex}
          onActiveIndexChange={handleTabChange}
        />
      </div>
      <hr className="mb-4" />
      <Outlet />
    </div>
  );
}

