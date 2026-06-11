import { create } from "zustand"
import axios from "axios"
import type { IProject } from "@/types"

interface ProjectStore {
  projects: IProject[]
  currentProject: IProject | null
  isLoading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  setCurrentProject: (project: IProject | null) => void
  addProject: (project: IProject) => void
  updateProjectLocal: (id: string, updates: Partial<IProject>) => void
  removeProject: (id: string) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await axios.get("/api/projects")
      set({ projects: res.data.data, isLoading: false })
    } catch {
      set({ isLoading: false, error: "Failed to load projects" })
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await axios.get(`/api/projects/${id}`)
      set({ currentProject: res.data.data, isLoading: false })
    } catch {
      set({ isLoading: false, error: "Failed to load project" })
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),

  updateProjectLocal: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) => (p._id === id ? { ...p, ...updates } : p)),
      currentProject:
        state.currentProject?._id === id
          ? { ...state.currentProject, ...updates }
          : state.currentProject,
    })),

  removeProject: (id) =>
    set((state) => ({ projects: state.projects.filter((p) => p._id !== id) })),
}))
