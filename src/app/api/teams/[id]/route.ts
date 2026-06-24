import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import { connectDB } from "@/lib/db"
import { Team } from "@/models/Team"
import { User } from "@/models/User"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { updateTeamSchema } from "@/lib/validations"
import { logAudit } from "@/lib/audit"

interface Params {
  params: Promise<{ id: string }>
}

// PUT /api/teams/[id] - rename a department or update its members (org admin only)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const isOrgAdmin = user.role === "admin" || user.role === "superadmin"
    if (!isOrgAdmin) return forbidden()

    const { id } = await params
    const body = await req.json()
    const parsed = updateTeamSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const team = await Team.findOne({ _id: id, organizationId: user.organizationId })
    if (!team) return notFound("Team")

    const before = { name: team.name, memberCount: team.members.length }

    if (parsed.data.name !== undefined) team.name = parsed.data.name

    if (parsed.data.members !== undefined) {
      const validMemberIds = await User.find({
        _id: { $in: parsed.data.members.filter((mid) => Types.ObjectId.isValid(mid)) },
        organizationId: user.organizationId,
      }).distinct("_id")
      team.members = validMemberIds
    }

    await team.save()

    const populated = await team.populate("members", "name email avatar")

    await logAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "team.updated",
      entityType: "organization",
      entityId: team._id.toString(),
      changes: {
        name: { before: before.name, after: team.name },
        memberCount: { before: before.memberCount, after: team.members.length },
      },
    })

    return NextResponse.json({ data: populated })
  } catch (err) {
    return serverError(err)
  }
}

// DELETE /api/teams/[id] - delete a department (org admin only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const isOrgAdmin = user.role === "admin" || user.role === "superadmin"
    if (!isOrgAdmin) return forbidden()

    const { id } = await params
    await connectDB()

    const team = await Team.findOne({ _id: id, organizationId: user.organizationId })
    if (!team) return notFound("Team")

    await team.deleteOne()

    await logAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "team.deleted",
      entityType: "organization",
      entityId: id,
      changes: { name: { before: team.name, after: null } },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    return serverError(err)
  }
}
