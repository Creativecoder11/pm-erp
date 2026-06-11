"use client"

import { forwardRef } from "react"
import { format, isPast, isToday } from "date-fns"
import { CalendarDays, CheckSquare, MessageSquare, Paperclip } from "lucide-react"
import { AvatarStack } from "@/components/shared/Avatar"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ITaskWithUsers } from "@/types"

interface TaskCardProps extends React.HTMLAttributes<HTMLDivElement> {
  task: ITaskWithUsers
  isDragging?: boolean
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard(
  { task, isDragging, className, ...props },
  ref
) {
  const subtaskTotal = task.subtasks.length
  const subtaskDone = task.subtasks.filter((s) => s.done).length

  const isOverdue =
    !!task.dueDate && !task.completedAt && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
  const isDueToday = !!task.dueDate && !task.completedAt && isToday(new Date(task.dueDate))

  return (
    <div
      ref={ref}
      className={cn(
        "cursor-pointer space-y-2 rounded-lg border bg-card p-3 text-sm shadow-sm transition-colors hover:border-primary/40",
        isDragging && "opacity-40",
        className
      )}
      {...props}
    >
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <p className="font-medium leading-snug">{task.title}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {task.priority !== "none" && <PriorityBadge priority={task.priority} />}

        {task.dueDate && (
          <span
            className={cn(
              "flex items-center gap-1",
              isOverdue && "text-red-600 dark:text-red-400",
              isDueToday && "text-blue-600 dark:text-blue-400"
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}

        {subtaskTotal > 0 && (
          <span className="flex items-center gap-1">
            <CheckSquare className="h-3 w-3" />
            {subtaskDone}/{subtaskTotal}
          </span>
        )}

        {task.attachments.length > 0 && (
          <span className="flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            {task.attachments.length}
          </span>
        )}

        {!!task.commentCount && task.commentCount > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {task.commentCount}
          </span>
        )}
      </div>

      {task.assignees.length > 0 && (
        <div className="flex justify-end">
          <AvatarStack users={task.assignees} size="sm" max={3} />
        </div>
      )}
    </div>
  )
})
