import mongoose, { Schema, Document, Model, Types } from "mongoose"

export interface ITeam extends Document {
  _id: Types.ObjectId
  name: string
  organizationId: Types.ObjectId
  members: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
)

TeamSchema.index({ organizationId: 1 })

export const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema)
