import { z } from "zod"

export const customFieldDefSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(["text", "number", "date", "select", "multiselect", "checkbox"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
})

export const projectColumnSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string().default("#94a3b8"),
  order: z.number(),
  limit: z.number().optional(),
})

export const projectSectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  order: z.number(),
})

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(2000).optional(),
  color: z.string().default("#6366f1"),
  icon: z.string().optional(),
  visibility: z.enum(["public", "private", "team"]).default("team"),
  startDate: z.string().datetime().optional().or(z.literal("")),
  dueDate: z.string().datetime().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  visibility: z.enum(["public", "private", "team"]).optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.array(customFieldDefSchema).optional(),
  columns: z.array(projectColumnSchema).optional(),
  sections: z.array(projectSectionSchema).optional(),
})

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["manager", "member", "viewer"]).default("member"),
})

export const updateProjectMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["manager", "member", "viewer"]),
})

export const taskSubtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  done: z.boolean().default(false),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
})

export const taskDependencySchema = z.object({
  taskId: z.string(),
  type: z.enum(["blocks", "blocked_by", "relates_to"]),
})

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().max(10000).optional(),
  projectId: z.string().min(1),
  parentTaskId: z.string().optional(),
  status: z.string().optional(),
  sectionId: z.string().optional(),
  myTasksSectionId: z.string().nullable().optional(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).default("none"),
  assignees: z.array(z.string()).default([]),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().nonnegative().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.unknown()).optional(),
  storyPoints: z.number().nonnegative().optional(),
  sprintId: z.string().optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(10000).optional(),
  status: z.string().optional(),
  sectionId: z.string().nullable().optional(),
  myTasksSectionId: z.string().nullable().optional(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
  assignees: z.array(z.string()).optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().nonnegative().nullable().optional(),
  loggedHours: z.number().nonnegative().optional(),
  subtasks: z.array(taskSubtaskSchema).optional(),
  dependencies: z.array(taskDependencySchema).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  watchers: z.array(z.string()).optional(),
  order: z.number().optional(),
  storyPoints: z.number().nonnegative().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  recurrence: z
    .object({
      enabled: z.boolean(),
      frequency: z.enum(["daily", "weekly", "monthly"]),
      endDate: z.string().datetime().optional(),
    })
    .optional(),
})

export const updateMyTasksSectionsSchema = z.object({
  sections: z.array(projectSectionSchema),
})

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  mentions: z.array(z.string()).default([]),
})

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
})

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
  teamId: z.string().optional(),
})

export const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  members: z.array(z.string()).default([]),
})

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  members: z.array(z.string()).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().optional(),
  role: z.enum(["admin", "member"]).optional(),
  status: z.enum(["pending", "active", "blocked"]).optional(),
  preferences: z
    .object({
      theme: z.enum(["light", "dark"]).optional(),
      notifications: z
        .object({
          email: z.boolean().optional(),
          inApp: z.boolean().optional(),
          taskAssigned: z.boolean().optional(),
          taskDue: z.boolean().optional(),
          mentions: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().optional(),
  settings: z
    .object({
      allowPublicProjects: z.boolean().optional(),
      defaultProjectVisibility: z.enum(["public", "private"]).optional(),
      maxMembers: z.number().int().positive().optional(),
    })
    .optional(),
})

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
