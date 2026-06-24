import mongoose, { Schema, Document, Model, Types } from "mongoose"

export interface ITaskSubtask {
  id: string
  title: string
  done: boolean
  assigneeId?: Types.ObjectId
  dueDate?: Date
}

export interface ITaskDependency {
  taskId: Types.ObjectId
  type: "blocks" | "blocked_by" | "relates_to"
}

export interface ITaskAttachment {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedBy: Types.ObjectId
  uploadedAt: Date
}

export interface ITaskRecurrence {
  enabled: boolean
  frequency: "daily" | "weekly" | "monthly"
  endDate?: Date
}

export interface ITask extends Document {
  _id: Types.ObjectId
  title: string
  description?: string
  projectId: Types.ObjectId
  organizationId: Types.ObjectId
  parentTaskId?: Types.ObjectId
  status: string
  sectionId?: string
  priority: "none" | "low" | "medium" | "high" | "urgent"
  assignees: Types.ObjectId[]
  createdBy: Types.ObjectId
  startDate?: Date
  dueDate?: Date
  completedAt?: Date
  estimatedHours?: number
  loggedHours: number
  subtasks: ITaskSubtask[]
  dependencies: ITaskDependency[]
  customFields: Map<string, unknown>
  myTasksSections: Map<string, string>
  tags: string[]
  attachments: ITaskAttachment[]
  watchers: Types.ObjectId[]
  order: number
  storyPoints?: number
  sprintId?: string
  recurrence?: ITaskRecurrence
  createdAt: Date
  updatedAt: Date
}

const TaskSubtaskSchema = new Schema<ITaskSubtask>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    done: { type: Boolean, default: false },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
    dueDate: { type: Date },
  },
  { _id: false }
)

const TaskDependencySchema = new Schema<ITaskDependency>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    type: { type: String, enum: ["blocks", "blocked_by", "relates_to"], required: true },
  },
  { _id: false }
)

const TaskAttachmentSchema = new Schema<ITaskAttachment>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const TaskRecurrenceSchema = new Schema<ITaskRecurrence>(
  {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ["daily", "weekly", "monthly"] },
    endDate: { type: Date },
  },
  { _id: false }
)

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    parentTaskId: { type: Schema.Types.ObjectId, ref: "Task" },
    status: { type: String, required: true, default: "todo" },
    sectionId: { type: String },
    priority: {
      type: String,
      enum: ["none", "low", "medium", "high", "urgent"],
      default: "none",
    },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date },
    dueDate: { type: Date },
    completedAt: { type: Date },
    estimatedHours: { type: Number },
    loggedHours: { type: Number, default: 0 },
    subtasks: { type: [TaskSubtaskSchema], default: [] },
    dependencies: { type: [TaskDependencySchema], default: [] },
    customFields: { type: Map, of: Schema.Types.Mixed, default: {} },
    myTasksSections: { type: Map, of: String, default: {} },
    tags: [{ type: String }],
    attachments: { type: [TaskAttachmentSchema], default: [] },
    watchers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    order: { type: Number, default: 0 },
    storyPoints: { type: Number },
    sprintId: { type: String },
    recurrence: { type: TaskRecurrenceSchema },
  },
  { timestamps: true }
)

TaskSchema.index({ projectId: 1, status: 1, order: 1 })
TaskSchema.index({ projectId: 1, sectionId: 1 })
TaskSchema.index({ organizationId: 1 })
TaskSchema.index({ assignees: 1 })
TaskSchema.index({ dueDate: 1 })
TaskSchema.index({ title: "text", description: "text" })

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema)
