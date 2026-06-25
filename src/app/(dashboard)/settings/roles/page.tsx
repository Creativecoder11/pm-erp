"use client"

import { Info, Check } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { PERMISSION_MATRIX, type EffectiveRole, type PermissionAction } from "@/lib/permissions"

const ROLES: EffectiveRole[] = ["owner", "admin", "manager", "member", "viewer", "guest"]

const ACTIONS: PermissionAction[] = [
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
]

const ACTION_LABELS: Record<PermissionAction, string> = {
  "project.view": "View project",
  "project.edit": "Edit project",
  "project.delete": "Delete project",
  "project.archive": "Archive project",
  "project.manage_members": "Manage members",
  "project.manage_settings": "Manage settings",
  "task.view": "View tasks",
  "task.create": "Create tasks",
  "task.edit": "Edit tasks",
  "task.edit_own": "Edit own tasks",
  "task.delete": "Delete tasks",
  "comment.create": "Create comments",
  "reports.view": "View reports",
}

const ROLE_LABELS: Record<EffectiveRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
  guest: "Guest",
  none: "None",
}

export default function RolesSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Overview of what each role can do across projects and tasks.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          These permissions reflect the system&apos;s built-in roles and cannot be customized.
          They are shown here for reference only.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Permission</TableHead>
              {ROLES.map((role) => (
                <TableHead key={role} className="text-center capitalize">
                  {ROLE_LABELS[role]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ACTIONS.map((action) => (
              <TableRow key={action}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  {ACTION_LABELS[action]}
                </TableCell>
                {ROLES.map((role) => {
                  const hasPermission = PERMISSION_MATRIX[role].includes(action)
                  return (
                    <TableCell key={role} className="text-center">
                      <Checkbox checked={hasPermission} disabled className="mx-auto" />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5" />
        <span>A checked box indicates the role has that permission by default.</span>
      </div>
    </div>
  )
}
