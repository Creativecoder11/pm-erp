"use client"

import { useCallback, useEffect, useState } from "react"
import axios from "axios"

export interface IWorkloadMember {
  userId: string
  name: string
  avatar?: string
}

export interface IWorkloadTask {
  _id: string
  title: string
  status: string
  priority: string
  assignees: string[]
  dueDate: string | null
  estimatedHours: number | null
}

interface UseWorkloadParams {
  projectId?: string
  startDate?: Date | string
  endDate?: Date | string
}

function toIsoString(value?: Date | string): string | undefined {
  if (!value) return undefined
  return value instanceof Date ? value.toISOString() : value
}

export function useWorkload({ projectId, startDate, endDate }: UseWorkloadParams = {}) {
  const [members, setMembers] = useState<IWorkloadMember[]>([])
  const [tasks, setTasks] = useState<IWorkloadTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkload = useCallback(async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)
    try {
      const res = await axios.get("/api/reports/workload", {
        params: {
          projectId,
          startDate: toIsoString(startDate),
          endDate: toIsoString(endDate),
        },
      })
      setMembers(res.data.data.members)
      setTasks(res.data.data.tasks)
    } catch {
      setError("Failed to load workload")
    } finally {
      setIsLoading(false)
    }
  }, [projectId, startDate, endDate])

  useEffect(() => {
    fetchWorkload()
  }, [fetchWorkload])

  return {
    members,
    tasks,
    isLoading,
    error,
    refetch: fetchWorkload,
  }
}
