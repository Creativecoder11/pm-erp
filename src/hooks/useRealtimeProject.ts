"use client"

import { useEffect } from "react"
import { useSocket } from "@/hooks/useSocket"
import { useTaskStore } from "@/store/taskStore"
import { useProjectStore } from "@/store/projectStore"
import type { ITaskWithUsers, IProject, IProjectMember } from "@/types"

interface TaskUpdatedPayload {
  taskId: string
  changes: Partial<ITaskWithUsers>
}

interface TaskDeletedPayload {
  taskId: string
}

interface ProjectUpdatedPayload {
  projectId: string
  changes: Partial<IProject>
}

interface MemberJoinedPayload {
  projectId: string
  user: IProjectMember
}

/**
 * Joins the given project's real-time room and keeps the task/project
 * stores in sync with changes made by other clients.
 */
export function useRealtimeProject(projectId: string | undefined) {
  const socket = useSocket(projectId)

  useEffect(() => {
    if (!socket || !projectId) return

    function handleTaskCreated(task: ITaskWithUsers) {
      const exists = useTaskStore.getState().tasks.some((t) => t._id === task._id)
      if (!exists) useTaskStore.getState().addTask(task)
    }

    function handleTaskUpdated({ taskId, changes }: TaskUpdatedPayload) {
      useTaskStore.getState().updateTask(taskId, changes)
    }

    function handleTaskDeleted({ taskId }: TaskDeletedPayload) {
      useTaskStore.getState().removeTask(taskId)
    }

    function handleProjectUpdated({ projectId: id, changes }: ProjectUpdatedPayload) {
      useProjectStore.getState().updateProjectLocal(id, changes)
    }

    function handleMemberJoined({ projectId: id, user }: MemberJoinedPayload) {
      const project = useProjectStore.getState().currentProject
      if (project?._id === id) {
        useProjectStore.getState().updateProjectLocal(id, { members: [...project.members, user] })
      }
    }

    socket.on("task:created", handleTaskCreated)
    socket.on("task:updated", handleTaskUpdated)
    socket.on("task:deleted", handleTaskDeleted)
    socket.on("project:updated", handleProjectUpdated)
    socket.on("member:joined", handleMemberJoined)

    return () => {
      socket.off("task:created", handleTaskCreated)
      socket.off("task:updated", handleTaskUpdated)
      socket.off("task:deleted", handleTaskDeleted)
      socket.off("project:updated", handleProjectUpdated)
      socket.off("member:joined", handleMemberJoined)
    }
  }, [socket, projectId])
}
