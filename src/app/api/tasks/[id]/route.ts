import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Task } from "@/models/Task"
import { Project } from "@/models/Project"
import { Comment } from "@/models/Comment"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { updateTaskSchema } from "@/lib/validations"
import { checkPermission } from "@/lib/rbac"
import { logAudit, diffFields } from "@/lib/audit"
import { emitToRoom, projectRoom } from "@/lib/socket-emit"
import { notifyUser } from "@/lib/notifications"

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/tasks/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const task = await Task.findById(id)
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("watchers", "name email avatar")
      .populate("dependencies.taskId", "title status")

    if (!task) return notFound("Task")

    const allowed = await checkPermission(user.id, task.projectId.toString(), "task.view")
    if (!allowed) return forbidden()

    return NextResponse.json({ data: task })
  } catch (err) {
    return serverError(err)
  }
}

// PUT /api/tasks/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    const body = await req.json()
    const parsed = updateTaskSchema.safeParse(body)
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

    const before = task.toObject()
    const data = parsed.data
    const previousStatus = task.status
    const previousAssignees = task.assignees.map((a) => a.toString())

    const { myTasksSectionId, ...taskUpdates } = data

    Object.assign(task, taskUpdates)

    if (myTasksSectionId !== undefined) {
      if (myTasksSectionId === null) {
        task.myTasksSections.delete(user.id)
      } else {
        task.myTasksSections.set(user.id, myTasksSectionId)
      }
      task.markModified("myTasksSections")
    }

    // Mark completedAt when the task moves into the project's last column,
    // and clear it when moved out of that column.
    if (data.status && data.status !== previousStatus) {
      const project = await Project.findById(projectId).select("columns name")
      const lastColumn = [...(project?.columns ?? [])].sort((a, b) => b.order - a.order)[0]

      if (lastColumn && data.status === lastColumn.id) {
        task.completedAt = new Date()
      } else if (lastColumn && previousStatus === lastColumn.id) {
        task.completedAt = undefined
      }
    }

    await task.save()

    const populated = await task.populate([
      { path: "assignees", select: "name email avatar" },
      { path: "createdBy", select: "name email avatar" },
    ])

    const changes = diffFields(
      before as unknown as Record<string, unknown>,
      taskUpdates as Record<string, unknown>
    )

    await logAudit({
      organizationId: user.organizationId,
      projectId,
      actorId: user.id,
      action: "task.updated",
      entityType: "task",
      entityId: id,
      changes,
    })

    emitToRoom(projectRoom(projectId), "task:updated", { taskId: id, changes: data })

    if (data.status && data.status !== previousStatus) {
      emitToRoom(projectRoom(projectId), "task:moved", {
        taskId: id,
        fromColumn: previousStatus,
        toColumn: data.status,
      })
    }

    if (data.assignees) {
      const project = await Project.findById(projectId).select("name")
      const newlyAssigned = data.assignees.filter((a) => !previousAssignees.includes(a))
      for (const assigneeId of newlyAssigned) {
        if (assigneeId === user.id) continue
        await notifyUser({
          userId: assigneeId,
          type: "task_assigned",
          title: task.title,
          body: `You were assigned to "${task.title}" in ${project?.name ?? "a project"}`,
          link: `/projects/${projectId}/board?task=${id}`,
          metadata: { projectId, projectName: project?.name, taskId: id },
        })
      }
    }

    return NextResponse.json({ data: populated })
  } catch (err) {
    return serverError(err)
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const task = await Task.findById(id)
    if (!task) return notFound("Task")

    const projectId = task.projectId.toString()
    const allowed = await checkPermission(user.id, projectId, "task.delete")
    if (!allowed) return forbidden()

    await Comment.deleteMany({ taskId: id })
    await Task.deleteMany({ parentTaskId: id })
    await task.deleteOne()

    await logAudit({
      organizationId: user.organizationId,
      projectId,
      actorId: user.id,
      action: "task.deleted",
      entityType: "task",
      entityId: id,
      changes: { title: { before: task.title, after: null } },
    })

    emitToRoom(projectRoom(projectId), "task:deleted", { taskId: id })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    return serverError(err)
  }
}
