"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import axios from "axios"
import { addDays, format, isAfter, isPast, isToday } from "date-fns"
import { ChevronDown, ChevronRight, ListChecks } from "lucide-react"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"
import type { ITaskWithUsers } from "@/types"

type TaskWithProject = Omit<ITaskWithUsers, "projectId"> & {
  projectId: { _id: string; name: string; color: string }
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    axios
      .get("/api/tasks", { params: { assignee: "me", limit: 200 } })
      .then((res) => setTasks(res.data.data))
      .finally(() => setLoading(false))
  }, [])

  const groups = useMemo(() => {
    const now = new Date()
    const weekFromNow = addDays(now, 7)
    const incomplete = tasks.filter((t) => !t.completedAt)
    const completed = tasks
      .filter((t) => !!t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())

    return {
      overdue: incomplete.filter(
        (t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
      ),
      today: incomplete.filter((t) => t.dueDate && isToday(new Date(t.dueDate))),
      upcoming: incomplete.filter(
        (t) =>
          t.dueDate &&
          !isPast(new Date(t.dueDate)) &&
          !isToday(new Date(t.dueDate)) &&
          !isAfter(new Date(t.dueDate), weekFromNow)
      ),
      later: incomplete.filter((t) => t.dueDate && isAfter(new Date(t.dueDate), weekFromNow)),
      noDueDate: incomplete.filter((t) => !t.dueDate),
      completed,
    }
  }, [tasks])

  const totalIncomplete =
    groups.overdue.length + groups.today.length + groups.upcoming.length + groups.later.length + groups.noDueDate.length

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
        <p className="text-sm text-muted-foreground">
          {totalIncomplete} open task{totalIncomplete === 1 ? "" : "s"} assigned to you
        </p>
      </div>

      {loading ? (
        <LoadingSpinner className="py-24" />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="You're all caught up"
          description="No tasks are currently assigned to you."
        />
      ) : (
        <div className="space-y-6">
          <TaskSection title="Overdue" tasks={groups.overdue} emphasize="text-red-600 dark:text-red-400" />
          <TaskSection title="Due Today" tasks={groups.today} emphasize="text-blue-600 dark:text-blue-400" />
          <TaskSection title="This Week" tasks={groups.upcoming} />
          <TaskSection title="Later" tasks={groups.later} />
          <TaskSection title="No Due Date" tasks={groups.noDueDate} />
          <CompletedSection tasks={groups.completed} show={showCompleted} onToggle={() => setShowCompleted((s) => !s)} />
        </div>
      )}
    </div>
  )
}

function TaskSection({
  title,
  tasks,
  emphasize,
}: {
  title: string
  tasks: TaskWithProject[]
  emphasize?: string
}) {
  if (tasks.length === 0) return null

  return (
    <div>
      <h3 className={cn("mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground", emphasize)}>
        {title} ({tasks.length})
      </h3>
      <div className="overflow-hidden rounded-lg border">
        {tasks.map((task) => (
          <TaskRow key={task._id} task={task} emphasize={emphasize} />
        ))}
      </div>
    </div>
  )
}

function CompletedSection({
  tasks,
  show,
  onToggle,
}: {
  tasks: TaskWithProject[]
  show: boolean
  onToggle: () => void
}) {
  if (tasks.length === 0) return null

  return (
    <div>
      <button
        onClick={onToggle}
        className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {show ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Completed ({tasks.length})
      </button>
      {show && (
        <div className="overflow-hidden rounded-lg border">
          {tasks.map((task) => (
            <TaskRow key={task._id} task={task} completed />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task,
  emphasize,
  completed,
}: {
  task: TaskWithProject
  emphasize?: string
  completed?: boolean
}) {
  return (
    <Link
      href={`/projects/${task.projectId._id}/board?task=${task._id}`}
      className="flex items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-accent"
    >
      <span className={cn("flex-1 truncate", completed && "text-muted-foreground line-through")}>{task.title}</span>
      {task.priority !== "none" && <PriorityBadge priority={task.priority} />}
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.projectId.color }} />
        {task.projectId.name}
      </span>
      {task.dueDate && (
        <span className={cn("shrink-0 text-xs text-muted-foreground", emphasize)}>
          {format(new Date(task.dueDate), "MMM d")}
        </span>
      )}
    </Link>
  )
}
