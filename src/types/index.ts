// Shared application types. These mirror the Mongoose schemas but use
// plain string ids (as returned by the API after JSON serialization).

export type UserRole = "superadmin" | "admin" | "member" | "guest"
export type OrgRole = "owner" | "admin" | "member" | "guest"
export type ProjectRole = "manager" | "member" | "viewer"
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived"
export type ProjectVisibility = "public" | "private" | "team"
export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent"
export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
export type DependencyType = "blocks" | "blocked_by" | "relates_to"
export type RecurrenceFrequency = "daily" | "weekly" | "monthly"
export type NotificationType =
  | "task_assigned"
  | "task_due"
  | "mentioned"
  | "comment_added"
  | "project_invite"
  | "status_changed"
  | "deadline_reminder"
export type AuditEntityType =
  | "task"
  | "project"
  | "member"
  | "comment"
  | "organization"

export interface IUserPreferences {
  theme: "light" | "dark"
  notifications: {
    email: boolean
    inApp: boolean
    taskAssigned: boolean
    taskDue: boolean
    mentions: boolean
  }
}

export interface IUser {
  _id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  organizationId: string
  teams: string[]
  isActive: boolean
  lastSeen: string
  preferences: IUserPreferences
  createdAt: string
  updatedAt: string
}

export interface IOrganizationMember {
  userId: string
  role: OrgRole
  joinedAt: string
}

export interface IOrganizationSettings {
  allowPublicProjects: boolean
  defaultProjectVisibility: "public" | "private"
  maxMembers: number
}

export interface IOrganization {
  _id: string
  name: string
  slug: string
  logo?: string
  plan: "free" | "pro" | "enterprise"
  ownerId: string
  members: IOrganizationMember[]
  settings: IOrganizationSettings
  createdAt: string
  updatedAt: string
}

export interface IProjectMember {
  userId: string
  role: ProjectRole
}

export interface ICustomFieldDef {
  id: string
  name: string
  type: CustomFieldType
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

export interface IProject {
  _id: string
  name: string
  description?: string
  color: string
  icon?: string
  organizationId: string
  ownerId: string
  members: IProjectMember[]
  status: ProjectStatus
  visibility: ProjectVisibility
  startDate?: string
  dueDate?: string
  customFields: ICustomFieldDef[]
  columns: IProjectColumn[]
  sections: IProjectSection[]
  tags: string[]
  completedAt?: string
  createdAt: string
  updatedAt: string
  // Computed/aggregated fields returned by some endpoints
  memberCount?: number
  taskCount?: number
  completedTaskCount?: number
  completionRate?: number
}

export interface ITaskSubtask {
  id: string
  title: string
  done: boolean
  assigneeId?: string
  dueDate?: string
}

export interface ITaskDependency {
  taskId: string
  type: DependencyType
}

export interface ITaskAttachment {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedBy: string
  uploadedAt: string
}

export interface ITaskRecurrence {
  enabled: boolean
  frequency: RecurrenceFrequency
  endDate?: string
}

export interface ITask {
  _id: string
  title: string
  description?: string
  projectId: string
  organizationId: string
  parentTaskId?: string
  status: string
  sectionId?: string
  priority: TaskPriority
  assignees: string[]
  createdBy: string
  startDate?: string
  dueDate?: string
  completedAt?: string
  estimatedHours?: number
  loggedHours: number
  subtasks: ITaskSubtask[]
  dependencies: ITaskDependency[]
  customFields: Record<string, unknown>
  tags: string[]
  attachments: ITaskAttachment[]
  watchers: string[]
  order: number
  storyPoints?: number
  sprintId?: string
  recurrence?: ITaskRecurrence
  createdAt: string
  updatedAt: string
}

export interface ICommentReaction {
  emoji: string
  userIds: string[]
}

export interface IComment {
  _id: string
  taskId: string
  projectId: string
  authorId: string
  content: string
  mentions: string[]
  attachments: Array<{ name: string; url: string }>
  reactions: ICommentReaction[]
  isEdited: boolean
  editedAt?: string
  createdAt: string
  updatedAt: string
}

export interface INotification {
  _id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  link: string
  isRead: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export interface IAuditLog {
  _id: string
  organizationId: string
  projectId?: string
  actorId: string
  action: string
  entityType: AuditEntityType
  entityId: string
  changes: Record<string, { before: unknown; after: unknown }>
  ip?: string
  createdAt: string
}

// Populated/expanded variants commonly returned by the API

export interface IUserSummary {
  _id: string
  name: string
  email: string
  avatar?: string
}

export interface ITaskWithUsers extends Omit<ITask, "assignees" | "createdBy" | "watchers"> {
  assignees: IUserSummary[]
  createdBy: IUserSummary
  watchers: IUserSummary[]
  commentCount?: number
}

export interface IPaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface IApiError {
  error: string
  details?: unknown
}
