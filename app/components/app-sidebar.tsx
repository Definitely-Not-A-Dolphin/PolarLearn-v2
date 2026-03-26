import { useLocation, useNavigate, useRouteLoaderData } from "react-router"
import type { ReactElement } from "react"
import { Cog, Home, MessageCircle, PanelLeftClose, PanelLeftOpen } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "~/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import i18n from "~/i18n"
import { Button } from "@polarnl/polarui-react"
import { cn } from "~/lib/utils"

import { authClient } from "~/lib/auth/client"
import { Image } from "@unpic/react"
import pl_logo from "~/img/polarlearn.svg"
import { ChevronsUpDown, LogOut } from "lucide-react"

function SidebarTooltip({
  label,
  children,
}: {
  label: string
  children: ReactElement
}) {
  const { state } = useSidebar()

  if (state === "expanded") {
    return children
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarToggleIcon({ isCollapsed }: { isCollapsed: boolean }) {
  const Icon = isCollapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <div className="relative flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sidebar-primary-foreground">
      <Image
        src={pl_logo}
        alt="PolarLearn"
        width={24}
        height={24}
        className="h-5.5 w-5.5 object-contain transition-opacity duration-200 group-hover:opacity-0"
      />
      <Icon className="absolute inset-0 m-auto size-5 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </div>
  )
}

export function AppSidebar({ user }: { user: { image: string; name: string; email?: string } }) {
  const { toggleSidebar, state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const location = useLocation()
  const navigate = useNavigate()

  const rootData = useRouteLoaderData("root") as any
  const theme = rootData?.theme || "dark"
  const buttonColor = theme === "dark" ? "dark" : "light"
  const buttonTextColor = theme === "dark" ? "white" : "black"

  const navItems = [
    { title: "home.sidebar.home", icon: Home, url: "/home" },
    { title: "home.sidebar.forum", icon: MessageCircle, url: "/home/forum" },
  ]

  const handleLogout = async () => {
    await authClient.signOut();
    navigate("/auth/sign-in");
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-200 dark:border-neutral-800">
      <SidebarHeader className="py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarTooltip
              label={
                state === "collapsed"
                  ? i18n.t("home.sidebar.expandSidebar")
                  : i18n.t("home.sidebar.collapseSidebar")
              }
            >
              <button
                onClick={toggleSidebar}
                className={cn(
                  "group flex h-10 w-full items-center rounded-xl p-2 hover:bg-neutral-700/90 transition-all cursor-pointer",
                  isCollapsed ? "justify-center p-0!" : "justify-start"
                )}
              >
                <SidebarToggleIcon isCollapsed={isCollapsed} />
                {!isCollapsed && (
                  <div className="grid flex-1 text-left leading-none ml-2">
                    <span className="truncate text-xl font-semibold font-heading flex-row flex">
                      <p className=" bg-linear-to-r from-sky-400 to-sky-100 bg-clip-text text-transparent">Polar</p>
                      Learn
                    </span>
                  </div>
                )}
              </button>
            </SidebarTooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu className="gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url || (item.url !== "/home" && location.pathname.startsWith(item.url))
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarTooltip label={i18n.t(item.title)}>
                  <Button
                    color={isActive ? "sky" : buttonColor}
                    textColor={isActive ? "white" : buttonTextColor}
                    onClick={() => navigate(item.url)}
                    className={cn(
                      "flex h-9 w-full items-center rounded-xl p-2",
                      isCollapsed ? "justify-center p-0!" : "justify-start"
                    )}
                  >
                    <item.icon className="size-5 shrink-0" />
                    {!isCollapsed && <span className="truncate ml-2">{i18n.t(item.title)}</span>}
                  </Button>
                </SidebarTooltip>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  color={buttonColor}
                  textColor={buttonTextColor}
                  className={cn(
                    "flex h-10 w-full items-center rounded-xl py-2",
                    isCollapsed ? "justify-center" : "justify-start px-2"
                  )}
                >
                  <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium uppercase">{user?.name?.charAt(0) || "U"}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate text-left font-medium ml-2">
                        {user?.name || i18n.t("home.sidebar.logout")}
                      </span>
                      <ChevronsUpDown className="size-4 shrink-0 opacity-70" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={8}
                avoidCollisions={false}
                className="w-64 ml-2"
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-3 px-2 py-1.5 text-left">
                    <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      {user?.image ? (
                        <Image
                          src={user.image}
                          alt={user.name}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium uppercase">{user?.name?.charAt(0) || "U"}</span>
                      )}
                    </div>
                    <div className="grid flex-1 text-sm leading-tight">
                      <span className="truncate font-medium">{user?.name || i18n.t("home.sidebar.logout")}</span>
                      {user?.email ? <span className="truncate text-xs text-muted-foreground">{user.email}</span> : null}
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem className="gap-2" onSelect={() => navigate("/home/usersettings")}>
                    <Cog />
                    Instellingen
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="gap-2 text-destructive" onSelect={() => {
                  handleLogout()
                }}>
                  <LogOut />
                  {i18n.t("home.sidebar.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
