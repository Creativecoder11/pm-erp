import { NextRequest, NextResponse } from "next/server"
import { QueryFilter } from "mongoose"
import { connectDB } from "@/lib/db"
import { Task, ITask } from "@/models/Task"
import { Comment } from "@/models/Comment"
import { getSessionUser, unauthorized, forbidden, serverError } from "@/lib/api-utils"
import { checkPermission } from "@/lib/rbac"

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/tasks?status=&assignee=&priority=&search=&sort=&page=&limit=
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const allowed = await checkPermission(user.id, id, "task.view")
    if (!allowed) return forbidden()

    const sp = req.nextUrl.searchParams
    const status = sp.get("status")
    const assignee = sp.get("assignee")
    const priority = sp.get("priority")
    const search = sp.get("search")
    const sort = sp.get("sort") ?? "order"
    const page = Math.max(1, Number(sp.get("page") ?? "1"))
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "50")))

    const filter: QueryFilter<ITask> = { projectId: id }
    if (status) filter.status = status
    if (assignee) filter.assignees = assignee
    if (priority) filter.priority = priority as ITask["priority"]
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      order: { status: 1, order: 1 },
      "-order": { status: 1, order: -1 },
      dueDate: { dueDate: 1 },
      "-dueDate": { dueDate: -1 },
      priority: { priority: 1 },
      "-priority": { priority: -1 },
      createdAt: { createdAt: 1 },
      "-createdAt": { createdAt: -1 },
      title: { title: 1 },
      "-title": { title: -1 },
    }
    const sortQuery = sortMap[sort] ?? sortMap.order

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("assignees", "name email avatar")
        .populate("createdBy", "name email avatar")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(limit),
      Task.countDocuments(filter),
    ])

    const taskIds = tasks.map((t) => t._id)
    const commentCounts = await Comment.aggregate<{ _id: typeof taskIds[number]; count: number }>([
      { $match: { taskId: { $in: taskIds } } },
      { $group: { _id: "$taskId", count: { $sum: 1 } } },
    ])
    const commentCountMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count]))

    const data = tasks.map((task) => ({
      ...task.toObject(),
      commentCount: commentCountMap.get(task._id.toString()) ?? 0,
    }))

    return NextResponse.json({
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    return serverError(err)
  }
}
