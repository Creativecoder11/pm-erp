"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { ArrowDown, ArrowUp, ArrowUpDown, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { UserAvatar } from "@/components/shared/Avatar"
import { downloadCSV } from "@/lib/csv"
import { cn } from "@/lib/utils"

interface AssigneeStat {
  userId: string
  name: string
  avatar?: string
  totalTasks: number
  completedTasks: number
  completionRate: number
  avgCompletionHours: number
}

interface DateRange {
  from?: Date
  to?: Date
}

type SortKey = "name" | "totalTasks" | "completedTasks" | "completionRate" | "avgCompletionHours"
type SortDirection = "asc" | "desc"

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Member" },
  { key: "totalTasks", label: "Tasks Assigned" },
  { key: "completedTasks", label: "Tasks Completed" },
  { key: "completionRate", label: "Completion Rate" },
  { key: "avgCompletionHours", label: "Avg. Time to Complete" },
]

export function TeamTab({ projectId, dateRange }: { projectId: string; dateRange?: DateRange }) {
  const [byAssignee, setByAssignee] = useState<AssigneeStat[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("totalTasks")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

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
      .then((res) => setByAssignee(res.data.data.byAssignee))
      .finally(() => setLoadedKey(key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const loading = loadedKey !== key

  const sorted = useMemo(() => {
    const copy = [...byAssignee]
    copy.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      let cmp = 0
      if (typeof aVal === "string" && typeof bVal === "string") {
        cmp = aVal.localeCompare(bVal)
      } else {
        cmp = (aVal as number) - (bVal as number)
      }
      return sortDirection === "asc" ? cmp : -cmp
    })
    return copy
  }, [byAssignee, sortKey, sortDirection])

  function handleSort(column: SortKey) {
    if (sortKey === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(column)
      setSortDirection("desc")
    }
  }

  function handleExport() {
    downloadCSV(
      "team-report.csv",
      sorted.map((a) => ({
        Member: a.name,
        "Tasks Assigned": a.totalTasks,
        "Tasks Completed": a.completedTasks,
        "Completion Rate (%)": Math.round(a.completionRate * 100) / 100,
        "Avg. Time to Complete (hours)": Math.round(a.avgCompletionHours * 100) / 100,
      }))
    )
  }

  if (loading) return <LoadingSpinner className="py-24" />

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team activity"
        description="Assign tasks to team members to see their performance here."
        className="py-24"
      />
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team Performance</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column.key}>
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1 font-medium hover:text-foreground"
                    >
                      {column.label}
                      {sortKey === column.key ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
                      )}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={member.name} avatar={member.avatar} size="sm" />
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{member.totalTasks}</TableCell>
                  <TableCell>{member.completedTasks}</TableCell>
                  <TableCell>{Math.round(member.completionRate)}%</TableCell>
                  <TableCell className={cn(!member.avgCompletionHours && "text-muted-foreground")}>
                    {member.avgCompletionHours ? `${Math.round(member.avgCompletionHours)}h` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
