"use client"

import { use, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { TimelineView } from "@/components/timeline/TimelineView"
import { TaskDetailModal } from "@/components/kanban/TaskDetailModal"
import { useProjectStore } from "@/store/projectStore"
import { useUIStore } from "@/store/uiStore"

interface TimelinePageProps {
  params: Promise<{ id: string }>
}

export default function TimelinePage({ params }: TimelinePageProps) {
  const { id } = use(params)
  const { currentProject } = useProjectStore()
  const { openTaskModal } = useUIStore()
  const searchParams = useSearchParams()

  useEffect(() => {
    const taskId = searchParams.get("task")
    if (taskId) openTaskModal(taskId)
  }, [searchParams, openTaskModal])

  if (!currentProject || currentProject._id !== id) return null

  return (
    <div className="h-full">
      <TimelineView projectId={id} columns={currentProject.columns} />
      <TaskDetailModal />
    </div>
  )
}
