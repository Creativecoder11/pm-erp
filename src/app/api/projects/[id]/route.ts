import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Project } from "@/models/Project"
import { Task } from "@/models/Task"
import { Comment } from "@/models/Comment"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { updateProjectSchema } from "@/lib/validations"
import { checkPermission } from "@/lib/rbac"
import { logAudit, diffFields } from "@/lib/audit"
import { emitToRoom, projectRoom } from "@/lib/socket-emit"

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id] - project overview
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const allowed = await checkPermission(user.id, id, "project.view")
    if (!allowed) return forbidden()

    const project = await Project.findById(id).populate(
      "members.userId",
      "name email avatar role"
    )
    if (!project) return notFound("Project")

    return NextResponse.json({ data: project })
  } catch (err) {
    return serverError(err)
  }
}

// PUT /api/projects/[id] - update project details/settings
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    const body = await req.json()
    const parsed = updateProjectSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const isSettingsChange =
      parsed.data.customFields !== undefined || parsed.data.columns !== undefined

    const isSectionsOnlyChange =
      parsed.data.sections !== undefined &&
      Object.keys(body).length === 1 &&
      "sections" in body

    const allowed = await checkPermission(
      user.id,
      id,
      isSectionsOnlyChange
        ? "task.create"
        : isSettingsChange
          ? "project.manage_settings"
          : "project.edit"
    )
    if (!allowed) return forbidden()

    const project = await Project.findById(id)
    if (!project) return notFound("Project")

    const before = project.toObject()
    Object.assign(project, parsed.data)

    if (parsed.data.status === "completed" && before.status !== "completed") {
      project.completedAt = new Date()
    }

    await project.save()

    const changes = diffFields(
      before as unknown as Record<string, unknown>,
      parsed.data as Record<string, unknown>
    )

    await logAudit({
      organizationId: user.organizationId,
      projectId: project._id.toString(),
      actorId: user.id,
      action: "project.updated",
      entityType: "project",
      entityId: project._id.toString(),
      changes,
    })

    emitToRoom(projectRoom(id), "project:updated", { projectId: id, changes: parsed.data })

    return NextResponse.json({ data: project })
  } catch (err) {
    return serverError(err)
  }
}

// DELETE /api/projects/[id] - permanently delete a project and its data
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const allowed = await checkPermission(user.id, id, "project.delete")
    if (!allowed) return forbidden()

    const project = await Project.findById(id)
    if (!project) return notFound("Project")

    const taskIds = await Task.find({ projectId: id }).distinct("_id")
    await Comment.deleteMany({ taskId: { $in: taskIds } })
    await Task.deleteMany({ projectId: id })
    await project.deleteOne()

    await logAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "project.deleted",
      entityType: "project",
      entityId: id,
      changes: { name: { before: project.name, after: null } },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    return serverError(err)
  }
}
