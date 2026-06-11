import mongoose, { Schema, Document, Model, Types } from "mongoose"

export interface IUser extends Document {
  _id: Types.ObjectId
  name: string
  email: string
  password?: string
  avatar?: string
  role: "superadmin" | "admin" | "member" | "guest"
  organizationId: Types.ObjectId
  teams: Types.ObjectId[]
  isActive: boolean
  lastSeen: Date
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
      enum: ["superadmin", "admin", "member", "guest"],
      default: "member",
    },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    teams: [{ type: Schema.Types.ObjectId }],
    isActive: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now },
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
