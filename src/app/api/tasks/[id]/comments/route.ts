import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Task } from "@/models/Task"
import { Comment } from "@/models/Comment"
import { User } from "@/models/User"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { createCommentSchema } from "@/lib/validations"
import { checkPermission } from "@/lib/rbac"
import { emitToRoom, projectRoom } from "@/lib/socket-emit"
import { notifyUser } from "@/lib/notifications"

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/tasks/[id]/comments
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const task = await Task.findById(id).select("projectId")
    if (!task) return notFound("Task")

    const allowed = await checkPermission(user.id, task.projectId.toString(), "task.view")
    if (!allowed) return forbidden()

    const comments = await Comment.find({ taskId: id })
      .populate("authorId", "name email avatar")
      .populate("mentions", "name email avatar")
      .sort({ createdAt: 1 })

    return NextResponse.json({ data: comments })
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/tasks/[id]/comments
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    const body = await req.json()
    const parsed = createCommentSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const task = await Task.findById(id)
    if (!task) return notFound("Task")

    const projectId = task.projectId.toString()
    const allowed = await checkPermission(user.id, projectId, "comment.create")
    if (!allowed) return forbidden()

    const comment = await Comment.create({
      taskId: id,
      projectId,
      authorId: user.id,
      content: parsed.data.content,
      mentions: parsed.data.mentions,
    })

    const populated = await comment.populate([
      { path: "authorId", select: "name email avatar" },
      { path: "mentions", select: "name email avatar" },
    ])

    // Auto-watch the task for the commenter
    if (!task.watchers.some((w) => w.toString() === user.id)) {
      task.watchers.push(new (await import("mongoose")).Types.ObjectId(user.id))
      await task.save()
    }

    emitToRoom(projectRoom(projectId), "comment:added", populated)

    const author = await User.findById(user.id).select("name")

    for (const mentionedId of parsed.data.mentions) {
      if (mentionedId === user.id) continue
      await notifyUser({
        userId: mentionedId,
        type: "mentioned",
        title: task.title,
        body: `${author?.name ?? "Someone"} mentioned you in "${task.title}"`,
        link: `/projects/${projectId}/board?task=${id}`,
        metadata: { authorName: author?.name, taskId: id, projectId },
      })
    }

    const watcherIds = task.watchers
      .map((w) => w.toString())
      .filter((w) => w !== user.id && !parsed.data.mentions.includes(w))

    for (const watcherId of watcherIds) {
      await notifyUser({
        userId: watcherId,
        type: "comment_added",
        title: task.title,
        body: `${author?.name ?? "Someone"} commented on "${task.title}"`,
        link: `/projects/${projectId}/board?task=${id}`,
        metadata: { authorName: author?.name, taskId: id, projectId },
      })
    }

    return NextResponse.json({ data: populated }, { status: 201 })
  } catch (err) {
    return serverError(err)
  }
}
