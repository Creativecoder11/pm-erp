"use client"

import { useEffect } from "react"
import { useTaskStore } from "@/store/taskStore"

/**
 * Thin wrapper around useTaskStore for ergonomic imports in components.
 * If `projectId` is provided, tasks are fetched on mount (and whenever
 * `projectId` changes).
 */
export function useTasks(projectId?: string) {
  const tasks = useTaskStore((state) => state.tasks)
  const isLoading = useTaskStore((state) => state.isLoading)
  const error = useTaskStore((state) => state.error)
  const fetchTasks = useTaskStore((state) => state.fetchTasks)
  const getTasksByStatus = useTaskStore((state) => state.getTasksByStatus)
  const addTask = useTaskStore((state) => state.addTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const removeTask = useTaskStore((state) => state.removeTask)

  useEffect(() => {
    if (projectId) {
      fetchTasks(projectId)
    }
  }, [projectId, fetchTasks])

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    getTasksByStatus,
    addTask,
    updateTask,
    removeTask,
  }
}
