import {
  UserPlus,
  Clock,
  AtSign,
  MessageSquare,
  Mail,
  ArrowRightLeft,
  AlarmClock,
  type LucideIcon,
} from "lucide-react"
import type { NotificationType } from "@/types"

export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  task_assigned: UserPlus,
  task_due: Clock,
  mentioned: AtSign,
  comment_added: MessageSquare,
  project_invite: Mail,
  status_changed: ArrowRightLeft,
  deadline_reminder: AlarmClock,
}
