"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { format } from "date-fns"
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle, CalendarCheck, ListChecks, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { DatePicker } from "@/components/shared/DatePicker"
import { downloadCSV } from "@/lib/csv"
import { StatCard } from "./StatCard"

interface BurndownPoint {
  date: string
  ideal: number
  actual: number | null
}

interface BurndownSummary {
  velocity: number
  estimatedCompletionDate: string | null
  tasksAtRisk: number
  totalTasks: number
  remainingTasks: number
}

export function BurndownTab({ projectId }: { projectId: string }) {
  const [points, setPoints] = useState<BurndownPoint[]>([])
  const [summary, setSummary] = useState<BurndownSummary | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [sprintStart, setSprintStart] = useState<Date | undefined>(undefined)
  const [sprintEnd, setSprintEnd] = useState<Date | undefined>(undefined)

  const key = `${projectId}|${sprintStart?.toISOString() ?? ""}|${sprintEnd?.toISOString() ?? ""}`

  useEffect(() => {
    axios
      .get("/api/reports/burndown", {
        params: {
          projectId,
          sprintStart: sprintStart?.toISOString(),
          sprintEnd: sprintEnd?.toISOString(),
        },
      })
      .then((res) => {
        setPoints(res.data.data.points)
        setSummary(res.data.data.summary)
      })
      .finally(() => setLoadedId(key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const loading = loadedId !== key

  function handleExport() {
    downloadCSV("burndown-report.csv", points.map((p) => ({ ...p })))
  }

  if (loading || !summary) return <LoadingSpinner className="py-24" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker value={sprintStart} onChange={setSprintStart} placeholder="Sprint start" className="w-44" />
          <DatePicker value={sprintEnd} onChange={setSprintEnd} placeholder="Sprint end" className="w-44" />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="Remaining Tasks" value={summary.remainingTasks} />
        <StatCard icon={TrendingDown} label="Velocity (tasks/day)" value={summary.velocity} />
        <StatCard
          icon={CalendarCheck}
          label="Est. Completion"
          value={summary.estimatedCompletionDate ? format(new Date(summary.estimatedCompletionDate), "MMM d") : "—"}
        />
        <StatCard
          icon={AlertTriangle}
          label="Tasks at Risk"
          value={summary.tasksAtRisk}
          accent={summary.tasksAtRisk > 0 ? "text-red-600" : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Burndown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d as string), "MMM d")} fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip labelFormatter={(d) => format(new Date(d as string), "MMM d, yyyy")} />
              <Legend />
              <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#94a3b8" strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6" connectNulls={false} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
