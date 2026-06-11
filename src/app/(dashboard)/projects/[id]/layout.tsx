"use client"

import { use, useEffect } from "react"
import { ProjectHeader } from "@/components/projects/ProjectHeader"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useProjectStore } from "@/store/projectStore"
import { useRealtimeProject } from "@/hooks/useRealtimeProject"

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = use(params)
  const { currentProject, fetchProject } = useProjectStore()

  useEffect(() => {
    fetchProject(id)
  }, [id, fetchProject])

  useRealtimeProject(id)

  const project = currentProject?._id === id ? currentProject : null

  return (
    <div className="flex h-full flex-col">
      {project ? <ProjectHeader project={project} /> : <div className="border-b px-6 py-4" />}
      <div className="min-h-0 flex-1">
        {project ? children : <LoadingSpinner className="py-24" />}
      </div>
    </div>
  )
}
