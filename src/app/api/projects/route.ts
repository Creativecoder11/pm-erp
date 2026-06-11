import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import { connectDB } from "@/lib/db"
import { Project, DEFAULT_COLUMNS } from "@/models/Project"
import { getSessionUser, unauthorized, badRequest, serverError } from "@/lib/api-utils"
import { createProjectSchema } from "@/lib/validations"
import { logAudit } from "@/lib/audit"

// GET /api/projects - list projects for the current user's org
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    await connectDB()

    const orgId = new Types.ObjectId(user.organizationId)
    const userId = new Types.ObjectId(user.id)

    const isOrgAdmin = user.role === "admin" || user.role === "superadmin"

    const visibilityFilter = isOrgAdmin
      ? {}
      : {
          $or: [
            { visibility: { $in: ["public", "team"] } },
            { ownerId: userId },
            { "members.userId": userId },
          ],
        }

    const projects = await Project.aggregate([
      { $match: { organizationId: orgId, ...visibilityFilter } },
      {
        $lookup: {
          from: "tasks",
          localField: "_id",
          foreignField: "projectId",
          as: "tasks",
        },
      },
      {
        $addFields: {
          memberCount: { $size: "$members" },
          taskCount: { $size: "$tasks" },
          completedTaskCount: {
            $size: {
              $filter: {
                input: "$tasks",
                cond: { $ne: ["$$this.completedAt", null] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $eq: ["$taskCount", 0] },
              0,
              { $multiply: [{ $divide: ["$completedTaskCount", "$taskCount"] }, 100] },
            ],
          },
        },
      },
      { $project: { tasks: 0 } },
      { $sort: { updatedAt: -1 } },
    ])

    return NextResponse.json({ data: projects })
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/projects - create a project with default kanban columns
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const body = await req.json()
    const parsed = createProjectSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const data = parsed.data
    const project = await Project.create({
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      organizationId: user.organizationId,
      ownerId: user.id,
      members: [{ userId: user.id, role: "manager" }],
      visibility: data.visibility,
      startDate: data.startDate || undefined,
      dueDate: data.dueDate || undefined,
      tags: data.tags,
      columns: DEFAULT_COLUMNS,
    })

    await logAudit({
      organizationId: user.organizationId,
      projectId: project._id.toString(),
      actorId: user.id,
      action: "project.created",
      entityType: "project",
      entityId: project._id.toString(),
      changes: { name: { before: null, after: project.name } },
    })

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (err) {
    return serverError(err)
  }
}
