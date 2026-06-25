"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { toast } from "sonner"
import { KanbanColumn } from "@/components/kanban/KanbanColumn"
import { TaskCard } from "@/components/kanban/TaskCard"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useTaskStore } from "@/store/taskStore"
import { useUIStore } from "@/store/uiStore"
import type { IProjectColumn, IProjectSection } from "@/types"

interface KanbanBoardProps {
  projectId: string
  columns: IProjectColumn[]
  sections: IProjectSection[]
}

export function KanbanBoard({ projectId, columns, sections }: KanbanBoardProps) {
  const { tasks, isLoading, fetchTasks, getTasksByStatus, moveTask, addTask } = useTaskStore()
  const { openTaskModal } = useUIStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks(projectId)
  }, [projectId, fetchTasks])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order)
  const activeTask = activeId ? tasks.find((t) => t._id === activeId) ?? null : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const draggedId = active.id as string
    const overId = over.id as string
    if (draggedId === overId) return

    const current = useTaskStore.getState().tasks
    const draggedTask = current.find((t) => t._id === draggedId)
    if (!draggedTask) return

    const overTask = current.find((t) => t._id === overId)
    const overIsColumn = columns.some((c) => c.id === overId)
    const overStatus = overIsColumn ? overId : overTask?.status

    if (!overStatus || draggedTask.status === overStatus) return

    moveTask(draggedId, overStatus, draggedTask.order)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const draggedId = active.id as string
    const overId = over.id as string

    const current = useTaskStore.getState().tasks
    const draggedTask = current.find((t) => t._id === draggedId)
    if (!draggedTask) return

    const overTask = current.find((t) => t._id === overId)
    const overIsColumn = columns.some((c) => c.id === overId)
    const destStatus = overIsColumn ? overId : overTask?.status ?? draggedTask.status

    const destTasks = current
      .filter((t) => t.status === destStatus && t._id !== draggedId)
      .sort((a, b) => a.order - b.order)

    let destIndex = destTasks.length
    if (!overIsColumn && overTask) {
      const idx = destTasks.findIndex((t) => t._id === overId)
      if (idx !== -1) destIndex = idx
    }

    const prevOrder = destIndex > 0 ? destTasks[destIndex - 1].order : undefined
    const nextOrder = destIndex < destTasks.length ? destTasks[destIndex].order : undefined

    let newOrder: number
    if (prevOrder === undefined && nextOrder === undefined) newOrder = 0
    else if (prevOrder === undefined) newOrder = nextOrder! - 1
    else if (nextOrder === undefined) newOrder = prevOrder + 1
    else newOrder = (prevOrder + nextOrder) / 2

    const previous = { status: draggedTask.status, order: draggedTask.order }
    const unchanged = previous.status === destStatus && previous.order === newOrder
    if (unchanged) return

    moveTask(draggedId, destStatus, newOrder)

    axios.put(`/api/tasks/${draggedId}`, { status: destStatus, order: newOrder }).catch(() => {
      moveTask(draggedId, previous.status, previous.order)
      toast.error("Failed to move task")
    })
  }

  async function handleAddTask(status: string, title: string) {
    try {
      const defaultSection = [...sections].sort((a, b) => a.order - b.order)[0]
      const res = await axios.post("/api/tasks", {
        title,
        projectId,
        status,
        sectionId: defaultSection?.id,
        priority: "none",
        assignees: [],
        tags: [],
      })
      addTask(res.data.data)
    } catch {
      toast.error("Failed to create task")
    }
  }

  if (isLoading && tasks.length === 0) {
    return <LoadingSpinner className="py-24" />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {sortedColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={getTasksByStatus(column.id)}
            onTaskClick={openTaskModal}
            onAddTask={(title) => handleAddTask(column.id, title)}
          />
        ))}
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} className="rotate-2 shadow-lg" /> : null}</DragOverlay>
    </DndContext>
  )
}
