import mongoose, { Schema, Document, Model, Types } from "mongoose"

export interface ICommentReaction {
  emoji: string
  userIds: Types.ObjectId[]
}

export interface IComment extends Document {
  _id: Types.ObjectId
  taskId: Types.ObjectId
  projectId: Types.ObjectId
  authorId: Types.ObjectId
  content: string
  mentions: Types.ObjectId[]
  attachments: Array<{ name: string; url: string }>
  reactions: ICommentReaction[]
  isEdited: boolean
  editedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const CommentReactionSchema = new Schema<ICommentReaction>(
  {
    emoji: { type: String, required: true },
    userIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false }
)

const CommentSchema = new Schema<IComment>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    attachments: [
      {
        _id: false,
        name: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    reactions: { type: [CommentReactionSchema], default: [] },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
)

CommentSchema.index({ taskId: 1, createdAt: 1 })

export const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema)
