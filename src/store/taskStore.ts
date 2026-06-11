import { create } from "zustand"
import axios from "axios"
import type { ITaskWithUsers } from "@/types"

interface TaskFilters {
  status?: string
  assignee?: string
  priority?: string
  search?: string
  sort?: string
}

interface TaskStore {
  tasks: ITaskWithUsers[]
  isLoading: boolean
  error: string | null
  fetchTasks: (projectId: string, filters?: TaskFilters) => Promise<void>
  setTasks: (tasks: ITaskWithUsers[]) => void
  addTask: (task: ITaskWithUsers) => void
  updateTask: (taskId: string, updates: Partial<ITaskWithUsers>) => void
  removeTask: (taskId: string) => void
  moveTask: (taskId: string, toStatus: string, toOrder: number) => void
  getTasksByStatus: (status: string) => ITaskWithUsers[]
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async (projectId, filters) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.set("status", filters.status)
      if (filters?.assignee) params.set("assignee", filters.assignee)
      if (filters?.priority) params.set("priority", filters.priority)
      if (filters?.search) params.set("search", filters.search)
      if (filters?.sort) params.set("sort", filters.sort)
      params.set("limit", "200")

      const res = await axios.get(`/api/projects/${projectId}/tasks?${params.toString()}`)
      set({ tasks: res.data.data, isLoading: false })
    } catch {
      set({ isLoading: false, error: "Failed to load tasks" })
    }
  },

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) =>
      state.tasks.some((t) => t._id === task._id)
        ? state
        : { tasks: [...state.tasks, task] }
    ),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === taskId ? { ...t, ...updates } : t)),
    })),

  removeTask: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t._id !== taskId) })),

  moveTask: (taskId, toStatus, toOrder) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t._id === taskId ? { ...t, status: toStatus, order: toOrder } : t
      ),
    })),

  getTasksByStatus: (status) => {
    return get()
      .tasks.filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order)
  },
}))
