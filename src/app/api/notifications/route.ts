import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Notification } from "@/models/Notification"
import { getSessionUser, unauthorized, serverError } from "@/lib/api-utils"

// GET /api/notifications?unread=true&page=&limit=
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    await connectDB()

    const sp = req.nextUrl.searchParams
    const unreadOnly = sp.get("unread") === "true"
    const page = Math.max(1, Number(sp.get("page") ?? "1"))
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? "10")))

    const filter: Record<string, unknown> = { userId: user.id }
    if (unreadOnly) filter.isRead = false

    const [data, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: user.id, isRead: false }),
    ])

    return NextResponse.json({
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    })
  } catch (err) {
    return serverError(err)
  }
}
