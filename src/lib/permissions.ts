// Pure role/permission constants and types - no server-only imports (db/mongoose)
// here, so this module is safe to import from client components. The actual
// DB-backed permission checks (getEffectiveRole/checkPermission) live in
// @/lib/rbac, which re-exports everything from this file for server use.

export type EffectiveRole = "owner" | "admin" | "manager" | "member" | "viewer" | "guest" | "none"

export type PermissionAction =
  | "project.view"
  | "project.edit"
  | "project.delete"
  | "project.archive"
  | "project.manage_members"
  | "project.manage_settings"
  | "task.view"
  | "task.create"
  | "task.edit"
  | "task.edit_own"
  | "task.delete"
  | "comment.create"
  | "reports.view"

/**
 * Permission matrix: which effective roles can perform which actions.
 * "task.edit_own" is granted to member/viewer but real enforcement of the
 * "own" constraint (createdBy/assignee match) happens in the API route via
 * the `context.isOwnResource` flag passed to checkPermission.
 */
export const PERMISSION_MATRIX: Record<EffectiveRole, PermissionAction[]> = {
  owner: [
    "project.view",
    "project.edit",
    "project.delete",
    "project.archive",
    "project.manage_members",
    "project.manage_settings",
    "task.view",
    "task.create",
    "task.edit",
    "task.edit_own",
    "task.delete",
    "comment.create",
    "reports.view",
  ],
  admin: [
    "project.view",
    "project.edit",
    "project.archive",
    "project.manage_members",
    "project.manage_settings",
    "task.view",
    "task.create",
    "task.edit",
    "task.edit_own",
    "task.delete",
    "comment.create",
    "reports.view",
  ],
  manager: [
    "project.view",
    "project.edit",
    "project.manage_members",
    "task.view",
    "task.create",
    "task.edit",
    "task.edit_own",
    "task.delete",
    "comment.create",
    "reports.view",
  ],
  member: [
    "project.view",
    "task.view",
    "task.create",
    "task.edit_own",
    "comment.create",
    "reports.view",
  ],
  viewer: ["project.view", "task.view", "comment.create"],
  guest: ["project.view", "task.view", "comment.create"],
  none: [],
}
