import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Task } from "@/models/Task"
import { Project } from "@/models/Project"
import { notifyUser } from "@/lib/notifications"
import { serverError } from "@/lib/api-utils"

// GET /api/cron/due-reminders
// Intended to be triggered by an external scheduler (e.g. Vercel Cron).
// Authenticated via a shared secret rather than a user session.
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get("authorization")

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const startOfTomorrow = new Date()
    startOfTomorrow.setHours(0, 0, 0, 0)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

    const startOfDayAfterTomorrow = new Date(startOfTomorrow)
    startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 1)

    const tasks = await Task.find({
      dueDate: { $gte: startOfTomorrow, $lt: startOfDayAfterTomorrow },
      completedAt: null,
    })
      .populate("projectId", "name")
      .lean()

    let remindersSent = 0

    for (const task of tasks) {
      const project = task.projectId as unknown as { _id: unknown; name: string } | null
      const projectName = project?.name ?? ""
      const projectId = project?._id?.toString() ?? task.projectId?.toString()

      for (const assigneeId of task.assignees) {
        await notifyUser({
          userId: assigneeId.toString(),
          type: "deadline_reminder",
          title: "Task due tomorrow",
          body: `"${task.title}" is due tomorrow`,
          link: `/projects/${projectId}/board?task=${task._id}`,
          metadata: { projectName, taskTitle: task.title },
        })
        remindersSent += 1
      }
    }

    return NextResponse.json({ data: { remindersSent } })
  } catch (err) {
    return serverError(err)
  }
}
