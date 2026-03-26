import { Outlet, redirect, useLoaderData } from "react-router"
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip"
import { AppSidebar } from "~/components/app-sidebar"
import { auth } from "~/lib/auth/server"

export async function loader(loaderArgs: { request: Request }) {
  const headers = new Headers(loaderArgs.request.headers)
  const result = await auth.api.getSession({ headers })
  const user = result?.user
  if (!user) {
    return redirect('/auth/sign-in')
  }
  return {
    name: user.name,
    image: user.image,
    email: user.email,
  }
}

export default function HomeLayout() {
  const loaderData = useLoaderData() as { name: string; image: string; email: string }
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar user={{ name: loaderData.name, image: loaderData.image, email: loaderData.email }} />
        <SidebarInset className="bg-neutral-50 dark:bg-neutral-900 min-h-screen border-none outline-none ring-0">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
