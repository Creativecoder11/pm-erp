"use client"

import { use } from "react"
import { useSession } from "next-auth/react"
import { MemberList } from "@/components/projects/MemberList"
import { useProjectStore } from "@/store/projectStore"
import type { IProjectMember, IUserSummary } from "@/types"

interface MembersPageProps {
  params: Promise<{ id: string }>
}

type PopulatedMember = Omit<IProjectMember, "userId"> & { userId: IUserSummary }

export default function MembersPage({ params }: MembersPageProps) {
  const { id } = use(params)
  const { data: session } = useSession()
  const { currentProject, updateProjectLocal } = useProjectStore()

  if (!currentProject || currentProject._id !== id) return null

  const project = currentProject
  const members = project.members as unknown as PopulatedMember[]
  const currentUserId = session?.user?.id
  const isOwner = currentUserId === project.ownerId
  const currentMember = members.find((m) => m.userId._id === currentUserId)
  const canManage = isOwner || currentMember?.role === "manager"

  function handleMembersChange(updated: PopulatedMember[]) {
    updateProjectLocal(id, { members: updated as unknown as IProjectMember[] })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Members</h2>
        <p className="text-sm text-muted-foreground">
          Manage who has access to this project and their roles.
        </p>
      </div>

      <MemberList
        projectId={id}
        members={members}
        ownerId={project.ownerId}
        canManage={canManage}
        onMembersChange={handleMembersChange}
      />
    </div>
  )
}
