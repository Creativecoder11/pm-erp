import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import { User } from "@/models/User"
import { Organization } from "@/models/Organization"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { inviteUserSchema } from "@/lib/validations"
import { logAudit } from "@/lib/audit"
import { sendEmail, projectInviteEmail } from "@/lib/email"

// POST /api/users/invite - invite a new member to the organization
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const isOrgAdmin = user.role === "admin" || user.role === "superadmin"
    if (!isOrgAdmin) return forbidden()

    const body = await req.json()
    const parsed = inviteUserSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const org = await Organization.findById(user.organizationId)
    if (!org) return badRequest("Organization not found")

    let invitedUser = await User.findOne({ email: parsed.data.email })

    if (!invitedUser) {
      const tempPassword = crypto.randomBytes(16).toString("hex")
      const hashed = await bcrypt.hash(tempPassword, 10)

      invitedUser = await User.create({
        name: parsed.data.email.split("@")[0],
        email: parsed.data.email,
        password: hashed,
        role: parsed.data.role,
        organizationId: org._id,
        isActive: false,
      })
    }

    const alreadyMember = org.members.some((m) => m.userId.equals(invitedUser!._id))
    if (!alreadyMember) {
      org.members.push({
        userId: invitedUser._id,
        role: parsed.data.role === "admin" ? "admin" : parsed.data.role,
        joinedAt: new Date(),
      })
      await org.save()
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    const inviteLink = `${baseUrl}/login?invited=${encodeURIComponent(parsed.data.email)}`

    try {
      const email = projectInviteEmail(org.name, inviteLink)
      await sendEmail({ to: parsed.data.email, ...email })
    } catch (err) {
      console.error("Failed to send invite email", err)
    }

    await logAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "member.invited",
      entityType: "member",
      entityId: invitedUser._id.toString(),
      changes: { role: { before: null, after: parsed.data.role } },
    })

    return NextResponse.json({ data: { email: parsed.data.email, role: parsed.data.role } }, { status: 201 })
  } catch (err) {
    return serverError(err)
  }
}
