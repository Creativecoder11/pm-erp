"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { format } from "date-fns"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { TooltipPayloadEntry } from "recharts"
import { AlertCircle, CheckCircle2, Clock, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { downloadCSV } from "@/lib/csv"
import { StatCard } from "./StatCard"

const PRIORITY_COLORS: Record<string, string> = {
  none: "#94a3b8",
  low: "#64748b",
  medium: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
}

const PRIORITY_LABELS: Record<string, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

interface AssigneeStat {
  userId: string
  name: string
  avatar?: string
  totalTasks: number
  completedTasks: number
  completionRate: number
}

interface OverviewData {
  totalTasks: number
  completedTasks: number
  completedThisWeek: number
  overdueTasks: number
  completionRate: number
  avgCompletionHours: number
  byPriority: { _id: string; count: number }[]
  byAssignee: AssigneeStat[]
  completionTrend: { date: string; count: number }[]
}

interface DateRange {
  from?: Date
  to?: Date
}

export function OverviewTab({ projectId, dateRange }: { projectId: string; dateRange?: DateRange }) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  const key = `${projectId}|${dateRange?.from?.toISOString() ?? ""}|${dateRange?.to?.toISOString() ?? ""}`

  useEffect(() => {
    axios
      .get("/api/reports/overview", {
        params: {
          projectId,
          from: dateRange?.from?.toISOString(),
          to: dateRange?.to?.toISOString(),
        },
      })
      .then((res) => setData(res.data.data))
      .finally(() => setLoadedKey(key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const loading = loadedKey !== key

  const assigneeData = useMemo(
    () =>
      (data?.byAssignee ?? []).map((a) => ({
        ...a,
        remaining: a.totalTasks - a.completedTasks,
      })),
    [data]
  )

  if (loading || !data) return <LoadingSpinner className="py-24" />

  function handleExport() {
    if (!data) return
    const priorityRows = data.byPriority.map((p) => ({
      type: "priority",
      label: PRIORITY_LABELS[p._id] ?? p._id,
      count: p.count,
    }))
    const assigneeRows = data.byAssignee.map((a) => ({
      type: "assignee",
      label: a.name,
      totalTasks: a.totalTasks,
      completedTasks: a.completedTasks,
      completionRate: Math.round(a.completionRate * 100) / 100,
    }))
    downloadCSV("overview-report.csv", [...priorityRows, ...assigneeRows])
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="Total Tasks" value={data.totalTasks} />
        <StatCard icon={CheckCircle2} label="Completed" value={data.completedTasks} accent="text-green-600" />
        <StatCard icon={AlertCircle} label="Overdue" value={data.overdueTasks} accent="text-red-600" />
        <StatCard icon={Clock} label="Avg. Completion Time" value={`${Math.round(data.avgCompletionHours ?? 0)}h`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byPriority.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No tasks yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.byPriority} dataKey="count" nameKey="_id" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {data.byPriority.map((entry) => (
                      <Cell key={entry._id} fill={PRIORITY_COLORS[entry._id] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, item: TooltipPayloadEntry) => [
                      value,
                      PRIORITY_LABELS[(item.payload as { _id: string })?._id] ?? "",
                    ]}
                  />
                  <Legend formatter={(value, entry) => PRIORITY_LABELS[(entry?.payload as unknown as { _id: string })?._id] ?? value} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.completionTrend.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No completions yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.completionTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d as string), "MMM d")} fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip labelFormatter={(d) => format(new Date(d as string), "MMM d, yyyy")} />
                  <Bar dataKey="count" name="Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks by Assignee</CardTitle>
        </CardHeader>
        <CardContent>
          {assigneeData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No assigned tasks yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, assigneeData.length * 40)}>
              <BarChart data={assigneeData} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completedTasks" stackId="a" name="Completed" fill="#3b82f6" />
                <Bar dataKey="remaining" stackId="a" name="Remaining" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
