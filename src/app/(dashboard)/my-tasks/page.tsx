"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import axios from "axios"
import { useSession } from "next-auth/react"
import { isPast, isToday } from "date-fns"
import { toast } from "sonner"
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { TaskDetailModal } from "@/components/kanban/TaskDetailModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProjectStore } from "@/store/projectStore"
import { useUIStore } from "@/store/uiStore"
import { cn, generateId } from "@/lib/utils"
import type { IProject, IProjectColumn, IProjectSection, ITaskWithUsers, TaskPriority } from "@/types"

type ProjectInfo = { _id: string; name: string; color: string; columns: IProjectColumn[] }
type TaskWithProject = Omit<ITaskWithUsers, "projectId"> & { projectId: ProjectInfo }

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

async function fetchMyTasksData() {
  const [tasksRes, sectionsRes] = await Promise.all([
    axios.get("/api/tasks", { params: { assignee: "me", limit: 200 } }),
    axios.get("/api/users/me/sections"),
  ])
  return {
    tasks: tasksRes.data.data as TaskWithProject[],
    sections: sectionsRes.data.data as IProjectSection[],
  }
}

export default function MyTasksPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id ?? ""
  const { projects, fetchProjects, fetchProject } = useProjectStore()
  const { openTaskModal, activeTaskId, celebrate } = useUIStore()

  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [sections, setSections] = useState<IProjectSection[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [addingSectionSubmitting, setAddingSectionSubmitting] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<IProjectSection | null>(null)
  const [deletingSectionSubmitting, setDeletingSectionSubmitting] = useState(false)

  const sortedSections = useMemo(() => [...sections].sort((a, b) => a.order - b.order), [sections])

  useEffect(() => {
    async function load() {
      try {
        const { tasks, sections } = await fetchMyTasksData()
        setTasks(tasks)
        setSections(sections)
      } catch {
        toast.error("Failed to load tasks")
      } finally {
        setLoading(false)
      }
    }
    load()
    fetchProjects()
  }, [fetchProjects])

  // Refresh tasks after the task detail modal is closed, since edits made
  // there (status, assignees, etc.) aren't reflected in our local state.
  const prevActiveTaskIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (prevActiveTaskIdRef.current && !activeTaskId) {
      fetchMyTasksData()
        .then(({ tasks, sections }) => {
          setTasks(tasks)
          setSections(sections)
        })
        .catch(() => toast.error("Failed to load tasks"))
    }
    prevActiveTaskIdRef.current = activeTaskId
  }, [activeTaskId])

  function getTaskSectionId(task: TaskWithProject): string {
    return task.myTasksSections?.[userId] ?? sortedSections[0]?.id ?? ""
  }

  const groups = useMemo(
    () =>
      sortedSections.map((section) => ({
        section,
        tasks: tasks.filter((t) => getTaskSectionId(t) === section.id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, sortedSections, userId]
  )

  async function patchTask(taskId: string, updates: Record<string, unknown>) {
    try {
      const res = await axios.put(`/api/tasks/${taskId}`, updates)
      const updated = res.data.data as ITaskWithUsers
      const normalized = { ...updated, completedAt: updated.completedAt ?? undefined }
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, ...normalized, projectId: t.projectId } : t))
      )
    } catch {
      toast.error("Failed to update task")
    }
  }

  function toggleComplete(task: TaskWithProject) {
    const sortedColumns = [...task.projectId.columns].sort((a, b) => a.order - b.order)
    const firstColumn = sortedColumns[0]
    const lastColumn = sortedColumns[sortedColumns.length - 1]
    const isComplete = !!task.completedAt
    const target = isComplete ? firstColumn : lastColumn
    if (!target) return
    patchTask(task._id, { status: target.id })
    if (!isComplete) celebrate()
  }

  async function handleTaskClick(task: TaskWithProject) {
    await fetchProject(task.projectId._id)
    openTaskModal(task._id)
  }

  async function handleAddTaskInSection(sectionId: string, title: string, projectId: string) {
    try {
      const res = await axios.post("/api/tasks", {
        title,
        projectId,
        priority: "none",
        assignees: userId ? [userId] : [],
        tags: [],
        myTasksSectionId: sectionId,
      })
      const created = res.data.data as ITaskWithUsers
      const project = projects.find((p) => p._id === projectId)
      if (!project) return
      const withProject: TaskWithProject = {
        ...created,
        projectId: { _id: project._id, name: project.name, color: project.color, columns: project.columns },
      }
      setTasks((prev) => [...prev, withProject])
    } catch {
      toast.error("Failed to create task")
      throw new Error("Failed to create task")
    }
  }

  function toggleSectionCollapse(key: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleAddSection() {
    const trimmed = newSectionName.trim()
    if (!trimmed) {
      setAddingSection(false)
      return
    }
    setAddingSectionSubmitting(true)
    try {
      const newSection: IProjectSection = {
        id: generateId("section"),
        name: trimmed,
        order: sortedSections.length,
      }
      const res = await axios.put("/api/users/me/sections", { sections: [...sortedSections, newSection] })
      setSections(res.data.data)
      setNewSectionName("")
      setAddingSection(false)
    } catch {
      toast.error("Failed to add section")
    } finally {
      setAddingSectionSubmitting(false)
    }
  }

  async function handleRenameSection(sectionId: string, name: string) {
    const updated = sortedSections.map((s) => (s.id === sectionId ? { ...s, name } : s))
    try {
      const res = await axios.put("/api/users/me/sections", { sections: updated })
      setSections(res.data.data)
    } catch {
      toast.error("Failed to rename section")
    }
  }

  function requestDeleteSection(section: IProjectSection) {
    const taskCount = tasks.filter((t) => getTaskSectionId(t) === section.id).length
    if (taskCount > 0) {
      toast.error("Move or delete all tasks in this section before deleting it")
      return
    }
    setSectionToDelete(section)
  }

  async function handleDeleteSection() {
    if (!sectionToDelete) return
    setDeletingSectionSubmitting(true)
    try {
      const updated = sortedSections.filter((s) => s.id !== sectionToDelete.id)
      const res = await axios.put("/api/users/me/sections", { sections: updated })
      setSections(res.data.data)
      setSectionToDelete(null)
    } catch {
      toast.error("Failed to delete section")
    } finally {
      setDeletingSectionSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner className="py-24" />
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
        <p className="text-sm text-muted-foreground">
          {tasks.filter((t) => !t.completedAt).length} open task
          {tasks.filter((t) => !t.completedAt).length === 1 ? "" : "s"} assigned to you
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead className="min-w-48">Name</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Section</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <SectionGroup
                key={group.section.id}
                section={group.section}
                tasks={group.tasks}
                sections={sortedSections}
                projects={projects}
                collapsed={collapsedSections.has(group.section.id)}
                onToggleCollapse={() => toggleSectionCollapse(group.section.id)}
                onAddTask={(title, projectId) => handleAddTaskInSection(group.section.id, title, projectId)}
                onRename={(name) => handleRenameSection(group.section.id, name)}
                onRequestDelete={() => requestDeleteSection(group.section)}
                onPatch={patchTask}
                onToggleComplete={toggleComplete}
                onTaskClick={handleTaskClick}
              />
            ))}
          </TableBody>
        </Table>

        <div className="border-t p-2">
          {addingSection ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Section name"
                className="h-8 w-56 text-sm"
                disabled={addingSectionSubmitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSection()
                  if (e.key === "Escape") {
                    setAddingSection(false)
                    setNewSectionName("")
                  }
                }}
                onBlur={() => {
                  if (!newSectionName.trim()) setAddingSection(false)
                }}
              />
              <Button size="icon-sm" variant="ghost" onClick={handleAddSection} disabled={addingSectionSubmitting}>
                {addingSectionSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
              onClick={() => setAddingSection(true)}
            >
              <Plus className="h-4 w-4" />
              Add section
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!sectionToDelete}
        onOpenChange={(open) => {
          if (!open) setSectionToDelete(null)
        }}
        title="Delete section"
        description={`This will permanently delete the "${sectionToDelete?.name}" section. This action cannot be undone.`}
        confirmLabel={deletingSectionSubmitting ? "Deleting..." : "Delete"}
        destructive
        onConfirm={handleDeleteSection}
      />

      <TaskDetailModal />
    </div>
  )
}

function SectionGroup({
  section,
  tasks,
  sections,
  projects,
  collapsed,
  onToggleCollapse,
  onAddTask,
  onRename,
  onRequestDelete,
  onPatch,
  onToggleComplete,
  onTaskClick,
}: {
  section: IProjectSection
  tasks: TaskWithProject[]
  sections: IProjectSection[]
  projects: IProject[]
  collapsed: boolean
  onToggleCollapse: () => void
  onAddTask: (title: string, projectId: string) => Promise<void>
  onRename: (name: string) => void
  onRequestDelete: () => void
  onPatch: (taskId: string, updates: Record<string, unknown>) => Promise<void>
  onToggleComplete: (task: TaskWithProject) => void
  onTaskClick: (task: TaskWithProject) => void
}) {
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(section.name)

  function saveRename() {
    setEditing(false)
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === section.name) {
      setNameDraft(section.name)
      return
    }
    onRename(trimmed)
  }

  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={6} className="py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <button onClick={onToggleCollapse} className="shrink-0 text-muted-foreground hover:text-foreground">
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <span className="icon-chip h-6 w-6 rounded-md">
                <Layers className="h-3.5 w-3.5" />
              </span>
              {editing ? (
                <Input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                    if (e.key === "Escape") {
                      setNameDraft(section.name)
                      setEditing(false)
                    }
                  }}
                  className="h-7 w-48 text-sm font-semibold"
                />
              ) : (
                <span className="font-heading tracking-tight">
                  {section.name}{" "}
                  <span className="font-sans font-normal tracking-normal text-muted-foreground">
                    {tasks.filter((t) => t.completedAt).length}/{tasks.length}
                  </span>
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  Rename section
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onRequestDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
      {!collapsed && (
        <>
          {tasks.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-1 text-sm text-muted-foreground">
                No tasks in this section.
              </TableCell>
            </TableRow>
          )}
          {tasks.map((task) => (
            <TaskRow
              key={task._id}
              task={task}
              sections={sections}
              currentSectionId={section.id}
              onPatch={onPatch}
              onToggleComplete={() => onToggleComplete(task)}
              onClick={() => onTaskClick(task)}
            />
          ))}
          <AddTaskRow projects={projects} onAdd={onAddTask} />
        </>
      )}
    </>
  )
}

function AddTaskRow({
  projects,
  onAdd,
}: {
  projects: IProject[]
  onAdd: (title: string, projectId: string) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [projectId, setProjectId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function startAdding() {
    setAdding(true)
    if (!projectId && projects.length > 0) setProjectId(projects[0]._id)
  }

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed || !projectId) {
      setAdding(false)
      return
    }
    setSubmitting(true)
    try {
      await onAdd(trimmed, projectId)
      setTitle("")
      setAdding(false)
    } catch {
      // keep the input open so the user can retry
    } finally {
      setSubmitting(false)
    }
  }

  if (projects.length === 0) return null

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={6} className="py-1">
        {adding ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Write a task name"
              className="h-8 max-w-sm text-sm"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
                if (e.key === "Escape") {
                  setAdding(false)
                  setTitle("")
                }
              }}
            />
            <Select value={projectId} onValueChange={(value) => value && setProjectId(value)}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon-sm" variant="ghost" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            onClick={startAdding}
          >
            <Plus className="h-4 w-4" />
            Add task...
          </button>
        )}
      </TableCell>
    </TableRow>
  )
}

function TaskRow({
  task,
  sections,
  currentSectionId,
  onPatch,
  onToggleComplete,
  onClick,
}: {
  task: TaskWithProject
  sections: IProjectSection[]
  currentSectionId: string
  onPatch: (taskId: string, updates: Record<string, unknown>) => Promise<void>
  onToggleComplete: () => void
  onClick: () => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)

  const isOverdue =
    !!task.dueDate && !task.completedAt && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
  const isDueToday = !!task.dueDate && !task.completedAt && isToday(new Date(task.dueDate))

  function saveTitle() {
    setEditingTitle(false)
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === task.title) {
      setTitleDraft(task.title)
      return
    }
    onPatch(task._id, { title: trimmed })
  }

  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={!!task.completedAt} onCheckedChange={onToggleComplete} />
      </TableCell>

      <TableCell>
        {editingTitle ? (
          <Input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
              if (e.key === "Escape") {
                setTitleDraft(task.title)
                setEditingTitle(false)
              }
            }}
            className="field-sizing-content h-8 w-auto min-w-12 max-w-xs text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={cn(
              "block max-w-xs cursor-text truncate whitespace-normal",
              task.completedAt && "text-muted-foreground line-through"
            )}
            onClick={(e) => {
              e.stopPropagation()
              setEditingTitle(true)
            }}
          >
            {task.title}
          </span>
        )}
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/projects/${task.projectId._id}/list`}
          className="flex w-fit items-center gap-1.5 rounded-md px-1 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: task.projectId.color }} />
          {task.projectId.name}
        </Link>
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <DatePicker
          value={task.dueDate ? new Date(task.dueDate) : null}
          onChange={(date) => onPatch(task._id, { dueDate: date ? date.toISOString() : null })}
          placeholder="No date"
          className={cn(
            "h-8 w-36 border-none bg-transparent px-1 shadow-none hover:bg-accent",
            isOverdue && "text-red-600 dark:text-red-400",
            isDueToday && "text-blue-600 dark:text-blue-400"
          )}
        />
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select value={task.priority} onValueChange={(value) => value && onPatch(task._id, { priority: value })}>
          <SelectTrigger size="sm" className="w-32 border-none bg-transparent shadow-none hover:bg-accent">
            <SelectValue>
              <PriorityBadge priority={task.priority} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select
          value={currentSectionId}
          onValueChange={(value) => value && onPatch(task._id, { myTasksSectionId: value })}
        >
          <SelectTrigger size="sm" className="w-36 border-none bg-transparent shadow-none hover:bg-accent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  )
}
