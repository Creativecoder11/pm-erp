import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import { User } from "@/models/User"
import { provisionNewUser } from "@/lib/onboarding"
import { badRequest, serverError } from "@/lib/api-utils"
import { registerSchema } from "@/lib/validations"

// POST /api/auth/register - sign up. The first person ever to register
// becomes Super Admin and is active immediately; everyone after that joins
// as a pending Member awaiting admin approval.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const { name, email, password } = parsed.data

    const existing = await User.findOne({ email })
    if (existing) return badRequest("An account with this email already exists")

    const hashed = await bcrypt.hash(password, 10)
    const { user, isFirstUser } = await provisionNewUser({ name, email, password: hashed })

    return NextResponse.json(
      { data: { id: user._id.toString(), email: user.email, isFirstUser, status: user.status } },
      { status: 201 }
    )
  } catch (err) {
    return serverError(err)
  }
}
