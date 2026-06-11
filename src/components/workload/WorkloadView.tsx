"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { toast } from "sonner"
import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isWeekend,
  startOfDay,
} from "date-fns"
import { ArrowRightLeft, Users } from "lucide-react"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { UserAvatar } from "@/components/shared/Avatar"
import { UserSelect } from "@/components/shared/UserSelect"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useUIStore } from "@/store/uiStore"
import { useProjectStore } from "@/store/projectStore"
import { cn } from "@/lib/utils"
import type { IProjectMember, IUserSummary, TaskPriority } from "@/types"

const DAILY_CAPACITY = 8

interface WorkloadMember {
  userId: string
  name: string
  avatar?: string
}

interface WorkloadTask {
  _id: string
  title: string
  status: string
  priority: string
  assignees: string[]
  dueDate: string | null
  estimatedHours: number | null
}

interface WorkloadViewProps {
  projectId: string
  startDate: Date
  endDate: Date
}

type PopulatedMember = Omit<IProjectMember, "userId"> & { userId: IUserSummary }

export function WorkloadView({ projectId, startDate, endDate }: WorkloadViewProps) {
  const [members, setMembers] = useState<WorkloadMember[]>([])
  const [tasks, setTasks] = useState<WorkloadTask[]>([])
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState("")
  const [reassignTarget, setReassignTarget] = useState<{
    userId: string
    dateKey: string
    tasks: WorkloadTask[]
  } | null>(null)
  const [reassignTo, setReassignTo] = useState<string[]>([])
  const [reassigning, setReassigning] = useState(false)
  const [cellDialog, setCellDialog] = useState<{ tasks: WorkloadTask[]; label: string } | null>(null)
  const { openTaskModal } = useUIStore()
  const { currentProject } = useProjectStore()

  useEffect(() => {
    axios
      .get("/api/reports/workload", { params: { projectId } })
      .then((res) => {
        setMembers(res.data.data.members)
        setTasks(res.data.data.tasks)
      })
      .finally(() => setLoadedProjectId(projectId))
  }, [projectId])

  const loading = loadedProjectId !== projectId

  const memberRoles = useMemo(() => {
    const map = new Map<string, string>()
    if (currentProject && currentProject._id === projectId) {
      const populated = currentProject.members as unknown as PopulatedMember[]
      for (const m of populated) {
        const id = typeof m.userId === "string" ? m.userId : m.userId?._id
        if (id) map.set(id, m.role)
      }
    }
    return map
  }, [currentProject, projectId])

  const days = useMemo(() => {
    const start = startOfDay(startDate)
    const end = startOfDay(endDate)
    const length = Math.max(1, differenceInCalendarDays(end, start) + 1)
    return Array.from({ length }, (_, i) => addDays(start, i))
  }, [startDate, endDate])

  const workdayCount = useMemo(() => days.filter((d) => !isWeekend(d)).length || days.length, [days])

  const grid = useMemo(() => {
    const map = new Map<
      string,
      { hours: Map<string, number>; tasks: Map<string, WorkloadTask[]>; unscheduled: WorkloadTask[] }
    >()
    for (const m of members) {
      map.set(m.userId, { hours: new Map(), tasks: new Map(), unscheduled: [] })
    }
    for (const task of tasks) {
      for (const userId of task.assignees) {
        const entry = map.get(userId)
        if (!entry) continue
        if (!task.dueDate) {
          entry.unscheduled.push(task)
          continue
        }
        const key = format(startOfDay(new Date(task.dueDate)), "yyyy-MM-dd")
        const hours = task.estimatedHours ?? 1
        entry.hours.set(key, (entry.hours.get(key) ?? 0) + hours)
        const list = entry.tasks.get(key) ?? []
        list.push(task)
        entry.tasks.set(key, list)
      }
    }
    return map
  }, [members, tasks])

  const visibleMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    if (!query) return members
    return members.filter((m) => m.name.toLowerCase().includes(query))
  }, [members, memberSearch])

  function memberStats(member: WorkloadMember) {
    const entry = grid.get(member.userId)
    let totalTasks = 0
    let totalHours = 0
    if (entry) {
      const seen = new Set<string>()
      for (const day of days) {
        const key = format(day, "yyyy-MM-dd")
        totalHours += entry.hours.get(key) ?? 0
        for (const t of entry.tasks.get(key) ?? []) {
          if (!seen.has(t._id)) {
            seen.add(t._id)
            totalTasks += 1
          }
        }
      }
    }
    const capacity = workdayCount * DAILY_CAPACITY
    const capacityPct = capacity > 0 ? Math.round((totalHours / capacity) * 100) : 0
    return { totalTasks, totalHours, capacityPct }
  }

  function capacityColorClass(pct: number) {
    if (pct > 100) return "bg-red-500"
    if (pct >= 75) return "bg-amber-500"
    return "bg-emerald-500"
  }

  function openReassign(member: WorkloadMember, dateKey: string, dayTasks: WorkloadTask[]) {
    setReassignTo([])
    setReassignTarget({ userId: member.userId, dateKey, tasks: dayTasks })
  }

  async function confirmReassign() {
    if (!reassignTarget || reassignTo.length === 0) return
    const targetUserId = reassignTo[0]
    const fromUserId = reassignTarget.userId

    setReassigning(true)
    try {
      await Promise.all(
        reassignTarget.tasks
          .filter((t) => t.assignees.includes(fromUserId))
          .map((t) => {
            const newAssignees = t.assignees.map((a) => (a === fromUserId ? targetUserId : a))
            return axios.put(`/api/tasks/${t._id}`, { assignees: Array.from(new Set(newAssignees)) })
          })
      )

      setTasks((prev) =>
        prev.map((t) => {
          if (!reassignTarget.tasks.some((rt) => rt._id === t._id)) return t
          if (!t.assignees.includes(fromUserId)) return t
          const newAssignees = t.assignees.map((a) => (a === fromUserId ? targetUserId : a))
          return { ...t, assignees: Array.from(new Set(newAssignees)) }
        })
      )

      toast.success("Tasks reassigned")
      setReassignTarget(null)
    } catch {
      toast.error("Failed to reassign tasks")
    } finally {
      setReassigning(false)
    }
  }

  if (loading) {
    return <LoadingSpinner className="py-24" />
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team members"
        description="Add members to this project to plan their workload."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          placeholder="Filter by member name..."
          className="h-8 w-56 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 w-64 bg-muted/40 p-3 text-left font-medium">Member</th>
              {days.map((day) => (
                <th
                  key={day.toISOString()}
                  className={cn(
                    "w-16 p-2 text-center text-xs font-medium text-muted-foreground",
                    isToday(day) && "text-primary"
                  )}
                >
                  <div>{format(day, "EEE")}</div>
                  <div>{format(day, "MMM d")}</div>
                </th>
              ))}
              <th className="w-20 p-2 text-center text-xs font-medium text-muted-foreground">No date</th>
            </tr>
          </thead>
          <tbody>
            {visibleMembers.map((member) => {
              const entry = grid.get(member.userId)!
              const stats = memberStats(member)
              const role = memberRoles.get(member.userId)
              return (
                <tr key={member.userId} className="border-b last:border-b-0">
                  <td className="sticky left-0 z-10 bg-background p-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={member.name} avatar={member.avatar} size="sm" />
                        <span className="truncate font-medium">{member.name}</span>
                        {role && (
                          <Badge variant="outline" className="capitalize">
                            {role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full transition-all", capacityColorClass(stats.capacityPct))}
                            style={{ width: `${Math.min(100, stats.capacityPct)}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {stats.capacityPct}% &middot; {stats.totalTasks} task{stats.totalTasks === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  </td>
                  {days.map((day) => {
                    const key = format(day, "yyyy-MM-dd")
                    const hours = entry.hours.get(key) ?? 0
                    const dayTasks = entry.tasks.get(key) ?? []
                    const overloaded = hours > DAILY_CAPACITY
                    return (
                      <td key={key} className="p-1.5 text-center align-top">
                        {hours > 0 && (
                          <div className="group relative">
                            <button
                              onClick={() => {
                                if (dayTasks.length === 1) {
                                  openTaskModal(dayTasks[0]._id)
                                } else {
                                  setCellDialog({ tasks: dayTasks, label: format(day, "EEEE, MMM d") })
                                }
                              }}
                              title={dayTasks.map((t) => t.title).join(", ")}
                              className={cn(
                                "flex w-full flex-col items-center gap-0.5 rounded-md px-1 py-1 text-xs font-semibold transition-opacity hover:opacity-80",
                                overloaded
                                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                                  : hours >= DAILY_CAPACITY * 0.75
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                              )}
                            >
                              <span>{hours}h</span>
                              <span className="text-[10px] font-normal opacity-75">
                                {dayTasks.length} task{dayTasks.length === 1 ? "" : "s"}
                              </span>
                            </button>
                            {overloaded && (
                              <Popover
                                open={reassignTarget?.userId === member.userId && reassignTarget?.dateKey === key}
                                onOpenChange={(open) => {
                                  if (!open) setReassignTarget(null)
                                }}
                              >
                                <PopoverTrigger
                                  render={
                                    <button
                                      title="Reassign overloaded tasks"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openReassign(member, key, dayTasks)
                                      }}
                                      className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                                    >
                                      <ArrowRightLeft className="h-2.5 w-2.5" />
                                    </button>
                                  }
                                />

                                <PopoverContent className="w-72" align="center">
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-sm font-medium">Reassign tasks</p>
                                      <p className="text-xs text-muted-foreground">
                                        Move {dayTasks.length} task{dayTasks.length === 1 ? "" : "s"} from{" "}
                                        {member.name} on {format(day, "MMM d")} to another member.
                                      </p>
                                    </div>
                                    <UserSelect
                                      value={reassignTo}
                                      onChange={setReassignTo}
                                      multiple={false}
                                      placeholder="Select new assignee"
                                    />
                                    <Button
                                      size="sm"
                                      className="w-full"
                                      disabled={reassignTo.length === 0 || reassigning}
                                      onClick={confirmReassign}
                                    >
                                      {reassigning ? "Reassigning..." : "Confirm reassign"}
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td className="p-1.5 text-center align-top">
                    {entry.unscheduled.length > 0 && (
                      <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                        {entry.unscheduled.length}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={cellDialog !== null} onOpenChange={(open) => !open && setCellDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tasks for {cellDialog?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {cellDialog?.tasks.map((task) => (
              <button
                key={task._id}
                onClick={() => {
                  openTaskModal(task._id)
                  setCellDialog(null)
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <PriorityBadge priority={task.priority as TaskPriority} />
                <span className="flex-1 truncate">{task.title}</span>
                {task.estimatedHours != null && (
                  <span className="shrink-0 text-xs text-muted-foreground">{task.estimatedHours}h</span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
