import { cn } from "@/lib/utils"
import type { ProjectStatus } from "@/types"

const config: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  on_hold: { label: "On Hold", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
}

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const { label, className: colorClass } = config[status] ?? config.active

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
