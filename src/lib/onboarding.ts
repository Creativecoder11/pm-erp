import { Types, type HydratedDocument } from "mongoose"
import { Organization, type IOrganization } from "@/models/Organization"
import { User, type IUser } from "@/models/User"

// This app is single-tenant: everyone joins the same organization rather than
// each signup spinning up its own. The slug is fixed so lookups are
// deterministic and never collide with unrelated orgs (e.g. the seed script's
// demo org, which uses its own slug).
const DEFAULT_ORG_NAME = "LLS Task Management"
const DEFAULT_ORG_SLUG = "lls-task-management"

export async function getOrCreateDefaultOrganization(): Promise<HydratedDocument<IOrganization>> {
  const existing = await Organization.findOne({ slug: DEFAULT_ORG_SLUG })
  if (existing) return existing

  const placeholderOwnerId = new Types.ObjectId()
  return Organization.create({
    name: DEFAULT_ORG_NAME,
    slug: DEFAULT_ORG_SLUG,
    ownerId: placeholderOwnerId,
    members: [],
    settings: {
      allowPublicProjects: false,
      defaultProjectVisibility: "private",
      maxMembers: 200,
    },
  })
}

interface ProvisionUserInput {
  name: string
  email: string
  password?: string
  avatar?: string
}

/**
 * Creates a new user in the single shared organization. The very first
 * person ever to join becomes Super Admin and is active immediately; everyone
 * after that joins as a Member pending admin approval.
 */
export async function provisionNewUser(
  input: ProvisionUserInput
): Promise<{ user: HydratedDocument<IUser>; isFirstUser: boolean }> {
  const org = await getOrCreateDefaultOrganization()
  const isFirstUser = org.members.length === 0

  const user = await User.create({
    ...input,
    role: isFirstUser ? "superadmin" : "member",
    status: isFirstUser ? "active" : "pending",
    organizationId: org._id,
  })

  if (isFirstUser) org.ownerId = user._id
  org.members.push({
    userId: user._id,
    role: isFirstUser ? "owner" : "member",
    joinedAt: new Date(),
  })
  await org.save()

  return { user, isFirstUser }
}
