"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { format } from "date-fns"
import { CalendarDays, KanbanSquare, List, GanttChartSquare, Settings2 } from "lucide-react"
import { AvatarStack } from "@/components/shared/Avatar"
import { ProjectStatusBadge } from "@/components/shared/StatusBadge"
import { cn } from "@/lib/utils"
import type { IProject, IProjectMember, IUserSummary } from "@/types"

type PopulatedMember = Omit<IProjectMember, "userId"> & { userId: IUserSummary }

const TABS = [
  { label: "Board", path: "board", icon: KanbanSquare },
  { label: "List", path: "list", icon: List },
  { label: "Timeline", path: "timeline", icon: GanttChartSquare },
  { label: "Settings", path: "settings", icon: Settings2 },
]

export function ProjectHeader({ project }: { project: IProject }) {
  const pathname = usePathname()
  const members = project.members as unknown as PopulatedMember[]

  return (
    <div className="border-b px-4 sm:px-6">
      <div className="flex items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: project.color }}
          >
            {project.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold leading-tight">{project.name}</h1>
            {project.dueDate && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                Due {format(new Date(project.dueDate), "MMM d, yyyy")}
              </p>
            )}
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>

        {members.length > 0 && (
          <AvatarStack
            users={members.map((m) => m.userId).filter((u) => typeof u === "object")}
            max={5}
          />
        )}
      </div>

      <nav className="flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const href = `/projects/${project._id}/${tab.path}`
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={tab.path}
              href={href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                active && "border-primary text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
