import { ArrowDown, ArrowUp, ArrowUpRight, Minus, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TaskPriority } from "@/types"

const config: Record<TaskPriority, { label: string; className: string; icon: React.ElementType }> = {
  none: { label: "None", className: "bg-muted text-muted-foreground", icon: Minus },
  low: { label: "Low", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", icon: ArrowDown },
  medium: { label: "Medium", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", icon: ArrowUpRight },
  high: { label: "High", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", icon: ArrowUp },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300", icon: AlertTriangle },
}

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const { label, className: colorClass, icon: Icon } = config[priority] ?? config.none

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
        colorClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
