"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { isPast, isToday } from "date-fns"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { TaskStatusBadge } from "@/components/shared/TaskStatusBadge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { DatePicker } from "@/components/shared/DatePicker"
import { UserSelect } from "@/components/shared/UserSelect"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { useTaskStore } from "@/store/taskStore"
import { useProjectStore } from "@/store/projectStore"
import { useUIStore } from "@/store/uiStore"
import { cn, generateId } from "@/lib/utils"
import type { IProjectColumn, IProjectSection, ITaskWithUsers, TaskPriority } from "@/types"

interface ListViewProps {
  projectId: string
  columns: IProjectColumn[]
  sections: IProjectSection[]
}

type SortField = "title" | "dueDate" | "priority" | "estimatedHours"
type SortDirection = "asc" | "desc"
type GroupMode = "section" | "status" | "none" | "assignee" | "priority"

const PAGE_SIZE = 50

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

const UNASSIGNED_GROUP = "__unassigned__"

interface TaskGroup {
  key: string
  label: string
  tasks: ITaskWithUsers[]
}

export function ListView({ projectId, columns, sections }: ListViewProps) {
  const { tasks, isLoading, fetchTasks, updateTask, removeTask, addTask } = useTaskStore()
  const { updateProjectLocal } = useProjectStore()
  const { openTaskModal, celebrate } = useUIStore()

  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [groupMode, setGroupMode] = useState<GroupMode>("section")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [addingSubmitting, setAddingSubmitting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [addingSectionSubmitting, setAddingSectionSubmitting] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<IProjectSection | null>(null)
  const [deletingSectionSubmitting, setDeletingSectionSubmitting] = useState(false)

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns])
  const sortedSections = useMemo(() => [...sections].sort((a, b) => a.order - b.order), [sections])

  useEffect(() => {
    fetchTasks(projectId)
  }, [projectId, fetchTasks])

  const sortedTasks = useMemo(() => {
    if (!sortField) return tasks
    const dir = sortDirection === "asc" ? 1 : -1

    return [...tasks].sort((a, b) => {
      switch (sortField) {
        case "title":
          return a.title.localeCompare(b.title) * dir
        case "dueDate": {
          const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
          const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
          return (aTime - bTime) * dir
        }
        case "priority":
          return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * dir
        case "estimatedHours": {
          const aHours = a.estimatedHours ?? -1
          const bHours = b.estimatedHours ?? -1
          return (aHours - bHours) * dir
        }
        default:
          return 0
      }
    })
  }, [tasks, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageTasks = useMemo(
    () => sortedTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sortedTasks, currentPage]
  )

  const groups = useMemo<TaskGroup[]>(() => {
    if (groupMode === "none") {
      return [{ key: "all", label: "", tasks: pageTasks }]
    }

    if (groupMode === "section") {
      return sortedSections.map((s) => ({
        key: s.id,
        label: s.name,
        tasks: pageTasks.filter((t) => t.sectionId === s.id),
      }))
    }

    if (groupMode === "status") {
      return sortedColumns
        .map((col) => ({
          key: col.id,
          label: col.name,
          tasks: pageTasks.filter((t) => t.status === col.id),
        }))
        .filter((group) => group.tasks.length > 0)
    }

    if (groupMode === "priority") {
      return PRIORITY_OPTIONS.map((opt) => ({
        key: opt.value,
        label: opt.label,
        tasks: pageTasks.filter((t) => t.priority === opt.value),
      })).filter((group) => group.tasks.length > 0)
    }

    const byUser = new Map<string, TaskGroup>()
    const unassigned: ITaskWithUsers[] = []

    for (const task of pageTasks) {
      if (task.assignees.length === 0) {
        unassigned.push(task)
        continue
      }
      for (const assignee of task.assignees) {
        const existing = byUser.get(assignee._id)
        if (existing) {
          existing.tasks.push(task)
        } else {
          byUser.set(assignee._id, { key: assignee._id, label: assignee.name, tasks: [task] })
        }
      }
    }

    const result = Array.from(byUser.values()).sort((a, b) => a.label.localeCompare(b.label))
    if (unassigned.length > 0) {
      result.push({ key: UNASSIGNED_GROUP, label: "Unassigned", tasks: unassigned })
    }
    return result
  }, [groupMode, pageTasks, sortedColumns, sortedSections])

  const pageTaskIds = pageTasks.map((t) => t._id)
  const allPageSelected = pageTaskIds.length > 0 && pageTaskIds.every((id) => selectedIds.includes(id))
  const somePageSelected = pageTaskIds.some((id) => selectedIds.includes(id))

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setPage(1)
  }

  function toggleSelectAllOnPage() {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageTaskIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageTaskIds])))
    }
  }

  function toggleSelect(taskId: string) {
    setSelectedIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    )
  }

  async function patchTask(taskId: string, updates: Record<string, unknown>) {
    try {
      const res = await axios.put(`/api/tasks/${taskId}`, updates)
      updateTask(taskId, res.data.data)
    } catch {
      toast.error("Failed to update task")
    }
  }

  async function createTask(title: string, opts: { status?: string; sectionId?: string } = {}) {
    const res = await axios.post("/api/tasks", {
      title,
      projectId,
      ...opts,
      priority: "none",
      assignees: [],
      tags: [],
    })
    addTask(res.data.data)
  }

  async function handleAddTask() {
    const trimmed = newTaskTitle.trim()
    if (!trimmed) {
      setAddingTask(false)
      return
    }
    setAddingSubmitting(true)
    try {
      await createTask(trimmed, sortedSections[0] ? { sectionId: sortedSections[0].id } : {})
      setNewTaskTitle("")
      setAddingTask(false)
    } catch {
      toast.error("Failed to create task")
    } finally {
      setAddingSubmitting(false)
    }
  }

  async function handleAddTaskInSection(sectionId: string, title: string) {
    try {
      await createTask(title, { sectionId })
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
      const res = await axios.put(`/api/projects/${projectId}`, {
        sections: [...sortedSections, newSection],
      })
      updateProjectLocal(projectId, res.data.data)
      setNewSectionName("")
      setAddingSection(false)
    } catch {
      toast.error("Failed to add section")
    } finally {
      setAddingSectionSubmitting(false)
    }
  }

  async function handleRenameSection(sectionId: string, name: string) {
    const updatedSections = sortedSections.map((s) => (s.id === sectionId ? { ...s, name } : s))
    try {
      const res = await axios.put(`/api/projects/${projectId}`, { sections: updatedSections })
      updateProjectLocal(projectId, res.data.data)
    } catch {
      toast.error("Failed to rename section")
    }
  }

  function requestDeleteSection(section: IProjectSection) {
    const taskCount = tasks.filter((t) => t.sectionId === section.id).length
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
      const updatedSections = sortedSections.filter((s) => s.id !== sectionToDelete.id)
      const res = await axios.put(`/api/projects/${projectId}`, { sections: updatedSections })
      updateProjectLocal(projectId, res.data.data)
      setSectionToDelete(null)
    } catch {
      toast.error("Failed to delete section")
    } finally {
      setDeletingSectionSubmitting(false)
    }
  }

  async function handleBulkStatusChange(status: string) {
    const ids = [...selectedIds]
    try {
      await Promise.all(ids.map((id) => axios.put(`/api/tasks/${id}`, { status })))
      ids.forEach((id) => updateTask(id, { status }))
      toast.success(`Updated status for ${ids.length} task${ids.length === 1 ? "" : "s"}`)
      setSelectedIds([])
      const lastColumn = sortedColumns[sortedColumns.length - 1]
      if (lastColumn && status === lastColumn.id) celebrate()
    } catch {
      toast.error("Failed to update some tasks")
    }
  }

  async function handleBulkPriorityChange(priority: TaskPriority) {
    const ids = [...selectedIds]
    try {
      await Promise.all(ids.map((id) => axios.put(`/api/tasks/${id}`, { priority })))
      ids.forEach((id) => updateTask(id, { priority }))
      toast.success(`Updated priority for ${ids.length} task${ids.length === 1 ? "" : "s"}`)
      setSelectedIds([])
    } catch {
      toast.error("Failed to update some tasks")
    }
  }

  async function handleBulkAssign(userIds: string[]) {
    const ids = [...selectedIds]
    try {
      const responses = await Promise.all(
        ids.map((id) => axios.put(`/api/tasks/${id}`, { assignees: userIds }))
      )
      responses.forEach((res, i) => updateTask(ids[i], res.data.data))
      toast.success(`Updated assignees for ${ids.length} task${ids.length === 1 ? "" : "s"}`)
      setSelectedIds([])
    } catch {
      toast.error("Failed to update some tasks")
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds]
    setBulkSubmitting(true)
    try {
      await Promise.all(ids.map((id) => axios.delete(`/api/tasks/${id}`)))
      ids.forEach((id) => removeTask(id))
      toast.success(`Deleted ${ids.length} task${ids.length === 1 ? "" : "s"}`)
      setSelectedIds([])
      setConfirmBulkDelete(false)
    } catch {
      toast.error("Failed to delete some tasks")
    } finally {
      setBulkSubmitting(false)
    }
  }

  if (isLoading && tasks.length === 0) {
    return <LoadingSpinner className="py-24" />
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-muted-foreground">Group by</span>
          <Select
            value={groupMode}
            onValueChange={(value) => {
              if (!value) return
              setGroupMode(value as GroupMode)
              setPage(1)
            }}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="section">Section</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="assignee">Assignee</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {addingTask ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task name"
              className="h-8 w-56 text-sm"
              disabled={addingSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask()
                if (e.key === "Escape") {
                  setAddingTask(false)
                  setNewTaskTitle("")
                }
              }}
              onBlur={() => {
                if (!newTaskTitle.trim()) setAddingTask(false)
              }}
            />
            <Button size="icon-sm" variant="ghost" onClick={handleAddTask} disabled={addingSubmitting}>
              {addingSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setAddingTask(true)}>
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2.5 rounded-lg border bg-background px-3.5 py-2.5 shadow-sm">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>

          <Select value="" onValueChange={(value) => value && handleBulkStatusChange(value)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              {sortedColumns.map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  <TaskStatusBadge column={col} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value="" onValueChange={(value) => value && handleBulkPriorityChange(value as TaskPriority)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Change priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm">Assign</Button>} />
            <PopoverContent className="w-64">
              <UserSelect value={[]} onChange={handleBulkAssign} placeholder="Assign people" />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmBulkDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </div>
      )}

      {tasks.length === 0 && groupMode !== "section" ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Add a task to get started."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPageSelected}
                      indeterminate={!allPageSelected && somePageSelected}
                      onCheckedChange={toggleSelectAllOnPage}
                    />
                  </TableHead>
                  <SortableHead field="title" label="Title" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="min-w-48 px-3" />
                  <TableHead className="px-3">Assignees</TableHead>
                  <SortableHead field="dueDate" label="Due date" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="px-3" />
                  <SortableHead field="priority" label="Priority" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="px-3" />
                  <TableHead className="px-3">Status</TableHead>
                  <SortableHead field="estimatedHours" label="Est. hours" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) =>
                  groupMode === "section" ? (
                    <SectionGroup
                      key={group.key}
                      group={group}
                      columns={sortedColumns}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onTaskClick={openTaskModal}
                      onPatch={patchTask}
                      collapsed={collapsedSections.has(group.key)}
                      onToggleCollapse={() => toggleSectionCollapse(group.key)}
                      onAddTask={(title) => handleAddTaskInSection(group.key, title)}
                      onRename={(name) => handleRenameSection(group.key, name)}
                      onRequestDelete={() => {
                        const section = sortedSections.find((s) => s.id === group.key)
                        if (section) requestDeleteSection(section)
                      }}
                    />
                  ) : (
                    <GroupRows
                      key={group.key}
                      group={group}
                      showGroupHeader={groupMode !== "none"}
                      columns={sortedColumns}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onTaskClick={openTaskModal}
                      onPatch={patchTask}
                    />
                  )
                )}
              </TableBody>
            </Table>

            {groupMode === "section" && (
              <div className="border-t p-3">
                {addingSection ? (
                  <div className="flex items-center gap-1.5">
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
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {sortedTasks.length} task{sortedTasks.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title="Delete tasks"
        description={`This will permanently delete ${selectedIds.length} task${selectedIds.length === 1 ? "" : "s"}. This action cannot be undone.`}
        confirmLabel={bulkSubmitting ? "Deleting..." : "Delete"}
        destructive
        onConfirm={handleBulkDelete}
      />

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
    </div>
  )
}

function SortableHead({
  field,
  label,
  sortField,
  sortDirection,
  onSort,
  className,
}: {
  field: SortField
  label: string
  sortField: SortField | null
  sortDirection: SortDirection
  onSort: (field: SortField) => void
  className?: string
}) {
  const active = sortField === field
  const Icon = active ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <TableHead className={className}>
      <button
        className="flex items-center gap-1 font-medium hover:text-foreground"
        onClick={() => onSort(field)}
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", active ? "opacity-100" : "opacity-40")} />
      </button>
    </TableHead>
  )
}

function GroupRows({
  group,
  showGroupHeader,
  columns,
  selectedIds,
  onToggleSelect,
  onTaskClick,
  onPatch,
}: {
  group: TaskGroup
  showGroupHeader: boolean
  columns: IProjectColumn[]
  selectedIds: string[]
  onToggleSelect: (taskId: string) => void
  onTaskClick: (taskId: string) => void
  onPatch: (taskId: string, updates: Record<string, unknown>) => Promise<void>
}) {
  return (
    <>
      {showGroupHeader && (
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableCell colSpan={7} className="px-3 py-2 text-xs font-semibold text-muted-foreground">
            {group.label} ({group.tasks.length})
          </TableCell>
        </TableRow>
      )}
      {group.tasks.map((task) => (
        <TaskRow
          key={task._id}
          task={task}
          columns={columns}
          selected={selectedIds.includes(task._id)}
          onToggleSelect={() => onToggleSelect(task._id)}
          onClick={() => onTaskClick(task._id)}
          onPatch={onPatch}
        />
      ))}
    </>
  )
}

function SectionGroup({
  group,
  columns,
  selectedIds,
  onToggleSelect,
  onTaskClick,
  onPatch,
  collapsed,
  onToggleCollapse,
  onAddTask,
  onRename,
  onRequestDelete,
}: {
  group: TaskGroup
  columns: IProjectColumn[]
  selectedIds: string[]
  onToggleSelect: (taskId: string) => void
  onTaskClick: (taskId: string) => void
  onPatch: (taskId: string, updates: Record<string, unknown>) => Promise<void>
  collapsed: boolean
  onToggleCollapse: () => void
  onAddTask: (title: string) => Promise<void>
  onRename: (name: string) => void
  onRequestDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(group.label)

  function saveRename() {
    setEditing(false)
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === group.label) {
      setNameDraft(group.label)
      return
    }
    onRename(trimmed)
  }

  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={7} className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
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
                      setNameDraft(group.label)
                      setEditing(false)
                    }
                  }}
                  className="h-7 w-48 text-sm font-semibold"
                />
              ) : (
                <span className="font-heading tracking-tight">
                  {group.label}{" "}
                  <span className="font-sans font-normal tracking-normal text-muted-foreground">
                    {group.tasks.filter((t) => t.completedAt).length}/{group.tasks.length}
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
          {group.tasks.map((task) => (
            <TaskRow
              key={task._id}
              task={task}
              columns={columns}
              selected={selectedIds.includes(task._id)}
              onToggleSelect={() => onToggleSelect(task._id)}
              onClick={() => onTaskClick(task._id)}
              onPatch={onPatch}
            />
          ))}
          <AddTaskRow onAdd={onAddTask} />
        </>
      )}
    </>
  )
}

function AddTaskRow({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }
    setSubmitting(true)
    try {
      await onAdd(trimmed)
      setTitle("")
      setAdding(false)
    } catch {
      // keep the input open so the user can retry
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={7} className="px-3 py-1.5">
        {adding ? (
          <div className="flex items-center gap-1.5">
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
              onBlur={() => {
                if (!title.trim()) setAdding(false)
              }}
            />
            <Button size="icon-sm" variant="ghost" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            onClick={() => setAdding(true)}
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
  columns,
  selected,
  onToggleSelect,
  onClick,
  onPatch,
}: {
  task: ITaskWithUsers
  columns: IProjectColumn[]
  selected: boolean
  onToggleSelect: () => void
  onClick: () => void
  onPatch: (taskId: string, updates: Record<string, unknown>) => Promise<void>
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [hoursDraft, setHoursDraft] = useState(task.estimatedHours?.toString() ?? "")
  const [editingHours, setEditingHours] = useState(false)
  const celebrate = useUIStore((s) => s.celebrate)
  const currentColumn = columns.find((c) => c.id === task.status)

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

  function saveHours() {
    setEditingHours(false)
    const trimmed = hoursDraft.trim()
    const value = trimmed === "" ? null : Number(trimmed)
    if (value !== null && Number.isNaN(value)) {
      setHoursDraft(task.estimatedHours?.toString() ?? "")
      return
    }
    if (value === (task.estimatedHours ?? null)) return
    onPatch(task._id, { estimatedHours: value })
  }

  return (
    <TableRow data-state={selected ? "selected" : undefined} className="cursor-pointer" onClick={onClick}>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
      </TableCell>

      <TableCell className="px-3 py-2">
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

      <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <UserSelect
          value={task.assignees.map((a) => a._id)}
          knownUsers={task.assignees}
          onChange={(ids) => onPatch(task._id, { assignees: ids })}
          placeholder="Assign"
          className="h-8 w-fit border-none bg-transparent px-0 shadow-none hover:bg-accent"
        />
      </TableCell>

      <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <DatePicker
          value={task.dueDate ? new Date(task.dueDate) : null}
          onChange={(date) =>
            onPatch(task._id, { dueDate: date ? date.toISOString() : null })
          }
          placeholder="No date"
          className={cn(
            "h-8 w-36 border-none bg-transparent px-1 shadow-none hover:bg-accent",
            isOverdue && "text-red-600 dark:text-red-400",
            isDueToday && "text-blue-600 dark:text-blue-400"
          )}
        />
      </TableCell>

      <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <Select
          value={task.priority}
          onValueChange={(value) => value && onPatch(task._id, { priority: value })}
        >
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

      <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <Select
          value={task.status}
          onValueChange={(value) => {
            if (!value) return
            onPatch(task._id, { status: value })
            const lastColumn = columns[columns.length - 1]
            if (lastColumn && value === lastColumn.id && task.status !== lastColumn.id) {
              celebrate()
            }
          }}
        >
          <SelectTrigger size="sm" className="w-36 border-none bg-transparent shadow-none hover:bg-accent">
            <SelectValue>
              {currentColumn && <TaskStatusBadge column={currentColumn} />}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {columns.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                <TaskStatusBadge column={col} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        {editingHours ? (
          <Input
            autoFocus
            type="number"
            min={0}
            value={hoursDraft}
            onChange={(e) => setHoursDraft(e.target.value)}
            onBlur={saveHours}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
              if (e.key === "Escape") {
                setHoursDraft(task.estimatedHours?.toString() ?? "")
                setEditingHours(false)
              }
            }}
            className="h-8 w-20 text-sm"
          />
        ) : (
          <span
            className="block w-20 cursor-text text-sm"
            onClick={(e) => {
              e.stopPropagation()
              setEditingHours(true)
            }}
          >
            {task.estimatedHours ?? "—"}
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}
