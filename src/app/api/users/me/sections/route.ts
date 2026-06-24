import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User, DEFAULT_MY_TASKS_SECTIONS } from "@/models/User"
import { getSessionUser, unauthorized, notFound, badRequest, serverError } from "@/lib/api-utils"
import { updateMyTasksSectionsSchema } from "@/lib/validations"

// GET /api/users/me/sections - the current user's My Tasks sections
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    await connectDB()

    const target = await User.findById(user.id).select("myTasksSections")
    if (!target) return notFound("User")

    const sections = target.myTasksSections.length > 0 ? target.myTasksSections : DEFAULT_MY_TASKS_SECTIONS

    return NextResponse.json({ data: sections })
  } catch (err) {
    return serverError(err)
  }
}

// PUT /api/users/me/sections - persist the current user's My Tasks sections
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const body = await req.json()
    const parsed = updateMyTasksSectionsSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const target = await User.findById(user.id)
    if (!target) return notFound("User")

    target.myTasksSections = parsed.data.sections
    await target.save()

    return NextResponse.json({ data: target.myTasksSections })
  } catch (err) {
    return serverError(err)
  }
}
