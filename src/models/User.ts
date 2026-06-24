import mongoose, { Schema, Document, Model, Types } from "mongoose"
import { ProjectSectionSchema, type IProjectSection } from "./Project"

export interface IUser extends Document {
  _id: Types.ObjectId
  name: string
  email: string
  password?: string
  avatar?: string
  role: "superadmin" | "admin" | "member"
  organizationId: Types.ObjectId
  teams: Types.ObjectId[]
  status: "pending" | "active" | "blocked"
  lastSeen: Date
  myTasksSections: IProjectSection[]
  preferences: {
    theme: "light" | "dark"
    notifications: {
      email: boolean
      inApp: boolean
      taskAssigned: boolean
      taskDue: boolean
      mentions: boolean
    }
  }
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    avatar: { type: String },
    role: {
      type: String,
      enum: ["superadmin", "admin", "member"],
      default: "member",
    },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    teams: [{ type: Schema.Types.ObjectId }],
    status: {
      type: String,
      enum: ["pending", "active", "blocked"],
      default: "active",
    },
    lastSeen: { type: Date, default: Date.now },
    myTasksSections: { type: [ProjectSectionSchema], default: [] },
    preferences: {
      theme: { type: String, enum: ["light", "dark"], default: "light" },
      notifications: {
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        taskAssigned: { type: Boolean, default: true },
        taskDue: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
)

UserSchema.index({ organizationId: 1 })

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema)

export const DEFAULT_MY_TASKS_SECTIONS: IProjectSection[] = [
  { id: "recently_assigned", name: "Recently assigned", order: 0 },
  { id: "do_today", name: "Do today", order: 1 },
  { id: "do_next_week", name: "Do next week", order: 2 },
  { id: "do_later", name: "Do later", order: 3 },
]
