import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User } from "@/models/User"
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

// GET /api/users/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const target = await User.findOne({ _id: id, organizationId: user.organizationId }).select(
      "name email avatar role isActive lastSeen preferences createdAt"
    )
    if (!target) return notFound("User")

    return NextResponse.json({ data: target })
  } catch (err) {
    return serverError(err)
  }
}

// PUT /api/users/[id] - update own profile/preferences, or (if org admin) another user's role/status
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

    // Only org admins can change role/active status, and not for themselves
    if ((data.role !== undefined || data.isActive !== undefined) && !isOrgAdmin) {
      return forbidden()
    }

    const before = { role: target.role, isActive: target.isActive }

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

    if (isOrgAdmin) {
      if (data.role !== undefined) target.role = data.role
      if (data.isActive !== undefined) target.isActive = data.isActive
      if (!isSelf && data.name !== undefined) target.name = data.name
    }

    await target.save()

    if (data.role !== undefined || data.isActive !== undefined) {
      await logAudit({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "member.updated",
        entityType: "member",
        entityId: id,
        changes: {
          role: { before: before.role, after: target.role },
          isActive: { before: before.isActive, after: target.isActive },
        },
      })
    }

    return NextResponse.json({ data: target })
  } catch (err) {
    return serverError(err)
  }
}
