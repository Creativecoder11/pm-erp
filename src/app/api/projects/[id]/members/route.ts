import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Project } from "@/models/Project"
import { User } from "@/models/User"
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils"
import { addProjectMemberSchema, updateProjectMemberSchema } from "@/lib/validations"
import { checkPermission } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { emitToRoom, projectRoom } from "@/lib/socket-emit"
import { notifyUser } from "@/lib/notifications"

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/members
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    await connectDB()

    const allowed = await checkPermission(user.id, id, "project.view")
    if (!allowed) return forbidden()

    const project = await Project.findById(id).populate(
      "members.userId",
      "name email avatar role lastSeen"
    )
    if (!project) return notFound("Project")

    return NextResponse.json({ data: project.members })
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/projects/[id]/members - add a member to the project
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    const body = await req.json()
    const parsed = addProjectMemberSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const allowed = await checkPermission(user.id, id, "project.manage_members")
    if (!allowed) return forbidden()

    const project = await Project.findById(id)
    if (!project) return notFound("Project")

    const newMember = await User.findById(parsed.data.userId).select("name email avatar")
    if (!newMember) return notFound("User")

    const exists = project.members.some((m) => m.userId.toString() === parsed.data.userId)
    if (exists) return badRequest("User is already a member of this project")

    project.members.push({ userId: newMember._id, role: parsed.data.role })
    await project.save()

    await logAudit({
      organizationId: user.organizationId,
      projectId: id,
      actorId: user.id,
      action: "member.added",
      entityType: "member",
      entityId: newMember._id.toString(),
      changes: { role: { before: null, after: parsed.data.role } },
    })

    emitToRoom(projectRoom(id), "member:joined", { projectId: id, user: newMember })

    await notifyUser({
      userId: newMember._id.toString(),
      type: "project_invite",
      title: "Added to project",
      body: `You were added to ${project.name}`,
      link: `/projects/${id}`,
      metadata: { projectId: id, projectName: project.name },
    })

    return NextResponse.json({ data: project.members }, { status: 201 })
  } catch (err) {
    return serverError(err)
  }
}

// PUT /api/projects/[id]/members - update a member's role
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    const body = await req.json()
    const parsed = updateProjectMemberSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten())

    await connectDB()

    const allowed = await checkPermission(user.id, id, "project.manage_members")
    if (!allowed) return forbidden()

    const project = await Project.findById(id)
    if (!project) return notFound("Project")

    const member = project.members.find((m) => m.userId.toString() === parsed.data.userId)
    if (!member) return notFound("Member")

    const before = member.role
    member.role = parsed.data.role
    await project.save()

    await logAudit({
      organizationId: user.organizationId,
      projectId: id,
      actorId: user.id,
      action: "member.role_updated",
      entityType: "member",
      entityId: parsed.data.userId,
      changes: { role: { before, after: member.role } },
    })

    return NextResponse.json({ data: project.members })
  } catch (err) {
    return serverError(err)
  }
}

// DELETE /api/projects/[id]/members?userId=... - remove a member from the project
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const { id } = await params
    const userId = req.nextUrl.searchParams.get("userId")
    if (!userId) return badRequest("userId query param is required")

    await connectDB()

    const allowed = await checkPermission(user.id, id, "project.manage_members")
    if (!allowed) return forbidden()

    const project = await Project.findById(id)
    if (!project) return notFound("Project")

    project.members = project.members.filter((m) => m.userId.toString() !== userId)
    await project.save()

    await logAudit({
      organizationId: user.organizationId,
      projectId: id,
      actorId: user.id,
      action: "member.removed",
      entityType: "member",
      entityId: userId,
      changes: { role: { before: "removed", after: null } },
    })

    return NextResponse.json({ data: project.members })
  } catch (err) {
    return serverError(err)
  }
}
