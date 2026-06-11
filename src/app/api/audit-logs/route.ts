import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { AuditLog } from "@/models/AuditLog"
import { getSessionUser, unauthorized, serverError } from "@/lib/api-utils"

// GET /api/audit-logs - last 20 audit log entries for the user's organization
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    await connectDB()

    const logs = await AuditLog.find({ organizationId: user.organizationId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("actorId", "name avatar")

    return NextResponse.json({ data: logs })
  } catch (err) {
    return serverError(err)
  }
}
