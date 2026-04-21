import { Outlet } from "react-router"
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip"
import { AppSidebar } from "~/components/app-sidebar"
import { TopBar } from "~/components/topbar"

export default function HomeLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className="bg-neutral-50 dark:bg-neutral-900 min-h-screen border-none outline-none ring-0">
          <TopBar>
            
          </TopBar>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
