import { Outlet } from "react-router"
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip"
import { AppSidebar } from "~/components/app-sidebar"
import { TopBar } from "~/components/topbar"

export default function HomeLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={false}
        className="min-h-[calc(100svh_-_var(--impersonation-banner-height))]"
      >
        <AppSidebar />
        <SidebarInset className="bg-neutral-50 dark:bg-neutral-900 min-h-[calc(100svh_-_var(--impersonation-banner-height))] border-none outline-none ring-0">
          <TopBar />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
