import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User } from "@/models/User"
import { getSessionUser, unauthorized, serverError } from "@/lib/api-utils"

// GET /api/users?search=&limit= - list members of the current org
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    await connectDB()

    const sp = req.nextUrl.searchParams
    const search = sp.get("search")
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? "50")))

    const filter: Record<string, unknown> = { organizationId: user.organizationId }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ]
    }

    const users = await User.find(filter)
      .select("name email avatar role status lastSeen")
      .sort({ name: 1 })
      .limit(limit)

    return NextResponse.json({ data: users })
  } catch (err) {
    return serverError(err)
  }
}
