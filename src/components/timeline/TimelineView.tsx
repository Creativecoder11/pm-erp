"use client"

import { useEffect, useMemo } from "react"
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, isToday, startOfDay } from "date-fns"
import { GanttChartSquare } from "lucide-react"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"
import { useTaskStore } from "@/store/taskStore"
import { useUIStore } from "@/store/uiStore"
import type { IProjectColumn } from "@/types"

const DAY_WIDTH = 32

interface TimelineViewProps {
  projectId: string
  columns: IProjectColumn[]
}

export function TimelineView({ projectId, columns }: TimelineViewProps) {
  const { tasks, isLoading, fetchTasks } = useTaskStore()
  const { openTaskModal } = useUIStore()

  useEffect(() => {
    fetchTasks(projectId)
  }, [projectId, fetchTasks])

  const scheduledTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.startDate || t.dueDate)
        .sort((a, b) => {
          const aStart = new Date(a.startDate ?? a.dueDate!).getTime()
          const bStart = new Date(b.startDate ?? b.dueDate!).getTime()
          return aStart - bStart
        }),
    [tasks]
  )

  const { rangeStart, days } = useMemo(() => {
    const today = startOfDay(new Date())
    let min = today
    let max = addDays(today, 13)

    for (const t of scheduledTasks) {
      const start = startOfDay(new Date(t.startDate ?? t.dueDate!))
      const end = startOfDay(new Date(t.dueDate ?? t.startDate!))
      if (start < min) min = start
      if (end > max) max = end
    }

    min = addDays(min, -2)
    max = addDays(max, 2)

    return { rangeStart: min, days: eachDayOfInterval({ start: min, end: max }) }
  }, [scheduledTasks])

  if (isLoading && tasks.length === 0) {
    return <LoadingSpinner className="py-24" />
  }

  if (scheduledTasks.length === 0) {
    return (
      <EmptyState
        icon={GanttChartSquare}
        title="No scheduled tasks"
        description="Add a start or due date to tasks to see them on the timeline."
        className="m-4"
      />
    )
  }

  const columnById = new Map(columns.map((c) => [c.id, c]))
  const todayOffset = differenceInCalendarDays(startOfDay(new Date()), rangeStart)

  return (
    <div className="flex h-full overflow-auto">
      <div className="sticky left-0 z-10 w-56 shrink-0 border-r bg-background">
        <div className="h-12 border-b" />
        {scheduledTasks.map((task) => (
          <div key={task._id} className="flex h-9 items-center truncate border-b px-3 text-sm" title={task.title}>
            {task.title}
          </div>
        ))}
      </div>

      <div className="relative" style={{ width: days.length * DAY_WIDTH }}>
        <div className="flex h-12 border-b">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "flex shrink-0 flex-col items-center justify-center border-r text-[10px] text-muted-foreground",
                isToday(day) && "bg-primary/5 font-semibold text-primary"
              )}
              style={{ width: DAY_WIDTH }}
            >
              <span>{format(day, "MMM")}</span>
              <span>{format(day, "d")}</span>
            </div>
          ))}
        </div>

        {scheduledTasks.map((task) => {
          const start = startOfDay(new Date(task.startDate ?? task.dueDate!))
          const end = startOfDay(new Date(task.dueDate ?? task.startDate!))
          const offset = differenceInCalendarDays(start, rangeStart)
          const span = Math.max(1, differenceInCalendarDays(end, start) + 1)
          const column = columnById.get(task.status)

          return (
            <div key={task._id} className="relative h-9 border-b">
              <button
                onClick={() => openTaskModal(task._id)}
                className="absolute top-1.5 flex h-6 items-center truncate rounded px-2 text-left text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-80"
                style={{
                  left: offset * DAY_WIDTH,
                  width: span * DAY_WIDTH - 4,
                  backgroundColor: column?.color ?? "#94a3b8",
                }}
              >
                {task.title}
              </button>
            </div>
          )
        })}

        {todayOffset >= 0 && todayOffset < days.length && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-red-500"
            style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
          />
        )}
      </div>
    </div>
  )
}
