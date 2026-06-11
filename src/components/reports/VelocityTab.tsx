"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Activity, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { downloadCSV } from "@/lib/csv"
import { StatCard } from "./StatCard"

interface VelocitySprint {
  sprintId: string
  completedPoints: number
  completedTasks: number
}

export function VelocityTab({ projectId }: { projectId: string }) {
  const [sprints, setSprints] = useState<VelocitySprint[]>([])
  const [average, setAverage] = useState(0)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [sprintCount, setSprintCount] = useState(6)

  const key = `${projectId}|${sprintCount}`

  useEffect(() => {
    axios
      .get("/api/reports/velocity", { params: { projectId, sprints: sprintCount } })
      .then((res) => {
        setSprints(res.data.data.sprints)
        setAverage(res.data.data.averageVelocity)
      })
      .finally(() => setLoadedId(key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const loading = loadedId !== key

  function handleExport() {
    downloadCSV("velocity-report.csv", sprints.map((s) => ({ ...s })))
  }

  function handleSprintCountChange(value: string) {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) return
    setSprintCount(Math.min(24, Math.max(1, parsed)))
  }

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="sprint-count" className="text-sm text-muted-foreground">
          Sprints
        </Label>
        <Input
          id="sprint-count"
          type="number"
          min={1}
          max={24}
          value={sprintCount}
          onChange={(e) => handleSprintCountChange(e.target.value)}
          className="w-20"
        />
      </div>
      <Button variant="outline" size="sm" onClick={handleExport} disabled={sprints.length === 0}>
        Export CSV
      </Button>
    </div>
  )

  if (loading) return <LoadingSpinner className="py-24" />

  if (sprints.length === 0) {
    return (
      <div className="space-y-6">
        {controls}
        <EmptyState
          icon={Activity}
          title="No sprint data"
          description="Assign story points and sprints to tasks to track velocity."
          className="py-24"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {controls}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Gauge} label="Average Velocity (points/sprint)" value={average} />
        <StatCard icon={Activity} label="Sprints Tracked" value={sprints.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Velocity by Sprint</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sprints}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="sprintId" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <ReferenceLine y={average} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Avg", position: "right", fontSize: 12 }} />
              <Bar dataKey="completedPoints" name="Completed Points" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
