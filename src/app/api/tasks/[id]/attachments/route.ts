import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/db"
import { Task } from "@/models/Task"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { checkPermission } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { emitToRoom, projectRoom } from "@/lib/socket-emit"
import { generateId } from "@/lib/utils"

interface Params {
  params: Promise<{ id: string }>
}

const addAttachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  size: z.number().nonnegative(),
  type: z.string(),
})

// POST /api/tasks/[id]/attachments - register an uploaded file on a task
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    const body = await req.json()
    const parsed = addAttachmentSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const task = await Task.findById(id)
    if (!task) return notFound("Task")

    const projectId = task.projectId.toString()
    const isOwnResource =
      task.createdBy.toString() === user.id ||
      task.assignees.some((a) => a.toString() === user.id)

    const allowed = await checkPermission(user.id, projectId, "task.edit", { isOwnResource })
    if (!allowed) return forbidden()

    const attachment = {
      id: generateId("att"),
      name: parsed.data.name,
      url: parsed.data.url,
      size: parsed.data.size,
      type: parsed.data.type,
      uploadedBy: new (await import("mongoose")).Types.ObjectId(user.id),
      uploadedAt: new Date(),
    }

    task.attachments.push(attachment)
    await task.save()

    await logAudit({
      organizationId: user.organizationId,
      projectId,
      actorId: user.id,
      action: "task.attachment_added",
      entityType: "task",
      entityId: id,
      changes: { attachment: { before: null, after: attachment.name } },
    })

    emitToRoom(projectRoom(projectId), "task:updated", {
      taskId: id,
      changes: { attachments: task.attachments },
    })

    return NextResponse.json({ data: task.attachments }, { status: 201 })
  } catch (err) {
    return serverError(err)
  }
}

// DELETE /api/tasks/[id]/attachments?attachmentId=...
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    const attachmentId = req.nextUrl.searchParams.get("attachmentId")
    if (!attachmentId) return badRequest("attachmentId query param is required")

    await connectDB()

    const task = await Task.findById(id)
    if (!task) return notFound("Task")

    const projectId = task.projectId.toString()
    const isOwnResource =
      task.createdBy.toString() === user.id ||
      task.assignees.some((a) => a.toString() === user.id)

    const allowed = await checkPermission(user.id, projectId, "task.edit", { isOwnResource })
    if (!allowed) return forbidden()

    task.attachments = task.attachments.filter((a) => a.id !== attachmentId)
    await task.save()

    emitToRoom(projectRoom(projectId), "task:updated", {
      taskId: id,
      changes: { attachments: task.attachments },
    })

    return NextResponse.json({ data: task.attachments })
  } catch (err) {
    return serverError(err)
  }
}
