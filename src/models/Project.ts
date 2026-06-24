import mongoose, { Schema, Document, Model, Types } from "mongoose"

export interface IProjectMember {
  userId: Types.ObjectId
  role: "manager" | "member" | "viewer"
}

export interface ICustomFieldDef {
  id: string
  name: string
  type: "text" | "number" | "date" | "select" | "multiselect" | "checkbox"
  options?: string[]
  required: boolean
}

export interface IProjectColumn {
  id: string
  name: string
  color: string
  order: number
  limit?: number
}

export interface IProjectSection {
  id: string
  name: string
  order: number
}

export interface IProject extends Document {
  _id: Types.ObjectId
  name: string
  description?: string
  color: string
  icon?: string
  organizationId: Types.ObjectId
  ownerId: Types.ObjectId
  members: IProjectMember[]
  status: "active" | "on_hold" | "completed" | "archived"
  visibility: "public" | "private" | "team"
  startDate?: Date
  dueDate?: Date
  customFields: ICustomFieldDef[]
  columns: IProjectColumn[]
  sections: IProjectSection[]
  tags: string[]
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["manager", "member", "viewer"], default: "member" },
  },
  { _id: false }
)

const CustomFieldDefSchema = new Schema<ICustomFieldDef>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "number", "date", "select", "multiselect", "checkbox"],
      required: true,
    },
    options: [{ type: String }],
    required: { type: Boolean, default: false },
  },
  { _id: false }
)

const ProjectColumnSchema = new Schema<IProjectColumn>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, default: "#94a3b8" },
    order: { type: Number, required: true },
    limit: { type: Number },
  },
  { _id: false }
)

export const ProjectSectionSchema = new Schema<IProjectSection>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { _id: false }
)

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    color: { type: String, default: "#6366f1" },
    icon: { type: String },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [ProjectMemberSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "on_hold", "completed", "archived"],
      default: "active",
    },
    visibility: { type: String, enum: ["public", "private", "team"], default: "team" },
    startDate: { type: Date },
    dueDate: { type: Date },
    customFields: { type: [CustomFieldDefSchema], default: [] },
    columns: { type: [ProjectColumnSchema], default: [] },
    sections: { type: [ProjectSectionSchema], default: [] },
    tags: [{ type: String }],
    completedAt: { type: Date },
  },
  { timestamps: true }
)

ProjectSchema.index({ organizationId: 1, status: 1 })
ProjectSchema.index({ "members.userId": 1 })

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema)

export const DEFAULT_COLUMNS: IProjectColumn[] = [
  { id: "todo", name: "To Do", color: "#94a3b8", order: 0 },
  { id: "in_progress", name: "In Progress", color: "#3b82f6", order: 1 },
  { id: "in_review", name: "In Review", color: "#f59e0b", order: 2 },
  { id: "done", name: "Done", color: "#22c55e", order: 3 },
]
