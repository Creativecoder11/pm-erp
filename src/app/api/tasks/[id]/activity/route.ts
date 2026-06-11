import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Task } from "@/models/Task"
import { AuditLog } from "@/models/AuditLog"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api-utils"
import { checkPermission } from "@/lib/rbac"

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/tasks/[id]/activity
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const task = await Task.findById(id).select("projectId")
    if (!task) return notFound("Task")

    const projectId = task.projectId.toString()
    const allowed = await checkPermission(user.id, projectId, "task.view")
    if (!allowed) return forbidden()

    const activity = await AuditLog.find({ entityType: "task", entityId: id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("actorId", "name email avatar")

    return NextResponse.json({ data: activity })
  } catch (err) {
    return serverError(err)
  }
}
