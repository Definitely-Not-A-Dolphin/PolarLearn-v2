import { useLocation, useRouteLoaderData } from "react-router";

import { SidebarTrigger } from "~/components/ui/sidebar";
import i18n from "~/i18n";

export function TopBar({ children }: { children?: React.ReactNode }) {
  const rootData = useRouteLoaderData("root") as {
    theme: string
    user: { name: string; image: string; email: string; role: string }
  }
  const location = useLocation()
  const theme = rootData?.theme || "dark"
  const t = i18n.t;

  return (
    <div className="border-b dark:border-neutral-700 border-neutral-300 min-h-16 w-full flex items-center gap-3 px-4 top-0 z-10 bg-neutral-50 dark:bg-neutral-900 ">
      <SidebarTrigger
        className="md:hidden shrink-0"
        scheme={theme as "dark" | "light"}
        variant="transparent"
      />
      {children}
      {location.pathname === "/home" && (
        <h1 className="text-2xl font-bold">👋 {t("general.welcomeText", { username: rootData.user.name })}</h1>
      )}
      {location.pathname === "/home/forum" && (
        <h1 className="text-2xl font-bold">{t("general.forum")}</h1>
      )}
    </div>
  )
}