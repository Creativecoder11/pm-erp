import path from "path"
import dotenv from "dotenv"
import type { HydratedDocument } from "mongoose"
import type { IUser } from "../src/models/User"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const ORG_SLUG = "jamroll-demo"
const SEED_PASSWORD = "Password123!"

const USER_SEEDS = [
  { name: "Avery Owner", email: "avery@jamroll.dev", orgRole: "owner" as const, role: "admin" as const },
  { name: "Bailey Admin", email: "bailey@jamroll.dev", orgRole: "admin" as const, role: "admin" as const },
  { name: "Casey Member", email: "casey@jamroll.dev", orgRole: "member" as const, role: "member" as const },
  { name: "Devon Member", email: "devon@jamroll.dev", orgRole: "member" as const, role: "member" as const },
  { name: "Emery Member", email: "emery@jamroll.dev", orgRole: "member" as const, role: "member" as const },
]

const PROJECT_SEEDS = [
  { name: "Website Relaunch", description: "Redesign and rebuild the marketing site", color: "#6366f1" },
  { name: "Mobile App", description: "Native mobile app for iOS and Android", color: "#22c55e" },
  { name: "Q3 Marketing Campaign", description: "Plan and execute the Q3 product launch campaign", color: "#f59e0b" },
]

const TASK_TITLES = [
  "Define project scope",
  "Set up repository and CI",
  "Create wireframes",
  "Design system audit",
  "Build landing page",
  "Implement authentication",
  "Write API documentation",
  "QA pass on checkout flow",
  "Fix navigation bug",
  "Set up analytics tracking",
  "Draft press release",
  "Plan social media calendar",
  "Record demo video",
  "Review pull requests",
  "Customer interview synthesis",
  "Performance optimization",
  "Accessibility audit",
  "Update onboarding flow",
  "Migrate database schema",
  "Prepare sprint retro",
  "Design email templates",
  "Set up staging environment",
  "Write unit tests",
  "Create user personas",
  "Plan beta rollout",
  "Localize UI strings",
  "Audit third-party dependencies",
  "Set up error monitoring",
  "Draft launch checklist",
  "Conduct usability testing",
]

const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const

function dayOffset(days: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

async function main() {
  const { default: bcrypt } = await import("bcryptjs")
  const { default: mongoose, Types } = await import("mongoose")
  const { connectDB } = await import("../src/lib/db")
  const { Organization } = await import("../src/models/Organization")
  const { User } = await import("../src/models/User")
  const { Project, DEFAULT_COLUMNS } = await import("../src/models/Project")
  const { Task } = await import("../src/models/Task")

  await connectDB()

  const existingOrg = await Organization.findOne({ slug: ORG_SLUG })
  if (existingOrg) {
    const existingProjects = await Project.find({ organizationId: existingOrg._id }, "_id")
    const projectIds = existingProjects.map((p) => p._id)
    await Task.deleteMany({ projectId: { $in: projectIds } })
    await Project.deleteMany({ organizationId: existingOrg._id })
    await User.deleteMany({ organizationId: existingOrg._id })
    await Organization.deleteOne({ _id: existingOrg._id })
    console.log(`Cleared existing seed data for org "${ORG_SLUG}"`)
  }

  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10)
  const placeholderOwnerId = new Types.ObjectId()

  const org = await Organization.create({
    name: "Jamroll Demo",
    slug: ORG_SLUG,
    ownerId: placeholderOwnerId,
    plan: "pro",
    members: [],
    settings: {
      allowPublicProjects: false,
      defaultProjectVisibility: "private",
      maxMembers: 25,
    },
  })

  const users: HydratedDocument<IUser>[] = []
  for (const seed of USER_SEEDS) {
    const user = await User.create({
      name: seed.name,
      email: seed.email,
      password: hashedPassword,
      role: seed.role,
      organizationId: org._id,
    })
    users.push(user)
    org.members.push({ userId: user._id, role: seed.orgRole, joinedAt: new Date() })
  }

  const owner = users[0]
  org.ownerId = owner._id
  await org.save()

  const projects = []
  for (const seed of PROJECT_SEEDS) {
    const project = await Project.create({
      name: seed.name,
      description: seed.description,
      color: seed.color,
      organizationId: org._id,
      ownerId: owner._id,
      members: users.map((u, i) => ({
        userId: u._id,
        role: i === 0 ? "manager" : "member",
      })),
      status: "active",
      visibility: "team",
      columns: DEFAULT_COLUMNS,
      tags: ["demo"],
    })
    projects.push(project)
  }

  const dueDateOffsets = [-5, -1, 0, 2, 7, 14, undefined, undefined]

  let titleIndex = 0
  for (let i = 0; i < 30; i++) {
    const project = projects[i % projects.length]
    const column = DEFAULT_COLUMNS[i % DEFAULT_COLUMNS.length]
    const status = column.id
    const priority = PRIORITIES[i % PRIORITIES.length]
    const assigneeCount = (i % 3) + 1
    const assignees = Array.from({ length: assigneeCount }, (_, j) => users[(i + j) % users.length]._id)

    const dueOffset = dueDateOffsets[i % dueDateOffsets.length]
    const dueDate = dueOffset !== undefined ? dayOffset(dueOffset) : undefined

    const isDone = status === "done"
    const completedAt = isDone ? dayOffset(-(i % 5)) : undefined

    await Task.create({
      title: TASK_TITLES[titleIndex % TASK_TITLES.length],
      description: `Auto-generated seed task for ${project.name}.`,
      projectId: project._id,
      organizationId: org._id,
      status,
      priority,
      assignees,
      createdBy: owner._id,
      dueDate,
      completedAt,
      tags: i % 4 === 0 ? ["seed"] : [],
      order: Math.floor(i / DEFAULT_COLUMNS.length),
    })

    titleIndex++
  }

  console.log("\nSeed complete.\n")
  console.log(`Organization: ${org.name} (${org.slug})\n`)
  console.log("Login credentials (all users share the same password):")
  console.log(`  Password: ${SEED_PASSWORD}\n`)
  for (const seed of USER_SEEDS) {
    console.log(`  ${seed.email}  (${seed.orgRole})`)
  }
  console.log("")

  await mongoose.connection.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
