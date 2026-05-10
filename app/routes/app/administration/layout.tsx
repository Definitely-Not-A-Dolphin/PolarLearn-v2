import { Outlet, redirect, useLocation, useNavigate, useRouteLoaderData } from "react-router";
import { Tabs } from "@polarnl/polarui-react";
import { t } from "~/i18n";
import type { RootLoaderData } from "~/lib/root-data";
import type { Route } from "./+types/layout";
import { auth } from "~/lib/auth/server";

const tabs = [
  { label: t("admin.tabs.general"), path: "general" },
  { label: t("admin.tabs.users"), path: "users" },
  { label: t("admin.tabs.lists"), path: "lists" },
  { label: t("admin.tabs.analytics"), path: "analytics" },
]

export async function loader(loaderArgs: Route.LoaderArgs) {
  const headers = new Headers(loaderArgs.request.headers)
  const result = await auth.api.getSession({ headers })
  const user = result?.user
  if (!user || user.role !== "admin") {
    return redirect('/app')
  }
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "dark";

  const normalizedPath = location.pathname.replace(/\/+$/, "");
  const basePath = "/app/administration";
  const activePath = normalizedPath === basePath ? `${basePath}/general` : normalizedPath;
  const activeIndex = tabs.findIndex(({ path }) => activePath === `${basePath}/${path}` || activePath.startsWith(`${basePath}/${path}/`));

  const handleTabChange = (idx: number) => {
    const tab = tabs[idx];
    if (tab) {
      void navigate(`${basePath}/${tab.path}`);
    }
  };


  return (
    <div className="p-4">
      <h1 className="truncate text-3xl font-bold">{t("navigation.administration")}</h1>
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
