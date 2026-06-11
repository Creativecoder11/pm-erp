"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  ListChecks,
  Gauge,
  BarChart3,
  Users,
  Settings,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Bell,
  LogOut,
  KanbanSquare,
  List,
  GanttChartSquare,
  UserCog,
  Settings2,
  FolderKanban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserAvatar } from "@/components/shared/Avatar"
import axios from "axios"
import { useProjectStore } from "@/store/projectStore"
import { useUIStore } from "@/store/uiStore"
import { useNotifications } from "@/hooks/useNotifications"
import { cn, getInitials } from "@/lib/utils"
import type { IOrganization } from "@/types"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "My Tasks", href: "/my-tasks", icon: ListChecks },
  { label: "Workload", href: "/workload", icon: Gauge },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Team", href: "/settings/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
]

const PROJECT_SUB_NAV = [
  { label: "Board", path: "board", icon: KanbanSquare },
  { label: "List", path: "list", icon: List },
  { label: "Timeline", path: "timeline", icon: GanttChartSquare },
  { label: "Members", path: "members", icon: UserCog },
  { label: "Settings", path: "settings", icon: Settings2 },
]

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { projects, fetchProjects } = useProjectStore()
  const { unreadCount } = useNotifications()
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [prevPathname, setPrevPathname] = useState(pathname)
  const [organization, setOrganization] = useState<IOrganization | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    async function fetchOrganization() {
      try {
        const res = await axios.get("/api/organizations")
        setOrganization(res.data.data as IOrganization)
      } catch {
        // Sidebar falls back to default branding if this fails
      }
    }
    fetchOrganization()
  }, [])

  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    const match = pathname.match(/^\/projects\/([^/]+)/)
    if (match) setExpandedProject(match[1])
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        {organization?.logo ? (
          <img
            src={organization.logo}
            alt={organization.name}
            className="h-8 w-8 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="icon-chip h-8 w-8 rounded-md font-bold">
            {organization ? getInitials(organization.name) : "J"}
          </div>
        )}
        {!collapsed && (
          <span className="truncate font-semibold">{organization?.name ?? "Jamroll PM"}</span>
        )}
      </div>

      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-gradient-primary text-white shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="mt-6">
          <div className="flex items-center justify-between px-3">
            {!collapsed && (
              <span className="text-xs font-semibold uppercase text-muted-foreground">Projects</span>
            )}
            <Link href="/projects/new" onClick={onNavigate}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <nav className="mt-1 space-y-1">
            {projects.slice(0, 8).map((project) => {
              const isExpanded = expandedProject === project._id
              const isActive = pathname.startsWith(`/projects/${project._id}`)

              return (
                <div key={project._id}>
                  <button
                    type="button"
                    onClick={() => setExpandedProject(isExpanded ? null : project._id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate text-left">{project.name}</span>
                        <ChevronDown
                          className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")}
                        />
                      </>
                    )}
                  </button>

                  {!collapsed && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                      {PROJECT_SUB_NAV.map((sub) => {
                        const href =
                          sub.path === "board"
                            ? `/projects/${project._id}/board`
                            : `/projects/${project._id}/${sub.path}`
                        const subActive = pathname === href || pathname.startsWith(href + "/")
                        return (
                          <Link
                            key={sub.path}
                            href={href}
                            onClick={onNavigate}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                              subActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <sub.icon className="h-3.5 w-3.5" />
                            {sub.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {projects.length === 0 && !collapsed && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet</p>
            )}

            {!collapsed && (
              <Link
                href="/projects"
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <FolderKanban className="h-3.5 w-3.5" />
                View all projects
              </Link>
            )}
          </nav>
        </div>
      </ScrollArea>

      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
              >
                <UserAvatar name={session?.user?.name ?? "User"} avatar={session?.user?.image ?? undefined} size="sm" />
                {!collapsed && (
                  <div className="flex-1 truncate">
                    <p className="truncate text-sm font-medium">{session?.user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
                  </div>
                )}
                {!collapsed && (
                  <div className="relative">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] text-destructive-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                )}
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Preferences
                </Link>
              }
            />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <aside
      className={cn(
        "relative hidden h-screen shrink-0 border-r bg-sidebar text-sidebar-foreground transition-all md:block",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarNav collapsed={sidebarCollapsed} />
      <Button
        variant="outline"
        size="icon"
        className="absolute -right-3 top-16 h-6 w-6 rounded-full bg-background"
        onClick={toggleSidebar}
      >
        {sidebarCollapsed ? <ChevronsRight className="h-3 w-3" /> : <ChevronsLeft className="h-3 w-3" />}
      </Button>
    </aside>
  )
}
