import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/db"
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
import { checkPermission } from "@/lib/rbac"
import { emitToRoom, projectRoom } from "@/lib/socket-emit"

interface Params {
  params: Promise<{ id: string; commentId: string }>
}

const toggleReactionSchema = z.object({
  emoji: z.string().min(1).max(8),
})

// PATCH /api/tasks/[id]/comments/[commentId] - toggle the current user's reaction
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id, commentId } = await params
    const body = await req.json()
    const parsed = toggleReactionSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const task = await Task.findById(id).select("projectId")
    if (!task) return notFound("Task")

    const projectId = task.projectId.toString()
    const allowed = await checkPermission(user.id, projectId, "comment.create")
    if (!allowed) return forbidden()

    const comment = await Comment.findOne({ _id: commentId, taskId: id })
    if (!comment) return notFound("Comment")

    const { emoji } = parsed.data
    const { Types } = await import("mongoose")
    const userObjectId = new Types.ObjectId(user.id)

    let reaction = comment.reactions.find((r) => r.emoji === emoji)
    if (!reaction) {
      reaction = { emoji, userIds: [] }
      comment.reactions.push(reaction)
    }

    const hasReacted = reaction.userIds.some((u) => u.toString() === user.id)
    if (hasReacted) {
      reaction.userIds = reaction.userIds.filter((u) => u.toString() !== user.id)
    } else {
      reaction.userIds.push(userObjectId)
    }

    comment.reactions = comment.reactions.filter((r) => r.userIds.length > 0)

    await comment.save()

    const populated = await comment.populate([
      { path: "authorId", select: "name email avatar" },
      { path: "mentions", select: "name email avatar" },
    ])

    emitToRoom(projectRoom(projectId), "comment:updated", populated)

    return NextResponse.json({ data: populated })
  } catch (err) {
    return serverError(err)
  }
}
