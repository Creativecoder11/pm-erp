import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User } from "@/models/User"
import { Organization } from "@/models/Organization"
import { Team } from "@/models/Team"
import { Project } from "@/models/Project"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { updateUserSchema } from "@/lib/validations"
import { logAudit } from "@/lib/audit"

interface Params {
  params: Promise<{ id: string }>
}

// Only the super admin can manage another admin (or grant/revoke admin); a
// regular admin can only manage members.
function canManage(actorRole: string, targetRole: string) {
  if (targetRole === "superadmin") return false
  if (targetRole === "admin") return actorRole === "superadmin"
  return actorRole === "admin" || actorRole === "superadmin"
}

// GET /api/users/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const target = await User.findOne({ _id: id, organizationId: user.organizationId }).select(
      "name email avatar role status lastSeen preferences createdAt"
    )
    if (!target) return notFound("User")

    return NextResponse.json({ data: target })
  } catch (err) {
    return serverError(err)
  }
}

// PUT /api/users/[id] - update own profile/preferences, or (if permitted) another user's role/status
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    const body = await req.json()
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const target = await User.findOne({ _id: id, organizationId: user.organizationId })
    if (!target) return notFound("User")

    const isSelf = id === user.id
    const isOrgAdmin = user.role === "admin" || user.role === "superadmin"
    const data = parsed.data

    if (!isSelf && !isOrgAdmin) return forbidden()

    const wantsRoleOrStatusChange = data.role !== undefined || data.status !== undefined

    // Nobody changes their own role/status here, and only someone who outranks
    // the target's CURRENT role (per canManage) can change someone else's.
    if (wantsRoleOrStatusChange && (isSelf || !canManage(user.role, target.role))) {
      return forbidden()
    }

    // Granting Admin is itself an admin-level change: only the super admin can do it,
    // regardless of the target's current (lower) role.
    if (data.role === "admin" && user.role !== "superadmin") return forbidden()

    const before = { role: target.role, status: target.status }

    if (isSelf) {
      if (data.name !== undefined) target.name = data.name
      if (data.avatar !== undefined) target.avatar = data.avatar
      if (data.preferences) {
        target.preferences = {
          ...target.preferences,
          ...data.preferences,
          notifications: {
            ...target.preferences.notifications,
            ...data.preferences.notifications,
          },
        }
      }
    }

    if (wantsRoleOrStatusChange) {
      if (data.role !== undefined) target.role = data.role
      if (data.status !== undefined) target.status = data.status
    }

    if (isOrgAdmin && !isSelf && data.name !== undefined) target.name = data.name

    await target.save()

    if (wantsRoleOrStatusChange) {
      await logAudit({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "member.updated",
        entityType: "member",
        entityId: id,
        changes: {
          role: { before: before.role, after: target.role },
          status: { before: before.status, after: target.status },
        },
      })
    }

    return NextResponse.json({ data: target })
  } catch (err) {
    return serverError(err)
  }
}

// DELETE /api/users/[id] - permanently remove a user from the organization
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    if (id === user.id) return badRequest("You can't delete your own account")

    const isOrgAdmin = user.role === "admin" || user.role === "superadmin"
    if (!isOrgAdmin) return forbidden()

    await connectDB()

    const target = await User.findOne({ _id: id, organizationId: user.organizationId })
    if (!target) return notFound("User")

    if (!canManage(user.role, target.role)) return forbidden()

    const ownedProjects = await Project.countDocuments({ ownerId: target._id })
    if (ownedProjects > 0) {
      return badRequest(
        `This user owns ${ownedProjects} project${ownedProjects === 1 ? "" : "s"}. Reassign ownership before deleting.`
      )
    }

    await Organization.updateOne(
      { _id: user.organizationId },
      { $pull: { members: { userId: target._id } } }
    )
    await Team.updateMany({ organizationId: user.organizationId }, { $pull: { members: target._id } })
    await Project.updateMany(
      { organizationId: user.organizationId },
      { $pull: { members: { userId: target._id } } }
    )

    await target.deleteOne()

    await logAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "member.deleted",
      entityType: "member",
      entityId: id,
      changes: { name: { before: target.name, after: null } },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    return serverError(err)
  }
}
