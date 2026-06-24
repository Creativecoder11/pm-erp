"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import axios from "axios"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  Activity,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Trash2,
  X,
  Pencil,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DatePicker } from "@/components/shared/DatePicker"
import { UserSelect } from "@/components/shared/UserSelect"
import { TaskStatusBadge } from "@/components/shared/TaskStatusBadge"
import { UserAvatar } from "@/components/shared/Avatar"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { MarkdownContent } from "@/components/shared/MarkdownContent"
import { UploadButton } from "@/lib/uploadthing"
import { useUIStore } from "@/store/uiStore"
import { useTaskStore } from "@/store/taskStore"
import { useProjectStore } from "@/store/projectStore"
import { cn, formatBytes, formatRelativeTime, generateId } from "@/lib/utils"
import type {
  IComment,
  IProjectMember,
  ITaskAttachment,
  ITaskSubtask,
  ITaskWithUsers,
  IUserSummary,
  DependencyType,
} from "@/types"

type PopulatedComment = Omit<IComment, "authorId" | "mentions"> & {
  authorId: IUserSummary
  mentions: IUserSummary[]
}

type PopulatedDependency = {
  taskId: { _id: string; title: string; status: string }
  type: DependencyType
}

type DetailTask = Omit<ITaskWithUsers, "dependencies"> & { dependencies: PopulatedDependency[] }

type PopulatedMember = Omit<IProjectMember, "userId"> & { userId: IUserSummary }

interface ActivityEntry {
  _id: string
  action: string
  actorId: IUserSummary
  createdAt: string
}

const DEPENDENCY_LABELS: Record<DependencyType, string> = {
  blocks: "Blocks",
  blocked_by: "Blocked by",
  relates_to: "Relates to",
}

const REACTION_EMOJIS = ["👍", "❤️", "🎉", "😄"]

export function TaskDetailModal() {
  const { activeTaskId, closeTaskModal, celebrate } = useUIStore()
  const { updateTask, removeTask } = useTaskStore()
  const { currentProject } = useProjectStore()
  const { data: session } = useSession()

  const [task, setTask] = useState<DetailTask | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [newSubtask, setNewSubtask] = useState("")
  const [newTag, setNewTag] = useState("")
  const [comments, setComments] = useState<PopulatedComment[]>([])
  const [loadedTaskId, setLoadedTaskId] = useState<string | null>(null)
  const [loadedCommentsId, setLoadedCommentsId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState("")
  const [postingComment, setPostingComment] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [descriptionPreview, setDescriptionPreview] = useState(false)
  const [depTaskId, setDepTaskId] = useState("")
  const [depType, setDepType] = useState<DependencyType>("blocks")
  const [depPopoverOpen, setDepPopoverOpen] = useState(false)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loadedActivityId, setLoadedActivityId] = useState<string | null>(null)
  const [showActivity, setShowActivity] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionedIds, setMentionedIds] = useState<string[]>([])
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const open = !!activeTaskId
  const loading = activeTaskId !== loadedTaskId
  const commentsLoading = activeTaskId !== loadedCommentsId
  const activityLoading = activeTaskId !== loadedActivityId

  useEffect(() => {
    if (!activeTaskId) return

    axios
      .get(`/api/tasks/${activeTaskId}`)
      .then((res) => {
        const data = res.data.data as DetailTask
        setTask(data)
        setTitle(data.title)
        setDescription(data.description ?? "")
      })
      .catch(() => toast.error("Failed to load task"))
      .finally(() => setLoadedTaskId(activeTaskId))

    axios
      .get(`/api/tasks/${activeTaskId}/comments`)
      .then((res) => setComments(res.data.data))
      .catch(() => {})
      .finally(() => setLoadedCommentsId(activeTaskId))

    axios
      .get(`/api/tasks/${activeTaskId}/activity`)
      .then((res) => setActivity(res.data.data))
      .catch(() => {})
      .finally(() => setLoadedActivityId(activeTaskId))
  }, [activeTaskId])

  async function patchTask(updates: Record<string, unknown>) {
    if (!task) return
    try {
      const res = await axios.put(`/api/tasks/${task._id}`, updates)
      const updated = res.data.data as ITaskWithUsers
      // Server omits completedAt when it's been cleared; normalize so the
      // key is always present and stale local values get overwritten.
      const normalized = { ...updated, completedAt: updated.completedAt ?? undefined }
      setTask((prev) => (prev ? { ...prev, ...normalized, dependencies: prev.dependencies } : prev))
      updateTask(task._id, normalized)
    } catch {
      toast.error("Failed to update task")
    }
  }

  const sortedColumns = useMemo(
    () => [...(currentProject?.columns ?? [])].sort((a, b) => a.order - b.order),
    [currentProject]
  )
  const firstColumn = sortedColumns[0]
  const lastColumn = sortedColumns[sortedColumns.length - 1]
  const isComplete = !!task?.completedAt
  const currentColumn = sortedColumns.find((c) => c.id === task?.status)

  function handleStatusChange(status: string | null) {
    if (!task || !status) return
    const siblingTasks = useTaskStore
      .getState()
      .tasks.filter((t) => t.status === status && t._id !== task._id)
    const order = siblingTasks.length > 0 ? Math.max(...siblingTasks.map((t) => t.order)) + 1 : 0
    const wasLastColumn = !!lastColumn && task.status === lastColumn.id
    setTask({ ...task, status })
    patchTask({ status, order })
    if (lastColumn && status === lastColumn.id && !wasLastColumn) celebrate()
  }

  function toggleComplete() {
    if (!task) return
    const target = isComplete ? firstColumn : lastColumn
    if (!target) return
    const siblingTasks = useTaskStore
      .getState()
      .tasks.filter((t) => t.status === target.id && t._id !== task._id)
    const order = siblingTasks.length > 0 ? Math.max(...siblingTasks.map((t) => t.order)) + 1 : 0
    setTask({
      ...task,
      status: target.id,
      completedAt: isComplete ? undefined : new Date().toISOString(),
    })
    patchTask({ status: target.id, order })
    if (!isComplete) celebrate()
  }

  function handleTitleBlur() {
    if (!task) return
    const trimmed = title.trim()
    if (!trimmed || trimmed === task.title) {
      setTitle(task.title)
      return
    }
    patchTask({ title: trimmed })
  }

  function handleDescriptionBlur() {
    if (!task) return
    if (description === (task.description ?? "")) return
    patchTask({ description })
  }

  function toggleSubtask(subtask: ITaskSubtask) {
    if (!task) return
    const subtasks = task.subtasks.map((s) =>
      s.id === subtask.id ? { ...s, done: !s.done } : s
    )
    setTask({ ...task, subtasks })
    patchTask({ subtasks })
  }

  function addSubtask() {
    if (!task) return
    const trimmed = newSubtask.trim()
    if (!trimmed) return
    const subtasks = [...task.subtasks, { id: generateId("sub"), title: trimmed, done: false }]
    setTask({ ...task, subtasks })
    patchTask({ subtasks })
    setNewSubtask("")
  }

  function removeSubtask(id: string) {
    if (!task) return
    const subtasks = task.subtasks.filter((s) => s.id !== id)
    setTask({ ...task, subtasks })
    patchTask({ subtasks })
  }

  function addTag() {
    if (!task) return
    const trimmed = newTag.trim().toLowerCase()
    if (!trimmed || task.tags.includes(trimmed)) {
      setNewTag("")
      return
    }
    const tags = [...task.tags, trimmed]
    setTask({ ...task, tags })
    patchTask({ tags })
    setNewTag("")
  }

  function removeTag(tag: string) {
    if (!task) return
    const tags = task.tags.filter((t) => t !== tag)
    setTask({ ...task, tags })
    patchTask({ tags })
  }

  function handleAssigneesChange(ids: string[]) {
    if (!task) return
    patchTask({ assignees: ids })
  }

  function handleDateChange(field: "dueDate" | "startDate", date: Date | undefined) {
    if (!task) return
    patchTask({ [field]: date ? date.toISOString() : null })
  }

  function handleCustomFieldChange(fieldId: string, value: unknown) {
    if (!task) return
    const customFields = { ...task.customFields, [fieldId]: value }
    setTask({ ...task, customFields })
    patchTask({ customFields })
  }

  function toggleMultiselectOption(fieldId: string, option: string) {
    if (!task) return
    const current = task.customFields[fieldId]
    const selected = Array.isArray(current) ? (current as string[]) : []
    const next = selected.includes(option)
      ? selected.filter((o) => o !== option)
      : [...selected, option]
    handleCustomFieldChange(fieldId, next)
  }

  function dependenciesToPayload(deps: PopulatedDependency[]) {
    return deps.map((dep) => ({ taskId: dep.taskId._id, type: dep.type }))
  }

  function addDependency() {
    if (!task || !depTaskId) return
    const target = useTaskStore.getState().tasks.find((t) => t._id === depTaskId)
    if (!target) return
    if (task.dependencies.some((d) => d.taskId._id === depTaskId && d.type === depType)) {
      setDepPopoverOpen(false)
      return
    }
    const dependencies: PopulatedDependency[] = [
      ...task.dependencies,
      { taskId: { _id: target._id, title: target.title, status: target.status }, type: depType },
    ]
    setTask({ ...task, dependencies })
    patchTask({ dependencies: dependenciesToPayload(dependencies) })
    setDepTaskId("")
    setDepType("blocks")
    setDepPopoverOpen(false)
  }

  function removeDependency(index: number) {
    if (!task) return
    const dependencies = task.dependencies.filter((_, i) => i !== index)
    setTask({ ...task, dependencies })
    patchTask({ dependencies: dependenciesToPayload(dependencies) })
  }

  async function handleAttachmentDelete(attachmentId: string) {
    if (!task) return
    try {
      const res = await axios.delete(`/api/tasks/${task._id}/attachments`, {
        params: { attachmentId },
      })
      const attachments = res.data.data as ITaskAttachment[]
      setTask((prev) => (prev ? { ...prev, attachments } : prev))
      updateTask(task._id, { attachments })
    } catch {
      toast.error("Failed to delete attachment")
    }
  }

  async function handleUploadComplete(
    files: Array<{ serverData: { url: string; name: string; size: number; type: string } }>
  ) {
    if (!task) return
    for (const file of files) {
      try {
        const res = await axios.post(`/api/tasks/${task._id}/attachments`, {
          name: file.serverData.name,
          url: file.serverData.url,
          size: file.serverData.size,
          type: file.serverData.type,
        })
        const attachments = res.data.data as ITaskAttachment[]
        setTask((prev) => (prev ? { ...prev, attachments } : prev))
        updateTask(task._id, { attachments })
      } catch {
        toast.error("Failed to attach file")
      }
    }
  }

  function toggleWatching() {
    if (!task || !session?.user?.id) return
    const userId = session.user.id
    const isWatching = task.watchers.some((w) => w._id === userId)
    const watcherIds = isWatching
      ? task.watchers.filter((w) => w._id !== userId).map((w) => w._id)
      : [...task.watchers.map((w) => w._id), userId]
    patchTask({ watchers: watcherIds })
  }

  async function handlePostComment() {
    if (!task) return
    const trimmed = commentText.trim()
    if (!trimmed) return
    setPostingComment(true)
    try {
      const res = await axios.post(`/api/tasks/${task._id}/comments`, {
        content: trimmed,
        mentions: mentionedIds,
      })
      setComments((prev) => [...prev, res.data.data])
      setCommentText("")
      setMentionedIds([])
      setMentionQuery(null)
    } catch {
      toast.error("Failed to post comment")
    } finally {
      setPostingComment(false)
    }
  }

  function handleCommentTextChange(value: string) {
    setCommentText(value)
    const cursor = commentTextareaRef.current?.selectionStart ?? value.length
    const upToCursor = value.slice(0, cursor)
    const match = /(?:^|\s)@([^\s@]*)$/.exec(upToCursor)
    setMentionQuery(match ? match[1] : null)
  }

  function insertMention(member: IUserSummary) {
    const cursor = commentTextareaRef.current?.selectionStart ?? commentText.length
    const upToCursor = commentText.slice(0, cursor)
    const afterCursor = commentText.slice(cursor)
    const replaced = upToCursor.replace(/(?:^|\s)@([^\s@]*)$/, (m) => {
      const prefix = m.startsWith(" ") ? " " : ""
      return `${prefix}@${member.name} `
    })
    setCommentText(replaced + afterCursor)
    if (!mentionedIds.includes(member._id)) {
      setMentionedIds((prev) => [...prev, member._id])
    }
    setMentionQuery(null)
  }

  async function toggleReaction(comment: PopulatedComment, emoji: string) {
    if (!task) return
    try {
      const res = await axios.patch(`/api/tasks/${task._id}/comments/${comment._id}`, { emoji })
      const updated = res.data.data as PopulatedComment
      setComments((prev) => prev.map((c) => (c._id === comment._id ? updated : c)))
    } catch {
      toast.error("Failed to update reaction")
    }
  }

  async function handleDelete() {
    if (!task) return
    setDeleting(true)
    try {
      await axios.delete(`/api/tasks/${task._id}`)
      removeTask(task._id)
      setConfirmDelete(false)
      closeTaskModal()
      toast.success("Task deleted")
    } catch {
      toast.error("Failed to delete task")
    } finally {
      setDeleting(false)
    }
  }

  const subtaskTotal = task?.subtasks.length ?? 0
  const subtaskDone = task?.subtasks.filter((s) => s.done).length ?? 0
  const isWatching = !!session?.user?.id && !!task?.watchers.some((w) => w._id === session.user!.id)

  const projectMembers = useMemo(() => {
    const members = (currentProject?.members ?? []) as unknown as PopulatedMember[]
    return members.map((m) => m.userId).filter((u): u is IUserSummary => typeof u === "object" && !!u)
  }, [currentProject])

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return []
    const query = mentionQuery.toLowerCase()
    return projectMembers.filter((m) => m.name.toLowerCase().includes(query)).slice(0, 5)
  }, [mentionQuery, projectMembers])

  const allTasks = useTaskStore((s) => s.tasks)
  const otherProjectTasks = useMemo(() => {
    if (!task) return []
    return allTasks.filter((t) => t._id !== task._id && t.projectId === task.projectId)
  }, [task, allTasks])

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !next && closeTaskModal()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          {loading || !task ? (
            <div className="flex h-full items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <SheetTitle className="sr-only">{task.title}</SheetTitle>

              <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleComplete}
                  className={cn(
                    isComplete &&
                      "border-green-600/30 bg-green-600/10 text-green-700 hover:bg-green-600/15 hover:text-green-700 dark:text-green-400 dark:hover:text-green-400"
                  )}
                >
                  <Check className="h-4 w-4" />
                  {isComplete ? "Completed" : "Mark complete"}
                </Button>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={toggleWatching}
                    title={isWatching ? "Unwatch" : "Watch"}
                    className="text-muted-foreground"
                  >
                    {isWatching ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setConfirmDelete(true)}
                    title="Delete task"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={closeTaskModal}
                    title="Close"
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-6 px-5 py-4">
                  <div className="space-y-1">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleTitleBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                      }}
                      className={cn(
                        "h-auto border-none px-0 text-xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent",
                        isComplete && "text-muted-foreground line-through"
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      Created by {task.createdBy?.name ?? "a deleted user"} {formatRelativeTime(task.createdAt)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <FieldRow label="Assignee">
                      <UserSelect
                        value={task.assignees.map((a) => a._id)}
                        knownUsers={task.assignees}
                        onChange={handleAssigneesChange}
                        placeholder="No assignee"
                        className="h-8 w-fit border-none bg-transparent px-1 shadow-none hover:bg-accent"
                      />
                    </FieldRow>

                    <FieldRow label="Due date">
                      <DatePicker
                        value={task.dueDate ? new Date(task.dueDate) : null}
                        onChange={(date) => handleDateChange("dueDate", date)}
                        placeholder="No due date"
                        className="h-8 w-40 border-none bg-transparent px-1 shadow-none hover:bg-accent"
                      />
                    </FieldRow>

                    <FieldRow label="Start date">
                      <DatePicker
                        value={task.startDate ? new Date(task.startDate) : null}
                        onChange={(date) => handleDateChange("startDate", date)}
                        placeholder="No start date"
                        className="h-8 w-40 border-none bg-transparent px-1 shadow-none hover:bg-accent"
                      />
                    </FieldRow>

                    <FieldRow label="Status">
                      <Select value={task.status} onValueChange={handleStatusChange}>
                        <SelectTrigger
                          size="sm"
                          className="w-40 border-none bg-transparent shadow-none hover:bg-accent"
                        >
                          <SelectValue placeholder="Status">
                            {currentColumn && <TaskStatusBadge column={currentColumn} />}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {sortedColumns.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              <TaskStatusBadge column={col} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldRow>

                    <FieldRow label="Priority">
                      <Select value={task.priority} onValueChange={(value) => patchTask({ priority: value })}>
                        <SelectTrigger
                          size="sm"
                          className="w-40 border-none bg-transparent shadow-none hover:bg-accent"
                        >
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldRow>

                    <FieldRow label="Estimate (h)">
                      <Input
                        type="number"
                        min={0}
                        defaultValue={task.estimatedHours ?? ""}
                        onBlur={(e) =>
                          patchTask({ estimatedHours: e.target.value === "" ? null : Number(e.target.value) })
                        }
                        placeholder="—"
                        className="h-8 w-24 border-none bg-transparent px-1 shadow-none hover:bg-accent dark:bg-transparent"
                      />
                    </FieldRow>

                    <FieldRow label="Logged (h)">
                      <Input
                        type="number"
                        min={0}
                        defaultValue={task.loggedHours ?? 0}
                        onBlur={(e) => patchTask({ loggedHours: Number(e.target.value || 0) })}
                        className="h-8 w-24 border-none bg-transparent px-1 shadow-none hover:bg-accent dark:bg-transparent"
                      />
                    </FieldRow>

                    <FieldRow label="Tags">
                      <div className="flex flex-wrap items-center gap-1">
                        {task.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1 text-[10px]">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="ml-0.5">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addTag()
                          }}
                          placeholder="Add tag"
                          className="h-7 w-24 border-none bg-transparent px-1 text-xs shadow-none placeholder:text-muted-foreground/60 hover:bg-accent dark:bg-transparent"
                        />
                      </div>
                    </FieldRow>

                    {(currentProject?.customFields ?? []).map((field) => {
                      const value = task.customFields[field.id]
                      return (
                        <FieldRow
                          key={field.id}
                          label={field.required ? `${field.name} *` : field.name}
                        >
                          {field.type === "text" && (
                            <Input
                              defaultValue={typeof value === "string" ? value : ""}
                              onBlur={(e) => handleCustomFieldChange(field.id, e.target.value)}
                              className="h-8 border-none bg-transparent px-1 shadow-none hover:bg-accent dark:bg-transparent"
                            />
                          )}
                          {field.type === "number" && (
                            <Input
                              type="number"
                              defaultValue={typeof value === "number" ? value : ""}
                              onBlur={(e) =>
                                handleCustomFieldChange(
                                  field.id,
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                              className="h-8 w-24 border-none bg-transparent px-1 shadow-none hover:bg-accent dark:bg-transparent"
                            />
                          )}
                          {field.type === "date" && (
                            <DatePicker
                              value={typeof value === "string" && value ? new Date(value) : null}
                              onChange={(date) =>
                                handleCustomFieldChange(field.id, date ? date.toISOString() : null)
                              }
                              placeholder="No date"
                              className="h-8 w-40 border-none bg-transparent px-1 shadow-none hover:bg-accent"
                            />
                          )}
                          {field.type === "select" && (
                            <Select
                              value={typeof value === "string" ? value : ""}
                              onValueChange={(v) => handleCustomFieldChange(field.id, v)}
                            >
                              <SelectTrigger
                                size="sm"
                                className="w-40 border-none bg-transparent shadow-none hover:bg-accent"
                              >
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.options ?? []).map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {field.type === "multiselect" && (
                            <div className="flex flex-wrap gap-1">
                              {(field.options ?? []).map((option) => {
                                const selected =
                                  Array.isArray(value) && (value as string[]).includes(option)
                                return (
                                  <Badge
                                    key={option}
                                    variant={selected ? "default" : "secondary"}
                                    className="cursor-pointer text-[10px]"
                                    onClick={() => toggleMultiselectOption(field.id, option)}
                                  >
                                    {option}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                          {field.type === "checkbox" && (
                            <Checkbox
                              checked={value === true}
                              onCheckedChange={(checked) => handleCustomFieldChange(field.id, checked === true)}
                            />
                          )}
                        </FieldRow>
                      )
                    })}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">Description</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs text-muted-foreground"
                        onClick={() => setDescriptionPreview((prev) => !prev)}
                      >
                        {descriptionPreview ? (
                          <>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </>
                        )}
                      </Button>
                    </div>
                    {descriptionPreview ? (
                      <div className="min-h-24 rounded-md border px-3 py-2">
                        {description.trim() ? (
                          <MarkdownContent content={description} />
                        ) : (
                          <p className="text-sm text-muted-foreground">Nothing to preview.</p>
                        )}
                      </div>
                    ) : (
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={handleDescriptionBlur}
                        placeholder="What is this task about?"
                        rows={4}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Subtasks {subtaskTotal > 0 && `(${subtaskDone}/${subtaskTotal})`}
                    </label>
                    <div className="space-y-1">
                      {task.subtasks.map((subtask) => (
                        <div key={subtask.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent">
                          <Checkbox
                            checked={subtask.done}
                            onCheckedChange={() => toggleSubtask(subtask)}
                          />
                          <span className={cn("flex-1 text-sm", subtask.done && "text-muted-foreground line-through")}>
                            {subtask.title}
                          </span>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => removeSubtask(subtask.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addSubtask()
                        }}
                        placeholder="Add subtask"
                        className="h-8 text-sm"
                      />
                      <Button size="icon-sm" variant="ghost" onClick={addSubtask}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">Dependencies</label>
                      <Popover open={depPopoverOpen} onOpenChange={setDepPopoverOpen}>
                        <PopoverTrigger
                          render={
                            <Button size="icon-sm" variant="ghost">
                              <Plus className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <PopoverContent className="w-72" align="end">
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Task</label>
                              <Select value={depTaskId} onValueChange={(v) => setDepTaskId(v ?? "")}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a task" />
                                </SelectTrigger>
                                <SelectContent>
                                  {otherProjectTasks.map((t) => (
                                    <SelectItem key={t._id} value={t._id}>
                                      {t.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Relationship</label>
                              <Select value={depType} onValueChange={(v) => setDepType(v as DependencyType)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(DEPENDENCY_LABELS) as DependencyType[]).map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {DEPENDENCY_LABELS[type]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button size="sm" className="w-full" onClick={addDependency} disabled={!depTaskId}>
                              Add dependency
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {task.dependencies.length > 0 && (
                      <div className="space-y-1">
                        {task.dependencies.map((dep, i) => (
                          <div key={i} className="group flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              {DEPENDENCY_LABELS[dep.type]}
                            </Badge>
                            <span className="truncate">{dep.taskId.title}</span>
                            <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
                              {currentProject?.columns.find((c) => c.id === dep.taskId.status)?.name ??
                                dep.taskId.status}
                            </Badge>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="shrink-0 opacity-0 group-hover:opacity-100"
                              onClick={() => removeDependency(i)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Attachments {task.attachments.length > 0 && `(${task.attachments.length})`}
                      </label>
                      <UploadButton
                        endpoint="taskAttachment"
                        onClientUploadComplete={handleUploadComplete}
                        onUploadError={() => {
                          toast.error("Failed to upload file")
                        }}
                        appearance={{
                          button: "h-7 px-2 text-xs ut-uploading:cursor-not-allowed bg-primary text-primary-foreground",
                          allowedContent: "hidden",
                        }}
                      />
                    </div>
                    {task.attachments.length > 0 && (
                      <div className="space-y-1">
                        {task.attachments.map((att) => (
                          <div key={att.id} className="group flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 truncate text-primary underline-offset-2 hover:underline"
                            >
                              {att.name}
                            </a>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(att.size)}</span>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="shrink-0 opacity-0 group-hover:opacity-100"
                              onClick={() => handleAttachmentDelete(att.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 px-0 text-xs text-muted-foreground"
                      onClick={() => setShowActivity((prev) => !prev)}
                    >
                      <Activity className="h-3.5 w-3.5" />
                      Activity
                    </Button>
                    {showActivity && (
                      <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
                        {activityLoading ? (
                          <LoadingSpinner className="py-2" />
                        ) : activity.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No activity yet.</p>
                        ) : (
                          activity.map((entry) => (
                            <div key={entry._id} className="text-xs">
                              <span className="font-medium">{entry.actorId?.name ?? "Someone"}</span>{" "}
                              <span className="text-muted-foreground">{entry.action}</span>
                              <div className="text-[10px] text-muted-foreground">
                                {formatRelativeTime(entry.createdAt)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Comments ({comments.length})
                    </label>

                    {commentsLoading ? (
                      <LoadingSpinner className="py-4" />
                    ) : (
                      <div className="space-y-3">
                        {comments.map((comment) => {
                          const userId = session?.user?.id
                          return (
                            <div key={comment._id} className="flex gap-2">
                              <UserAvatar name={comment.authorId?.name ?? "Deleted user"} avatar={comment.authorId?.avatar} size="sm" />
                              <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold">{comment.authorId?.name ?? "Deleted user"}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatRelativeTime(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                  {REACTION_EMOJIS.map((emoji) => {
                                    const reaction = comment.reactions.find((r) => r.emoji === emoji)
                                    const count = reaction?.userIds.length ?? 0
                                    const reacted = !!userId && !!reaction?.userIds.includes(userId)
                                    return (
                                      <button
                                        key={emoji}
                                        onClick={() => toggleReaction(comment, emoji)}
                                        className={cn(
                                          "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors hover:bg-accent",
                                          reacted ? "border-primary bg-primary/10" : "border-transparent"
                                        )}
                                      >
                                        <span>{emoji}</span>
                                        {count > 0 && <span className="text-[10px] text-muted-foreground">{count}</span>}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t bg-muted/30 px-4 py-3">
                <div className="relative flex items-start gap-2">
                  {session?.user?.name && (
                    <UserAvatar name={session.user.name} size="sm" className="mt-0.5" />
                  )}
                  <Textarea
                    ref={commentTextareaRef}
                    value={commentText}
                    onChange={(e) => handleCommentTextChange(e.target.value)}
                    placeholder="Add a comment... (use @ to mention)"
                    rows={2}
                    className="bg-background text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handlePostComment()
                      }
                      if (e.key === "Escape") setMentionQuery(null)
                    }}
                  />
                  <Button size="icon" onClick={handlePostComment} disabled={postingComment || !commentText.trim()}>
                    {postingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                  {mentionQuery !== null && mentionCandidates.length > 0 && (
                    <div className="absolute bottom-full left-0 z-10 mb-1 w-56 rounded-md border bg-popover p-1 shadow-md">
                      {mentionCandidates.map((member) => (
                        <button
                          key={member._id}
                          onClick={() => insertMention(member)}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        >
                          <UserAvatar name={member.name} avatar={member.avatar} size="xs" />
                          {member.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete task"
        description="This will permanently delete this task and its comments. This action cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
