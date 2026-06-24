"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import axios from "axios"
import { toast } from "sonner"
import {
  CheckCircle2,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldOff,
  Trash2,
  Users,
  UsersRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserAvatar, AvatarStack } from "@/components/shared/Avatar"
import { UserSelect } from "@/components/shared/UserSelect"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { formatRelativeTime } from "@/lib/utils"
import type { ITeamWithMembers, IUser } from "@/types"

// "Super Admin" is intentionally not assignable here - it's granted to exactly
// one account (the very first person to register) and is permanent.
const ROLE_OPTIONS: { value: "admin" | "member"; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
]

const NO_TEAM = "__none__"

// Only a super admin can change another admin's role/status or delete them;
// a regular admin can only manage members.
function canManage(actorRole: string, target: IUser, actorId: string) {
  if (target._id === actorId) return false
  if (target.role === "superadmin") return false
  if (target.role === "admin") return actorRole === "superadmin"
  return actorRole === "admin" || actorRole === "superadmin"
}

export default function TeamSettingsPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<IUser[]>([])
  const [teams, setTeams] = useState<ITeamWithMembers[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [blockTarget, setBlockTarget] = useState<IUser | null>(null)
  const [deleteUserTarget, setDeleteUserTarget] = useState<IUser | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member")
  const [inviteTeamId, setInviteTeamId] = useState<string>(NO_TEAM)
  const [isInviting, setIsInviting] = useState(false)

  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<ITeamWithMembers | null>(null)
  const [teamName, setTeamName] = useState("")
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([])
  const [savingTeam, setSavingTeam] = useState(false)
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<ITeamWithMembers | null>(null)

  const currentUserId = session?.user?.id ?? ""
  const currentRole = session?.user?.role ?? "member"
  const isSuperAdmin = currentRole === "superadmin"
  const isOrgAdmin = currentRole === "admin" || isSuperAdmin
  const inviteRoleOptions = isSuperAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter((o) => o.value === "member")

  useEffect(() => {
    Promise.all([fetchMembers(), fetchTeams()]).finally(() => setIsLoading(false))
  }, [])

  async function fetchMembers() {
    try {
      const res = await axios.get("/api/users")
      setMembers(res.data.data as IUser[])
    } catch {
      toast.error("Failed to load team members")
    }
  }

  async function fetchTeams() {
    try {
      const res = await axios.get("/api/teams")
      setTeams(res.data.data as ITeamWithMembers[])
    } catch {
      toast.error("Failed to load departments")
    }
  }

  async function handleRoleChange(userId: string, role: "admin" | "member") {
    setUpdatingUserId(userId)
    try {
      const res = await axios.put(`/api/users/${userId}`, { role })
      const updated = res.data.data as IUser
      setMembers((prev) => prev.map((m) => (m._id === userId ? { ...m, ...updated } : m)))
      toast.success("Member role updated")
    } catch {
      toast.error("Failed to update member role")
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function handleStatusChange(userId: string, status: "pending" | "active" | "blocked") {
    setUpdatingUserId(userId)
    try {
      const res = await axios.put(`/api/users/${userId}`, { status })
      const updated = res.data.data as IUser
      setMembers((prev) => prev.map((m) => (m._id === userId ? { ...m, ...updated } : m)))
      const labels = { pending: "marked pending", active: "approved", blocked: "blocked" }
      toast.success(`Member ${labels[status]}`)
    } catch {
      toast.error("Failed to update member status")
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function handleBlockMember() {
    if (!blockTarget) return
    await handleStatusChange(blockTarget._id, "blocked")
    setBlockTarget(null)
  }

  async function handleDeleteMember() {
    if (!deleteUserTarget) return
    setDeletingUser(true)
    try {
      await axios.delete(`/api/users/${deleteUserTarget._id}`)
      setMembers((prev) => prev.filter((m) => m._id !== deleteUserTarget._id))
      toast.success("Member deleted")
      setDeleteUserTarget(null)
    } catch (err) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Failed to delete member"
      toast.error(message)
    } finally {
      setDeletingUser(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setIsInviting(true)
    try {
      await axios.post("/api/users/invite", {
        email: inviteEmail.trim(),
        role: inviteRole,
        ...(inviteTeamId !== NO_TEAM ? { teamId: inviteTeamId } : {}),
      })
      toast.success("Invitation sent")
      setInviteOpen(false)
      setInviteEmail("")
      setInviteRole("member")
      setInviteTeamId(NO_TEAM)
      fetchMembers()
      fetchTeams()
    } catch {
      toast.error("Failed to send invitation")
    } finally {
      setIsInviting(false)
    }
  }

  function openCreateTeam() {
    setEditingTeam(null)
    setTeamName("")
    setTeamMemberIds([])
    setTeamDialogOpen(true)
  }

  function openEditTeam(team: ITeamWithMembers) {
    setEditingTeam(team)
    setTeamName(team.name)
    setTeamMemberIds(team.members.map((m) => m._id))
    setTeamDialogOpen(true)
  }

  async function handleSaveTeam() {
    const trimmed = teamName.trim()
    if (!trimmed) return
    setSavingTeam(true)
    try {
      if (editingTeam) {
        const res = await axios.put(`/api/teams/${editingTeam._id}`, {
          name: trimmed,
          members: teamMemberIds,
        })
        const updated = res.data.data as ITeamWithMembers
        setTeams((prev) => prev.map((t) => (t._id === editingTeam._id ? updated : t)))
        toast.success("Department updated")
      } else {
        const res = await axios.post("/api/teams", { name: trimmed, members: teamMemberIds })
        setTeams((prev) =>
          [...prev, res.data.data as ITeamWithMembers].sort((a, b) => a.name.localeCompare(b.name))
        )
        toast.success("Department created")
      }
      setTeamDialogOpen(false)
    } catch {
      toast.error(editingTeam ? "Failed to update department" : "Failed to create department")
    } finally {
      setSavingTeam(false)
    }
  }

  async function handleDeleteTeam() {
    if (!deleteTeamTarget) return
    try {
      await axios.delete(`/api/teams/${deleteTeamTarget._id}`)
      setTeams((prev) => prev.filter((t) => t._id !== deleteTeamTarget._id))
      toast.success("Department deleted")
      setDeleteTeamTarget(null)
    } catch {
      toast.error("Failed to delete department")
    }
  }

  function departmentsOf(userId: string) {
    return teams.filter((t) => t.members.some((m) => m._id === userId))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage members of your organization, their roles, and departments.
          </p>
        </div>
        {isOrgAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="icon-chip h-7 w-7 rounded-lg">
              <UsersRound className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold">Departments</h2>
            <Badge variant="secondary">{teams.length}</Badge>
          </div>
          {isOrgAdmin && (
            <Button variant="outline" size="sm" onClick={openCreateTeam}>
              <Plus className="h-4 w-4" />
              Add department
            </Button>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner className="py-8" />
        ) : teams.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No departments yet. Create departments like Dev, Content, or Graphics to organize your
            team and assign tasks department-wise.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div
                key={team._id}
                className="flex items-start justify-between gap-2 rounded-2xl border bg-card p-4 shadow-xs"
              >
                <div className="min-w-0 space-y-2">
                  <p className="truncate font-heading font-semibold tracking-tight">{team.name}</p>
                  <div className="flex items-center gap-2">
                    {team.members.length > 0 ? (
                      <AvatarStack users={team.members} max={5} size="xs" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No members</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {team.members.length} member{team.members.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                {isOrgAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditTeam(team)}>
                        <Pencil className="h-4 w-4" />
                        Edit department
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteTeamTarget(team)}>
                        <Trash2 className="h-4 w-4" />
                        Delete department
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="icon-chip h-7 w-7 rounded-lg">
            <Users className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold">Members</h2>
          <Badge variant="secondary">{members.length}</Badge>
        </div>

        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : members.length === 0 ? (
          <EmptyState icon={Users} title="No team members" description="Invite people to join your organization." />
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Departments</TableHead>
                  <TableHead>Last active</TableHead>
                  {isOrgAdmin && <TableHead className="w-12 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isSelf = member._id === currentUserId
                  const memberTeams = departmentsOf(member._id)
                  const manageable = canManage(currentRole, member, currentUserId)
                  // Only the super admin can change a role, and never their own.
                  const canEditRole = isSuperAdmin && !isSelf && member.role !== "superadmin"
                  return (
                    <TableRow key={member._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserAvatar name={member.name} avatar={member.avatar} size="sm" />
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell>
                        {canEditRole ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              value && handleRoleChange(member._id, value as "admin" | "member")
                            }
                            disabled={updatingUserId === member._id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm capitalize text-muted-foreground">
                            {member.role === "superadmin" ? "Super Admin" : member.role}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.status === "pending" && (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            Pending approval
                          </span>
                        )}
                        {member.status === "blocked" && (
                          <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                            Blocked
                          </span>
                        )}
                        {member.status === "active" && (
                          <span className="text-xs text-muted-foreground">Active</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {memberTeams.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {memberTeams.map((t) => (
                              <Badge key={t._id} variant="secondary" className="text-[10px]">
                                {t.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.lastSeen ? formatRelativeTime(member.lastSeen) : "Never"}
                      </TableCell>
                      {isOrgAdmin && (
                        <TableCell className="text-right">
                          {manageable && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button variant="ghost" size="icon" disabled={updatingUserId === member._id}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end">
                                {member.status === "pending" && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(member._id, "active")}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {member.status === "active" && (
                                  <DropdownMenuItem onClick={() => setBlockTarget(member)}>
                                    <Lock className="h-4 w-4" />
                                    Block
                                  </DropdownMenuItem>
                                )}
                                {member.status === "blocked" && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(member._id, "active")}
                                  >
                                    <ShieldOff className="h-4 w-4" />
                                    Reactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteUserTarget(member)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              They&apos;ll join as a pending member until an admin approves their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(value) => value && setInviteRole(value as "admin" | "member")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inviteRoleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department (optional)</Label>
              <Select value={inviteTeamId} onValueChange={(value) => value && setInviteTeamId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEAM}>No department</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team._id} value={team._id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || isInviting}>
              {isInviting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit department" : "New department"}</DialogTitle>
            <DialogDescription>
              {editingTeam
                ? "Rename the department or update its members."
                : "Create a department like Dev, Content, or Graphics and add its members."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                placeholder="e.g. Graphics team"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <UserSelect
                value={teamMemberIds}
                knownUsers={editingTeam?.members ?? []}
                onChange={setTeamMemberIds}
                placeholder="Add members"
                showTeams={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTeam} disabled={!teamName.trim() || savingTeam}>
              {savingTeam && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingTeam ? "Save changes" : "Create department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={blockTarget !== null}
        onOpenChange={(open) => !open && setBlockTarget(null)}
        title="Block member"
        description={`Are you sure you want to block ${blockTarget?.name ?? "this member"}? They will no longer be able to sign in until reactivated.`}
        confirmLabel="Block"
        destructive
        onConfirm={handleBlockMember}
      />

      <ConfirmDialog
        open={deleteUserTarget !== null}
        onOpenChange={(open) => !open && setDeleteUserTarget(null)}
        title="Delete member"
        description={`This will permanently delete ${deleteUserTarget?.name ?? "this member"}'s account and remove them from all departments and projects. This action cannot be undone.`}
        confirmLabel={deletingUser ? "Deleting..." : "Delete"}
        destructive
        onConfirm={handleDeleteMember}
      />

      <ConfirmDialog
        open={deleteTeamTarget !== null}
        onOpenChange={(open) => !open && setDeleteTeamTarget(null)}
        title="Delete department"
        description={`This will delete the "${deleteTeamTarget?.name ?? ""}" department. Members stay in the organization; only the department grouping is removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteTeam}
      />
    </div>
  )
}
