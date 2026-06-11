import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Notification } from "@/models/Notification"
import { getSessionUser, unauthorized, notFound, serverError } from "@/lib/api-utils"

interface Params {
  params: Promise<{ id: string }>
}

// PUT /api/notifications/[id]/read
export async function PUT(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user.id },
      { isRead: true },
      { new: true }
    )
    if (!notification) return notFound("Notification")

    return NextResponse.json({ data: notification })
  } catch (err) {
    return serverError(err)
  }
}
