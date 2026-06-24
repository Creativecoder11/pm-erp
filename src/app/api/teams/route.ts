import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import { connectDB } from "@/lib/db"
import { Team } from "@/models/Team"
import { User } from "@/models/User"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { createTeamSchema } from "@/lib/validations"
import { logAudit } from "@/lib/audit"

// GET /api/teams - list departments of the current org (members populated)
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    await connectDB()

    const teams = await Team.find({ organizationId: user.organizationId })
      .populate("members", "name email avatar")
      .sort({ name: 1 })

    return NextResponse.json({ data: teams })
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/teams - create a department (org admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const isOrgAdmin = user.role === "admin" || user.role === "superadmin"
    if (!isOrgAdmin) return forbidden()

    const body = await req.json()
    const parsed = createTeamSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    // Only allow members that belong to this organization
    const validMemberIds = await User.find({
      _id: { $in: parsed.data.members.filter((id) => Types.ObjectId.isValid(id)) },
      organizationId: user.organizationId,
    }).distinct("_id")

    const team = await Team.create({
      name: parsed.data.name,
      organizationId: user.organizationId,
      members: validMemberIds,
    })

    const populated = await team.populate("members", "name email avatar")

    await logAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "team.created",
      entityType: "organization",
      entityId: team._id.toString(),
      changes: { name: { before: null, after: team.name } },
    })

    return NextResponse.json({ data: populated }, { status: 201 })
  } catch (err) {
    return serverError(err)
  }
}
