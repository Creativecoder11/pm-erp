import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Organization } from "@/models/Organization"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { updateOrganizationSchema } from "@/lib/validations"
import { logAudit, diffFields } from "@/lib/audit"

// GET /api/organizations - the current user's organization
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    await connectDB()

    const org = await Organization.findById(user.organizationId)
    if (!org) return notFound("Organization")

    return NextResponse.json({ data: org })
  } catch (err) {
    return serverError(err)
  }
}

// PUT /api/organizations - update organization name, logo, and settings
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const body = await req.json()
    const parsed = updateOrganizationSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const org = await Organization.findById(user.organizationId)
    if (!org) return notFound("Organization")

    const isOrgAdmin = user.role === "admin" || user.role === "superadmin"
    if (!isOrgAdmin) return forbidden()

    const before = org.toObject()

    if (parsed.data.name !== undefined) org.name = parsed.data.name
    if (parsed.data.logo !== undefined) org.logo = parsed.data.logo
    if (parsed.data.settings) {
      org.settings = {
        ...org.settings,
        ...parsed.data.settings,
      }
    }

    await org.save()

    const changes = diffFields(
      before as unknown as Record<string, unknown>,
      parsed.data as Record<string, unknown>
    )

    await logAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "organization.updated",
      entityType: "organization",
      entityId: org._id.toString(),
      changes,
    })

    return NextResponse.json({ data: org })
  } catch (err) {
    return serverError(err)
  }
}
