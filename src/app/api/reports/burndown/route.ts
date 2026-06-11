import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Task } from "@/models/Task"
import { getSessionUser, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-utils"
import { checkPermission } from "@/lib/rbac"

// GET /api/reports/burndown?projectId=&sprintStart=&sprintEnd=
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const sp = req.nextUrl.searchParams
    const projectId = sp.get("projectId")
    const sprintStartStr = sp.get("sprintStart")
    const sprintEndStr = sp.get("sprintEnd")

    if (!projectId) return badRequest("projectId is required")

    const allowed = await checkPermission(user.id, projectId, "reports.view")
    if (!allowed) return forbidden()

    await connectDB()

    const now = new Date()
    const sprintEnd = sprintEndStr ? new Date(sprintEndStr) : now
    const sprintStart = sprintStartStr
      ? new Date(sprintStartStr)
      : new Date(sprintEnd.getTime() - 13 * 24 * 60 * 60 * 1000)

    // Tasks that existed for at least part of the sprint window
    const tasks = await Task.find({
      projectId,
      createdAt: { $lte: sprintEnd },
    }).select("createdAt completedAt storyPoints")

    const total = tasks.length
    const dayMs = 24 * 60 * 60 * 1000
    const totalDays = Math.max(1, Math.round((sprintEnd.getTime() - sprintStart.getTime()) / dayMs))

    const points: Array<{ date: string; ideal: number; actual: number | null }> = []

    for (let i = 0; i <= totalDays; i++) {
      const day = new Date(sprintStart.getTime() + i * dayMs)
      const ideal = Math.max(0, total - (total * i) / totalDays)

      let actual: number | null = null
      if (day <= now) {
        actual = tasks.filter((t) => !t.completedAt || t.completedAt > day).length
      }

      points.push({
        date: day.toISOString().slice(0, 10),
        ideal: Math.round(ideal * 100) / 100,
        actual,
      })
    }

    const completedInSprint = tasks.filter(
      (t) => t.completedAt && t.completedAt >= sprintStart && t.completedAt <= sprintEnd
    )
    const daysElapsed = Math.max(
      1,
      Math.min(totalDays, Math.round((Math.min(now.getTime(), sprintEnd.getTime()) - sprintStart.getTime()) / dayMs))
    )
    const velocity = completedInSprint.length / daysElapsed

    const remaining = points[points.length - 1]?.actual ?? total
    const estimatedDaysToFinish = velocity > 0 ? Math.ceil(remaining / velocity) : null
    const estimatedCompletionDate = estimatedDaysToFinish
      ? new Date(now.getTime() + estimatedDaysToFinish * dayMs).toISOString().slice(0, 10)
      : null

    const tasksAtRisk = tasks.filter(
      (t) => !t.completedAt && estimatedCompletionDate && new Date(estimatedCompletionDate) > sprintEnd
    ).length

    return NextResponse.json({
      data: {
        points,
        summary: {
          velocity: Math.round(velocity * 100) / 100,
          estimatedCompletionDate,
          tasksAtRisk,
          totalTasks: total,
          remainingTasks: remaining,
        },
      },
    })
  } catch (err) {
    return serverError(err)
  }
}
