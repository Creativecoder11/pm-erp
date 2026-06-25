import { connectDB } from "@/lib/db"
import { Project } from "@/models/Project"
import { Organization } from "@/models/Organization"
import { Types } from "mongoose"
import { PERMISSION_MATRIX, type EffectiveRole, type PermissionAction } from "@/lib/permissions"

export { PERMISSION_MATRIX, type EffectiveRole, type PermissionAction }

/**
 * Determines a user's effective role for a given project, taking into
 * account organization-level roles (owner/admin override project roles)
 * and project-level membership roles (manager/member/viewer).
 */
export async function getEffectiveRole(
  userId: string,
  projectId: string
): Promise<EffectiveRole> {
  await connectDB()

  const project = await Project.findById(projectId).select("ownerId members organizationId")
  if (!project) return "none"

  const userObjectId = new Types.ObjectId(userId)

  if (project.ownerId.equals(userObjectId)) {
    return "owner"
  }

  const org = await Organization.findById(project.organizationId).select("members")
  const orgMember = org?.members.find((m) => m.userId.equals(userObjectId))

  if (orgMember?.role === "owner" || orgMember?.role === "admin") {
    return "admin"
  }

  const projectMember = project.members.find((m) => m.userId.equals(userObjectId))
  if (projectMember) {
    return projectMember.role // "manager" | "member" | "viewer"
  }

  if (orgMember?.role === "guest") {
    return "guest"
  }

  if (orgMember?.role === "member") {
    // Org member without explicit project membership: treat as viewer
    // for private/team projects they have access to.
    return "viewer"
  }

  return "none"
}

/**
 * Checks whether a user is allowed to perform `action` on `projectId`.
 * Pass `context.isOwnResource = true` when the target task/comment was
 * created by or assigned to `userId`, to allow "edit own" permissions.
 */
export async function checkPermission(
  userId: string,
  projectId: string,
  action: PermissionAction,
  context?: { isOwnResource?: boolean }
): Promise<boolean> {
  const role = await getEffectiveRole(userId, projectId)
  if (role === "none") return false

  const allowed = PERMISSION_MATRIX[role]

  if (allowed.includes(action)) return true

  // Fall back to "edit own" if the resource belongs to this user
  if (action === "task.edit" && context?.isOwnResource) {
    return allowed.includes("task.edit_own")
  }

  return false
}
