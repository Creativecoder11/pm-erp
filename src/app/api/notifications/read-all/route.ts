import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Notification } from "@/models/Notification"
import { getSessionUser, unauthorized, serverError } from "@/lib/api-utils"

// PUT /api/notifications/read-all
export async function PUT() {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    await connectDB()

    await Notification.updateMany({ userId: user.id, isRead: false }, { isRead: true })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    return serverError(err)
  }
}
