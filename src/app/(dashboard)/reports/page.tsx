"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { DatePicker } from "@/components/shared/DatePicker"
import { OverviewTab } from "@/components/reports/OverviewTab"
import { BurndownTab } from "@/components/reports/BurndownTab"
import { VelocityTab } from "@/components/reports/VelocityTab"
import { TeamTab } from "@/components/reports/TeamTab"
import { useProjectStore } from "@/store/projectStore"

export default function ReportsPage() {
  const { projects, isLoading, fetchProjects } = useProjectStore()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const effectiveProjectId = projectId ?? projects[0]?._id ?? null

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Track progress, velocity, and team performance.</p>
        </div>
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
      </div>

      {isLoading && projects.length === 0 ? (
        <LoadingSpinner className="py-24" />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to start tracking reports."
          action={
            <Link href="/projects/new">
              <Button>Create Project</Button>
            </Link>
          }
        />
      ) : effectiveProjectId ? (
        <Tabs defaultValue="overview">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="burndown">Burndown</TabsTrigger>
              <TabsTrigger value="velocity">Velocity</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" className="w-40" />
              <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" className="w-40" />
            </div>
          </div>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab projectId={effectiveProjectId} dateRange={{ from: dateFrom, to: dateTo }} />
          </TabsContent>
          <TabsContent value="burndown" className="mt-4">
            <BurndownTab projectId={effectiveProjectId} />
          </TabsContent>
          <TabsContent value="velocity" className="mt-4">
            <VelocityTab projectId={effectiveProjectId} />
          </TabsContent>
          <TabsContent value="team" className="mt-4">
            <TeamTab projectId={effectiveProjectId} dateRange={{ from: dateFrom, to: dateTo }} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  )
}
