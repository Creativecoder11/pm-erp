import mongoose, { Schema, Document, Model, Types } from "mongoose"

export interface IAuditLog extends Document {
  _id: Types.ObjectId
  organizationId: Types.ObjectId
  projectId?: Types.ObjectId
  actorId: Types.ObjectId
  action: string
  entityType: "task" | "project" | "member" | "comment" | "organization"
  entityId: Types.ObjectId
  changes: Record<string, { before: unknown; after: unknown }>
  ip?: string
  createdAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    entityType: {
      type: String,
      enum: ["task", "project", "member", "comment", "organization"],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    changes: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

AuditLogSchema.index({ organizationId: 1, createdAt: -1 })
AuditLogSchema.index({ projectId: 1, createdAt: -1 })

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema)
