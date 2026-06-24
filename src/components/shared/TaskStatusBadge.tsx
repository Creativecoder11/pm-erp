import { cn } from "@/lib/utils"
import type { IProjectColumn } from "@/types"

export function TaskStatusBadge({
  column,
  className,
}: {
  column: IProjectColumn
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        className
      )}
      style={{ backgroundColor: `${column.color}1a`, color: column.color }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
      {column.name}
    </span>
  )
}
