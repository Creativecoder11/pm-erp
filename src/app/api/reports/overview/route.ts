import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import { connectDB } from "@/lib/db"
import { Task } from "@/models/Task"
import { getSessionUser, unauthorized, forbidden, serverError } from "@/lib/api-utils"
import { checkPermission } from "@/lib/rbac"

// GET /api/reports/overview?projectId=&from=&to=
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const projectId = req.nextUrl.searchParams.get("projectId")
    const fromStr = req.nextUrl.searchParams.get("from")
    const toStr = req.nextUrl.searchParams.get("to")

    if (projectId) {
      const allowed = await checkPermission(user.id, projectId, "reports.view")
      if (!allowed) return forbidden()
    }

    await connectDB()

    const match: Record<string, unknown> = { organizationId: new Types.ObjectId(user.organizationId) }
    if (projectId) match.projectId = new Types.ObjectId(projectId)

    if (fromStr || toStr) {
      const createdAtFilter: Record<string, Date> = {}
      if (fromStr) createdAtFilter.$gte = new Date(fromStr)
      if (toStr) createdAtFilter.$lte = new Date(toStr)
      match.createdAt = createdAtFilter
    }

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [totals] = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $ne: ["$completedAt", null] }, 1, 0] },
          },
          completedThisWeek: {
            $sum: {
              $cond: [{ $and: [{ $ne: ["$completedAt", null] }, { $gte: ["$completedAt", weekAgo] }] }, 1, 0],
            },
          },
          overdueTasks: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$completedAt", null] }, { $ne: ["$dueDate", null] }, { $lt: ["$dueDate", now] }] },
                1,
                0,
              ],
            },
          },
          avgCompletionHours: {
            $avg: {
              $cond: [
                { $ne: ["$completedAt", null] },
                { $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 1000 * 60 * 60] },
                null,
              ],
            },
          },
        },
      },
    ])

    const byPriority = await Task.aggregate([
      { $match: match },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    const byAssignee = await Task.aggregate([
      { $match: match },
      { $unwind: { path: "$assignees", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$assignees",
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: [{ $ne: ["$completedAt", null] }, 1, 0] } },
          avgCompletionHours: {
            $avg: {
              $cond: [
                { $ne: ["$completedAt", null] },
                { $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 1000 * 60 * 60] },
                null,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$user.name",
          avatar: "$user.avatar",
          totalTasks: 1,
          completedTasks: 1,
          completionRate: {
            $cond: [
              { $eq: ["$totalTasks", 0] },
              0,
              { $multiply: [{ $divide: ["$completedTasks", "$totalTasks"] }, 100] },
            ],
          },
          avgCompletionHours: { $ifNull: ["$avgCompletionHours", 0] },
        },
      },
      { $sort: { totalTasks: -1 } },
    ])

    // Last 30 days completion trend
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const trend = await Task.aggregate([
      { $match: { ...match, completedAt: { $gte: thirtyDaysAgo, $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ])

    const totalTasks = totals?.totalTasks ?? 0
    const completedTasks = totals?.completedTasks ?? 0

    return NextResponse.json({
      data: {
        totalTasks,
        completedTasks,
        completedThisWeek: totals?.completedThisWeek ?? 0,
        overdueTasks: totals?.overdueTasks ?? 0,
        completionRate: totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100,
        avgCompletionHours: totals?.avgCompletionHours ?? 0,
        byPriority,
        byAssignee,
        completionTrend: trend,
      },
    })
  } catch (err) {
    return serverError(err)
  }
}
