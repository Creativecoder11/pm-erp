"use client"

import { useProjectStore } from "@/store/projectStore"

/**
 * Thin wrapper around useProjectStore for ergonomic imports in components.
 */
export function useProjects() {
  const projects = useProjectStore((state) => state.projects)
  const currentProject = useProjectStore((state) => state.currentProject)
  const isLoading = useProjectStore((state) => state.isLoading)
  const error = useProjectStore((state) => state.error)
  const fetchProjects = useProjectStore((state) => state.fetchProjects)
  const fetchProject = useProjectStore((state) => state.fetchProject)

  return {
    projects,
    currentProject,
    isLoading,
    error,
    fetchProjects,
    fetchProject,
  }
}
