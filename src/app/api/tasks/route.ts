import { NextRequest, NextResponse } from "next/server"
import { QueryFilter } from "mongoose"
import { connectDB } from "@/lib/db"
import { Task, ITask } from "@/models/Task"
import { Project } from "@/models/Project"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { createTaskSchema } from "@/lib/validations"
import { checkPermission } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { emitToRoom, projectRoom } from "@/lib/socket-emit"
import { notifyUser } from "@/lib/notifications"

// GET /api/tasks?assignee=me&dueBefore=&dueAfter=&status=&limit=
// Used for "My Tasks" widgets that span multiple projects.
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    await connectDB()

    const sp = req.nextUrl.searchParams
    const assignee = sp.get("assignee")
    const dueBefore = sp.get("dueBefore")
    const dueAfter = sp.get("dueAfter")
    const status = sp.get("status")
    const search = sp.get("search")
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "50")))

    const filter: QueryFilter<ITask> = { organizationId: user.organizationId }

    if (assignee === "me") {
      filter.assignees = user.id
    } else if (assignee) {
      filter.assignees = assignee
    }

    if (status) filter.status = status

    if (search) filter.$text = { $search: search }

    if (dueBefore || dueAfter) {
      filter.dueDate = {}
      if (dueBefore) filter.dueDate.$lte = new Date(dueBefore)
      if (dueAfter) filter.dueDate.$gte = new Date(dueAfter)
    }

    const tasks = await Task.find(filter)
      .populate("assignees", "name email avatar")
      .populate("projectId", "name color columns")
      .sort({ dueDate: 1, priority: -1 })
      .limit(limit)

    return NextResponse.json({ data: tasks })
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/tasks - create a task
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const body = await req.json()
    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const data = parsed.data

    const allowed = await checkPermission(user.id, data.projectId, "task.create")
    if (!allowed) return forbidden()

    const project = await Project.findById(data.projectId)
    if (!project) return notFound("Project")

    const status = data.status ?? project.columns[0]?.id ?? "todo"

    const lastInColumn = await Task.findOne({ projectId: data.projectId, status }).sort({
      order: -1,
    })
    const order = (lastInColumn?.order ?? -1) + 1

    const task = await Task.create({
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      organizationId: user.organizationId,
      parentTaskId: data.parentTaskId,
      status,
      sectionId: data.sectionId,
      priority: data.priority,
      assignees: data.assignees,
      createdBy: user.id,
      startDate: data.startDate,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      tags: data.tags,
      customFields: data.customFields ?? {},
      storyPoints: data.storyPoints,
      sprintId: data.sprintId,
      order,
    })

    if (data.myTasksSectionId) {
      task.myTasksSections.set(user.id, data.myTasksSectionId)
      await task.save()
    }

    const populated = await task.populate([
      { path: "assignees", select: "name email avatar" },
      { path: "createdBy", select: "name email avatar" },
    ])

    await logAudit({
      organizationId: user.organizationId,
      projectId: data.projectId,
      actorId: user.id,
      action: "task.created",
      entityType: "task",
      entityId: task._id.toString(),
      changes: { title: { before: null, after: task.title } },
    })

    emitToRoom(projectRoom(data.projectId), "task:created", populated)

    for (const assigneeId of data.assignees) {
      if (assigneeId === user.id) continue
      await notifyUser({
        userId: assigneeId,
        type: "task_assigned",
        title: task.title,
        body: `You were assigned to "${task.title}" in ${project.name}`,
        link: `/projects/${data.projectId}/board?task=${task._id.toString()}`,
        metadata: { projectId: data.projectId, projectName: project.name, taskId: task._id.toString() },
      })
    }

    return NextResponse.json({ data: populated }, { status: 201 })
  } catch (err) {
    return serverError(err)
  }
}
