import mongoose, { Schema, Document, Model, Types } from "mongoose"

export type NotificationType =
  | "task_assigned"
  | "task_due"
  | "mentioned"
  | "comment_added"
  | "project_invite"
  | "status_changed"
  | "deadline_reminder"

export interface INotification extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  type: NotificationType
  title: string
  body: string
  link: string
  isRead: boolean
  metadata: Record<string, unknown>
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_due",
        "mentioned",
        "comment_added",
        "project_invite",
        "status_changed",
        "deadline_reminder",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema)
