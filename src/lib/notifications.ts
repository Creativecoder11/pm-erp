import { Notification, type NotificationType } from "@/models/Notification"
import { User } from "@/models/User"
import { emitToRoom, userRoom } from "@/lib/socket-emit"
import {
  sendEmail,
  taskAssignedEmail,
  mentionedEmail,
  taskDueTomorrowEmail,
} from "@/lib/email"

interface NotifyParams {
  userId: string
  type: NotificationType
  title: string
  body: string
  link: string
  metadata?: Record<string, unknown>
}

/**
 * Creates an in-app notification, emits it over Socket.IO to the user's
 * room, and (depending on preferences) sends an email for select types.
 */
export async function notifyUser({ userId, type, title, body, link, metadata }: NotifyParams) {
  const notification = await Notification.create({ userId, type, title, body, link, metadata })

  emitToRoom(userRoom(userId), "notification:new", notification)

  const user = await User.findById(userId).select("email preferences")
  if (!user || !user.preferences?.notifications?.email) return notification

  const prefs = user.preferences.notifications
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const fullLink = `${baseUrl}${link}`

  try {
    if (type === "task_assigned" && prefs.taskAssigned) {
      const email = taskAssignedEmail(title, String(metadata?.projectName ?? ""), fullLink)
      await sendEmail({ to: user.email, ...email })
    } else if (type === "mentioned" && prefs.mentions) {
      const email = mentionedEmail(String(metadata?.authorName ?? "Someone"), title, fullLink)
      await sendEmail({ to: user.email, ...email })
    } else if (type === "deadline_reminder" && prefs.taskDue) {
      const email = taskDueTomorrowEmail(title, String(metadata?.projectName ?? ""), fullLink)
      await sendEmail({ to: user.email, ...email })
    }
  } catch (err) {
    console.error("Failed to send notification email", err)
  }

  return notification
}
