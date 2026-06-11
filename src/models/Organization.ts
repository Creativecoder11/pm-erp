import mongoose, { Schema, Document, Model, Types } from "mongoose"

export interface IOrganizationMember {
  userId: Types.ObjectId
  role: "owner" | "admin" | "member" | "guest"
  joinedAt: Date
}

export interface IOrganization extends Document {
  _id: Types.ObjectId
  name: string
  slug: string
  logo?: string
  plan: "free" | "pro" | "enterprise"
  ownerId: Types.ObjectId
  members: IOrganizationMember[]
  settings: {
    allowPublicProjects: boolean
    defaultProjectVisibility: "public" | "private"
    maxMembers: number
  }
  createdAt: Date
  updatedAt: Date
}

const OrganizationMemberSchema = new Schema<IOrganizationMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "admin", "member", "guest"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { type: String },
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [OrganizationMemberSchema], default: [] },
    settings: {
      allowPublicProjects: { type: Boolean, default: false },
      defaultProjectVisibility: { type: String, enum: ["public", "private"], default: "private" },
      maxMembers: { type: Number, default: 10 },
    },
  },
  { timestamps: true }
)

export const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>("Organization", OrganizationSchema)
