import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Task } from "@/models/Task"
import { getSessionUser, unauthorized, forbidden, badRequest, serverError } from "@/lib/api-utils"
import { checkPermission } from "@/lib/rbac"

// GET /api/reports/velocity?projectId=&sprints=6
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const sp = req.nextUrl.searchParams
    const projectId = sp.get("projectId")
    const sprintCount = Math.min(24, Math.max(1, Number(sp.get("sprints") ?? "6")))

    if (!projectId) return badRequest("projectId is required")

    const allowed = await checkPermission(user.id, projectId, "reports.view")
    if (!allowed) return forbidden()

    await connectDB()

    const results = await Task.aggregate([
      {
        $match: {
          projectId: new (await import("mongoose")).Types.ObjectId(projectId),
          sprintId: { $ne: null, $exists: true },
          completedAt: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$sprintId",
          completedPoints: { $sum: { $ifNull: ["$storyPoints", 0] } },
          completedTasks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    const sprints = results.slice(-sprintCount).map((r) => ({
      sprintId: r._id as string,
      completedPoints: r.completedPoints as number,
      completedTasks: r.completedTasks as number,
    }))

    const average =
      sprints.length === 0
        ? 0
        : sprints.reduce((sum, s) => sum + s.completedPoints, 0) / sprints.length

    return NextResponse.json({
      data: {
        sprints,
        averageVelocity: Math.round(average * 100) / 100,
      },
    })
  } catch (err) {
    return serverError(err)
  }
}
