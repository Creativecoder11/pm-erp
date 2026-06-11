"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import axios from "axios"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { UserAvatar } from "@/components/shared/Avatar"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { formatRelativeTime } from "@/lib/utils"
import type { IUser, UserRole } from "@/types"

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "superadmin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
]

const INVITE_ROLE_OPTIONS: { value: "admin" | "member" | "guest"; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
]

export default function TeamSettingsPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<IUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<IUser | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "guest">("member")
  const [isInviting, setIsInviting] = useState(false)

  const isOrgAdmin = session?.user?.role === "admin" || session?.user?.role === "superadmin"

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    setIsLoading(true)
    try {
      const res = await axios.get("/api/users")
      setMembers(res.data.data as IUser[])
    } catch {
      toast.error("Failed to load team members")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRoleChange(userId: string, role: UserRole) {
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

  async function handleRemoveMember() {
    if (!removeTarget) return
    try {
      const res = await axios.put(`/api/users/${removeTarget._id}`, { isActive: false })
      const updated = res.data.data as IUser
      setMembers((prev) => prev.map((m) => (m._id === removeTarget._id ? { ...m, ...updated } : m)))
      toast.success("Member deactivated")
      setRemoveTarget(null)
    } catch {
      toast.error("Failed to remove member")
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setIsInviting(true)
    try {
      await axios.post("/api/users/invite", { email: inviteEmail.trim(), role: inviteRole })
      toast.success("Invitation sent")
      setInviteOpen(false)
      setInviteEmail("")
      setInviteRole("member")
      fetchMembers()
    } catch {
      toast.error("Failed to send invitation")
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage members of your organization and their roles.
          </p>
        </div>
        {isOrgAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="No team members" description="Invite people to join your organization." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last active</TableHead>
              {isOrgAdmin && <TableHead className="w-12 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member._id === session?.user?.id
              return (
                <TableRow key={member._id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={member.name} avatar={member.avatar} size="sm" />
                      <span className="font-medium">{member.name}</span>
                      {!member.isActive && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    {isOrgAdmin && !isSelf ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member._id, value as UserRole)}
                        disabled={updatingUserId === member._id}
                      >
                        <SelectTrigger className="w-36">
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
                      <span className="text-sm capitalize text-muted-foreground">{member.role}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.lastSeen ? formatRelativeTime(member.lastSeen) : "Never"}
                  </TableCell>
                  {isOrgAdmin && (
                    <TableCell className="text-right">
                      {!isSelf && member.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRemoveTarget(member)}
                          aria-label="Remove member"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization.
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
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "admin" | "member" | "guest")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove member"
        description={`Are you sure you want to deactivate ${removeTarget?.name ?? "this member"}? They will no longer be able to access the organization.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveMember}
      />
    </div>
  )
}
