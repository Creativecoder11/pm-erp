"use client"

import { useState } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
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
import { UserSelect } from "@/components/shared/UserSelect"
import type { IProjectMember, IUserSummary, ProjectRole } from "@/types"

type PopulatedMember = Omit<IProjectMember, "userId"> & { userId: IUserSummary }

interface MemberListProps {
  projectId: string
  members: PopulatedMember[]
  ownerId: string
  canManage: boolean
  onMembersChange: (members: PopulatedMember[]) => void
}

const ROLE_OPTIONS: { value: ProjectRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
]

export function MemberList({ projectId, members, ownerId, canManage, onMembersChange }: MemberListProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [newUserIds, setNewUserIds] = useState<string[]>([])
  const [newRole, setNewRole] = useState<ProjectRole>("member")
  const [isAdding, setIsAdding] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<PopulatedMember | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  async function handleRoleChange(userId: string, role: ProjectRole) {
    setUpdatingUserId(userId)
    try {
      const res = await axios.put(`/api/projects/${projectId}/members`, { userId, role })
      onMembersChange(res.data.data as PopulatedMember[])
      toast.success("Member role updated")
    } catch {
      toast.error("Failed to update member role")
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function handleAddMember() {
    if (newUserIds.length === 0) return
    setIsAdding(true)
    try {
      const res = await axios.post(`/api/projects/${projectId}/members`, {
        userId: newUserIds[0],
        role: newRole,
      })
      onMembersChange(res.data.data as PopulatedMember[])
      toast.success("Member added")
      setAddOpen(false)
      setNewUserIds([])
      setNewRole("member")
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.status === 400
        ? "User is already a member of this project"
        : "Failed to add member"
      toast.error(message)
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemoveMember() {
    if (!removeTarget) return
    try {
      const res = await axios.delete(`/api/projects/${projectId}/members`, {
        params: { userId: removeTarget.userId._id },
      })
      onMembersChange(res.data.data as PopulatedMember[])
      toast.success("Member removed")
      setRemoveTarget(null)
    } catch {
      toast.error("Failed to remove member")
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add member
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            {canManage && <TableHead className="w-12 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const user = member.userId
            const isOwner = user._id === ownerId
            return (
              <TableRow key={user._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
                    <span className="font-medium">{user.name}</span>
                    {isOwner && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        Owner
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  {canManage && !isOwner ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(user._id, value as ProjectRole)}
                      disabled={updatingUserId === user._id}
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
                      {isOwner ? "Manager" : member.role}
                    </span>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    {!isOwner && (
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              Add an organization member to this project and assign their role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Person</Label>
              <UserSelect value={newUserIds} onChange={setNewUserIds} multiple={false} placeholder="Select a person" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as ProjectRole)}>
                <SelectTrigger className="w-full">
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
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddMember} disabled={newUserIds.length === 0 || isAdding}>
              Add member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove member"
        description={`Are you sure you want to remove ${removeTarget?.userId.name ?? "this member"} from the project?`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveMember}
      />
    </div>
  )
}
