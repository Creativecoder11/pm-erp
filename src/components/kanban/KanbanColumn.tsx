"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronLeft, ChevronRight, Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TaskCard } from "@/components/kanban/TaskCard"
import { cn } from "@/lib/utils"
import type { IProjectColumn, ITaskWithUsers } from "@/types"

function SortableTaskCard({ task, onClick }: { task: ITaskWithUsers; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  })

  return (
    <TaskCard
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      task={task}
      isDragging={isDragging}
      onClick={onClick}
      {...attributes}
      {...listeners}
    />
  )
}

interface KanbanColumnProps {
  column: IProjectColumn
  tasks: ITaskWithUsers[]
  onTaskClick: (taskId: string) => void
  onAddTask: (title: string) => Promise<void>
}

export function KanbanColumn({ column, tasks, onTaskClick, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const overLimit = column.limit != null && tasks.length > column.limit
  const atLimit = column.limit != null && tasks.length === column.limit

  async function handleSubmit() {
    const trimmed = title.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }
    setSubmitting(true)
    try {
      await onAddTask(trimmed)
      setTitle("")
    } finally {
      setSubmitting(false)
    }
  }

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center rounded-lg bg-muted/40 py-2.5">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setCollapsed(false)}
          aria-label={`Expand ${column.name} column`}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="mt-2 flex flex-1 flex-col items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
          <span
            className="whitespace-nowrap text-sm font-semibold [writing-mode:vertical-rl]"
            style={{ transform: "rotate(180deg)" }}
          >
            {column.name}
          </span>
          <span
            className={cn(
              "text-xs text-muted-foreground",
              atLimit && "font-semibold text-amber-600",
              overLimit && "font-semibold text-red-600"
            )}
          >
            {tasks.length}
            {column.limit != null ? `/${column.limit}` : ""}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        <h3 className="text-sm font-semibold">{column.name}</h3>
        <span
          className={cn(
            "text-xs text-muted-foreground",
            atLimit && "font-semibold text-amber-600",
            overLimit && "font-semibold text-red-600"
          )}
        >
          {tasks.length}
          {column.limit != null ? ` / ${column.limit}` : ""}
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => setCollapsed(true)}
          aria-label={`Collapse ${column.name} column`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-20 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 transition-colors",
          isOver && "bg-accent/50"
        )}
      >
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task._id} task={task} onClick={() => onTaskClick(task._id)} />
          ))}
        </SortableContext>
      </div>

      <div className="p-2 pt-0">
        {adding ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name"
              className="h-8 text-sm"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit()
                if (e.key === "Escape") {
                  setAdding(false)
                  setTitle("")
                }
              }}
              onBlur={() => {
                if (!title.trim()) setAdding(false)
              }}
            />
            <Button size="icon-sm" variant="ghost" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setAdding(false)
                setTitle("")
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        )}
      </div>
    </div>
  )
}
