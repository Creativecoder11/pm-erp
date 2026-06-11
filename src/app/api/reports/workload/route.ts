import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import { connectDB } from "@/lib/db"
import { Project } from "@/models/Project"
import { Task } from "@/models/Task"
import { getSessionUser, unauthorized, forbidden, badRequest, notFound, serverError } from "@/lib/api-utils"
import { checkPermission } from "@/lib/rbac"

// GET /api/reports/workload?projectId=
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const projectId = req.nextUrl.searchParams.get("projectId")
    if (!projectId) return badRequest("projectId is required")

    const allowed = await checkPermission(user.id, projectId, "reports.view")
    if (!allowed) return forbidden()

    await connectDB()

    const project = await Project.findById(projectId).populate("members.userId", "name email avatar")
    if (!project) return notFound("Project")

    const members = project.members.map((m) => ({
      userId: m.userId._id.toString(),
      name: (m.userId as unknown as { name: string }).name,
      avatar: (m.userId as unknown as { avatar?: string }).avatar,
    }))

    const tasks = await Task.find({
      projectId: new Types.ObjectId(projectId),
      completedAt: null,
      assignees: { $exists: true, $ne: [] },
    })
      .select("title status priority assignees dueDate estimatedHours")
      .lean()

    const data = tasks.map((t) => ({
      _id: t._id.toString(),
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignees: t.assignees.map((a) => a.toString()),
      dueDate: t.dueDate ?? null,
      estimatedHours: t.estimatedHours ?? null,
    }))

    return NextResponse.json({ data: { members, tasks: data } })
  } catch (err) {
    return serverError(err)
  }
}
