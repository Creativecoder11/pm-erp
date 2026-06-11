"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import axios from "axios"
import { useSession } from "next-auth/react"
import { isPast, isToday, isTomorrow, isWithinInterval, addDays, format } from "date-fns"
import {
  ListChecks,
  CalendarClock,
  AlertCircle,
  CheckCircle2,
  FolderKanban,
  Plus,
  ArrowRight,
  History,
  CalendarDays,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { ProjectStatusBadge } from "@/components/shared/StatusBadge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { CompletionRing } from "@/components/shared/CompletionRing"
import { UserAvatar } from "@/components/shared/Avatar"
import { useProjectStore } from "@/store/projectStore"
import { cn, formatRelativeTime } from "@/lib/utils"
import type { IAuditLog, ITask, IUserSummary, TaskPriority } from "@/types"

type TaskWithProject = Omit<ITask, "projectId"> & {
  projectId: { _id: string; name: string; color: string }
}

type ActivityLog = Omit<IAuditLog, "actorId"> & { actorId: IUserSummary }

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
}

const ACTION_LABELS: Record<string, string> = {
  "task.created": "created a task",
  "task.updated": "updated a task",
  "task.deleted": "deleted a task",
  "task.attachment_added": "added an attachment to a task",
  "project.created": "created a project",
  "project.updated": "updated a project",
  "project.deleted": "deleted a project",
  "member.added": "added a member",
  "member.invited": "invited a member",
  "member.removed": "removed a member",
  "member.role_updated": "updated a member's role",
  "member.updated": "updated a member",
  "organization.updated": "updated the organization",
}

function humanizeAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  const [entity, verb] = action.split(".")
  if (!entity || !verb) return action
  const verbLabel = verb.replace(/_/g, " ")
  return `${verbLabel} a ${entity}`
}

function sortByPriority(tasks: TaskWithProject[]): TaskWithProject[] {
  return [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { projects, fetchProjects, isLoading: projectsLoading } = useProjectStore()
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
    axios
      .get("/api/tasks", { params: { assignee: "me", limit: 100 } })
      .then((res) => setTasks(res.data.data))
      .finally(() => setTasksLoading(false))
    axios
      .get("/api/audit-logs")
      .then((res) => setActivity(res.data.data))
      .finally(() => setActivityLoading(false))
  }, [fetchProjects])

  const stats = useMemo(() => {
    const now = new Date()
    const weekFromNow = addDays(now, 7)
    const open = tasks.filter((t) => !t.completedAt)
    const overdue = open.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)))
    const dueToday = open.filter((t) => t.dueDate && isToday(new Date(t.dueDate)))
    const completedThisWeek = tasks.filter(
      (t) => t.completedAt && isWithinInterval(new Date(t.completedAt), { start: addDays(now, -7), end: now })
    )
    const upcoming = open.filter(
      (t) =>
        t.dueDate &&
        !isToday(new Date(t.dueDate)) &&
        !isPast(new Date(t.dueDate)) &&
        isWithinInterval(new Date(t.dueDate), { start: now, end: weekFromNow })
    )
    const noDueDate = open.filter((t) => !t.dueDate)

    return { open, overdue, dueToday, completedThisWeek, upcoming, noDueDate }
  }, [tasks])

  const deadlineGroups = useMemo(() => {
    const now = new Date()
    const weekFromNow = addDays(now, 7)
    const upcoming = tasks.filter(
      (t) =>
        !t.completedAt &&
        t.dueDate &&
        isWithinInterval(new Date(t.dueDate), { start: now, end: weekFromNow })
    )

    const groups = new Map<string, { label: string; tasks: TaskWithProject[] }>()
    for (const task of sortByPriority(upcoming)) {
      const due = new Date(task.dueDate!)
      const label = isToday(due) ? "Today" : isTomorrow(due) ? "Tomorrow" : format(due, "EEE, MMM d")
      const key = format(due, "yyyy-MM-dd")
      const group = groups.get(key) ?? { label, tasks: [] }
      group.tasks.push(task)
      groups.set(key, group)
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, ...value }))
  }, [tasks])

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4)
  }, [projects])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }, [])

  const firstName = session?.user?.name?.split(" ")[0] ?? "there"

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="My Open Tasks" value={stats.open.length} />
        <StatCard icon={CalendarClock} label="Due Today" value={stats.dueToday.length} accent="text-blue-600" />
        <StatCard icon={AlertCircle} label="Overdue" value={stats.overdue.length} accent="text-red-600" />
        <StatCard
          icon={CheckCircle2}
          label="Completed This Week"
          value={stats.completedThisWeek.length}
          accent="text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>My Tasks</CardTitle>
            <Link href="/my-tasks" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <LoadingSpinner className="py-12" />
            ) : stats.open.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="You're all caught up"
                description="No open tasks assigned to you right now."
              />
            ) : (
              <div className="space-y-5">
                <TaskGroup title="Overdue" tasks={sortByPriority(stats.overdue)} emphasize="text-red-600" />
                <TaskGroup title="Due Today" tasks={sortByPriority(stats.dueToday)} emphasize="text-blue-600" />
                <TaskGroup title="Upcoming" tasks={sortByPriority(stats.upcoming)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming Deadlines</CardTitle>
            <Link href="/my-tasks" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <LoadingSpinner className="py-12" />
            ) : deadlineGroups.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Nothing due soon"
                description="No tasks due in the next 7 days."
              />
            ) : (
              <div className="space-y-4">
                {deadlineGroups.map((group) => (
                  <div key={group.key}>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{group.label}</h3>
                    <div className="space-y-1 border-l-2 pl-3">
                      {group.tasks.map((task) => (
                        <Link
                          key={task._id}
                          href={`/projects/${task.projectId._id}/board?task=${task._id}`}
                          className="flex items-center gap-2 rounded-md py-1 text-sm transition-colors hover:bg-accent"
                        >
                          <PriorityBadge priority={task.priority} />
                          <span className="flex-1 truncate">{task.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>My Projects</CardTitle>
            <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <LoadingSpinner className="py-12" />
            ) : projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Create your first project to get started."
                action={
                  <Link href="/projects/new">
                    <Button size="sm">
                      <Plus className="h-4 w-4" />
                      New Project
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recentProjects.map((project) => (
                  <Link
                    key={project._id}
                    href={`/projects/${project._id}/board`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <CompletionRing completionRate={project.completionRate ?? 0} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="truncate text-sm font-medium">{project.name}</span>
                        </div>
                        <ProjectStatusBadge status={project.status} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {project.completedTaskCount ?? 0}/{project.taskCount ?? 0} tasks
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <LoadingSpinner className="py-12" />
            ) : activity.length === 0 ? (
              <EmptyState
                icon={History}
                title="No recent activity"
                description="Activity across your organization will show up here."
              />
            ) : (
              <div className="space-y-3">
                {activity.map((log) => (
                  <div key={log._id} className="flex items-start gap-2.5">
                    <UserAvatar name={log.actorId?.name ?? "Unknown"} avatar={log.actorId?.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-tight">
                        <span className="font-medium">{log.actorId?.name ?? "Someone"}</span>{" "}
                        {humanizeAction(log.action)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: number
  accent?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted", accent)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function TaskGroup({ title, tasks, emphasize }: { title: string; tasks: TaskWithProject[]; emphasize?: string }) {
  if (tasks.length === 0) return null

  return (
    <div>
      <h3 className={cn("mb-2 text-xs font-semibold uppercase text-muted-foreground", emphasize)}>
        {title} ({tasks.length})
      </h3>
      <div className="space-y-1">
        {tasks.map((task) => (
          <Link
            key={task._id}
            href={`/projects/${task.projectId._id}/board?task=${task._id}`}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <PriorityBadge priority={task.priority} />
            <span className="flex-1 truncate">{task.title}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: task.projectId.color }}
              />
              {task.projectId.name}
            </span>
            {task.dueDate && (
              <span className={cn("text-xs text-muted-foreground", emphasize)}>
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}
