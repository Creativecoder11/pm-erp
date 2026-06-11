import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import { User } from "@/models/User"
import { Organization } from "@/models/Organization"
import { badRequest, serverError } from "@/lib/api-utils"
import { registerSchema } from "@/lib/validations"

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") || "org"
  )
}

// POST /api/auth/register - sign up a new organization owner
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const { name, email, password, organizationName } = parsed.data

    const existing = await User.findOne({ email })
    if (existing) return badRequest("An account with this email already exists")

    const baseSlug = slugify(organizationName)
    let slug = baseSlug
    let suffix = 1
    while (await Organization.findOne({ slug })) {
      slug = `${baseSlug}-${suffix++}`
    }

    const hashed = await bcrypt.hash(password, 10)

    const placeholderOwnerId = new (await import("mongoose")).Types.ObjectId()
    const org = await Organization.create({
      name: organizationName,
      slug,
      ownerId: placeholderOwnerId,
      members: [],
      settings: {
        allowPublicProjects: false,
        defaultProjectVisibility: "private",
        maxMembers: 10,
      },
    })

    const newUser = await User.create({
      name,
      email,
      password: hashed,
      role: "admin",
      organizationId: org._id,
    })

    org.ownerId = newUser._id
    org.members.push({ userId: newUser._id, role: "owner", joinedAt: new Date() })
    await org.save()

    return NextResponse.json(
      { data: { id: newUser._id.toString(), email: newUser.email } },
      { status: 201 }
    )
  } catch (err) {
    return serverError(err)
  }
}
