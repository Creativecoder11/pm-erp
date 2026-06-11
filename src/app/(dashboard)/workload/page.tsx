"use client"

import { useEffect, useState } from "react"
import { addWeeks, startOfWeek, subWeeks } from "date-fns"
import { ChevronLeft, ChevronRight, FolderKanban } from "lucide-react"
import { WorkloadView } from "@/components/workload/WorkloadView"
import { TaskDetailModal } from "@/components/kanban/TaskDetailModal"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useProjectStore } from "@/store/projectStore"

function defaultRange() {
  const start = startOfWeek(new Date())
  const end = addWeeks(start, 2)
  return { start, end }
}

export default function WorkloadPage() {
  const { projects, isLoading, fetchProjects, fetchProject } = useProjectStore()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [range, setRange] = useState(defaultRange)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const effectiveProjectId = projectId ?? projects[0]?._id ?? null

  useEffect(() => {
    if (effectiveProjectId) fetchProject(effectiveProjectId)
  }, [effectiveProjectId, fetchProject])

  function shiftWeek(amount: number) {
    setRange((prev) => ({
      start: amount > 0 ? addWeeks(prev.start, amount) : subWeeks(prev.start, -amount),
      end: amount > 0 ? addWeeks(prev.end, amount) : subWeeks(prev.end, -amount),
    }))
  }

  function resetRange() {
    setRange(defaultRange())
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workload</h1>
          <p className="text-sm text-muted-foreground">See how work is distributed across your team.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {projects.length > 0 && (
            <Select value={effectiveProjectId ?? undefined} onValueChange={(value) => value && setProjectId(value)}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => shiftWeek(-1)} title="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <DatePicker
              value={range.start}
              onChange={(date) => date && setRange((prev) => ({ ...prev, start: date }))}
              className="w-36"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <DatePicker
              value={range.end}
              onChange={(date) => date && setRange((prev) => ({ ...prev, end: date }))}
              className="w-36"
            />
            <Button variant="outline" size="icon-sm" onClick={() => shiftWeek(1)} title="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={resetRange}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {isLoading && projects.length === 0 ? (
        <LoadingSpinner className="py-24" />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to see workload data."
        />
      ) : effectiveProjectId ? (
        <WorkloadView projectId={effectiveProjectId} startDate={range.start} endDate={range.end} />
      ) : null}

      <TaskDetailModal />
    </div>
  )
}
