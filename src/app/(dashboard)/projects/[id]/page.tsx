"use client"

import { use } from "react"
import { format } from "date-fns"
import { CalendarDays, Crown, Globe, Lock, Users2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AvatarStack, UserAvatar } from "@/components/shared/Avatar"
import { ProjectStatusBadge } from "@/components/shared/StatusBadge"
import { OverviewTab } from "@/components/reports/OverviewTab"
import { useProjectStore } from "@/store/projectStore"
import type { IProjectMember, IUserSummary, ProjectVisibility } from "@/types"

interface ProjectOverviewPageProps {
  params: Promise<{ id: string }>
}

type PopulatedMember = Omit<IProjectMember, "userId"> & { userId: IUserSummary }

const VISIBILITY_CONFIG: Record<ProjectVisibility, { label: string; icon: typeof Globe }> = {
  public: { label: "Public", icon: Globe },
  team: { label: "Team", icon: Users2 },
  private: { label: "Private", icon: Lock },
}

export default function ProjectOverviewPage({ params }: ProjectOverviewPageProps) {
  const { id } = use(params)
  const { currentProject } = useProjectStore()

  if (!currentProject || currentProject._id !== id) return null

  const project = currentProject
  const members = project.members as unknown as PopulatedMember[]
  const populatedMembers = members.map((m) => m.userId).filter((u) => typeof u === "object")
  const owner = populatedMembers.find((u) => u._id === project.ownerId)
  const VisibilityIcon = VISIBILITY_CONFIG[project.visibility]?.icon ?? Globe

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>About this project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {project.description || "No description provided."}
            </p>

            {project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Start date</span>
                <span className="ml-auto font-medium">
                  {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due date</span>
                <span className="ml-auto font-medium">
                  {project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <ProjectStatusBadge status={project.status} />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Visibility</span>
              <span className="flex items-center gap-1.5 font-medium">
                <VisibilityIcon className="h-3.5 w-3.5" />
                {VISIBILITY_CONFIG[project.visibility]?.label ?? project.visibility}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Color</span>
              <span className="flex items-center gap-2 font-medium">
                <span
                  className="h-4 w-4 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: project.color }}
                />
                {project.color}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Owner</span>
              {owner ? (
                <span className="flex items-center gap-2 font-medium">
                  <UserAvatar name={owner.name} avatar={owner.avatar} size="xs" />
                  {owner.name}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-medium">
                  <Crown className="h-3.5 w-3.5" />—
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Members</span>
              {populatedMembers.length > 0 ? (
                <AvatarStack users={populatedMembers} max={5} />
              ) : (
                <span className="font-medium">—</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <OverviewTab projectId={id} />
    </div>
  )
}
