"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Loader2, Lock, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { useProjectStore } from "@/store/projectStore"
import { generateId } from "@/lib/utils"
import { updateProjectSchema } from "@/lib/validations"
import type {
  CustomFieldType,
  ICustomFieldDef,
  IProjectColumn,
  IProjectMember,
  IUserSummary,
} from "@/types"
import type { z } from "zod"

interface SettingsPageProps {
  params: Promise<{ id: string }>
}

type PopulatedMember = Omit<IProjectMember, "userId"> & { userId: IUserSummary }

const basicsSchema = updateProjectSchema.pick({
  name: true,
  description: true,
  color: true,
  icon: true,
  visibility: true,
  status: true,
})

type BasicsInput = z.input<typeof basicsSchema>

const CUSTOM_FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
]

const HAS_OPTIONS: CustomFieldType[] = ["select", "multiselect"]

export default function ProjectSettingsPage({ params }: SettingsPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const { currentProject, updateProjectLocal, removeProject } = useProjectStore()

  const [isSavingBasics, setIsSavingBasics] = useState(false)
  const [isSavingFields, setIsSavingFields] = useState(false)
  const [isSavingColumns, setIsSavingColumns] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [newField, setNewField] = useState<{
    name: string
    type: CustomFieldType
    options: string
    required: boolean
  }>({ name: "", type: "text", options: "", required: false })

  const [newColumnName, setNewColumnName] = useState("")

  const project = currentProject?._id === id ? currentProject : null

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BasicsInput>({
    resolver: zodResolver(basicsSchema),
    values: project
      ? {
          name: project.name,
          description: project.description ?? "",
          color: project.color,
          icon: project.icon ?? "",
          visibility: project.visibility,
          status: project.status,
        }
      : undefined,
  })

  if (!project) return null

  const members = project.members as unknown as PopulatedMember[]
  const currentUserId = session?.user?.id
  const isOwner = currentUserId === project.ownerId
  const currentMember = members.find((m) => m.userId._id === currentUserId)
  const canManage = isOwner || currentMember?.role === "manager"

  if (!canManage) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState
          icon={Lock}
          title="Read-only access"
          description="Only the project owner or a manager can edit project settings."
        />
      </div>
    )
  }

  async function onSubmitBasics(data: BasicsInput) {
    setIsSavingBasics(true)
    try {
      const res = await axios.put(`/api/projects/${id}`, data)
      updateProjectLocal(id, res.data.data)
      toast.success("Project settings updated")
      reset(data)
    } catch {
      toast.error("Failed to update project")
    } finally {
      setIsSavingBasics(false)
    }
  }

  async function saveCustomFields(fields: ICustomFieldDef[]) {
    setIsSavingFields(true)
    try {
      const res = await axios.put(`/api/projects/${id}`, { customFields: fields })
      updateProjectLocal(id, res.data.data)
      toast.success("Custom fields updated")
    } catch {
      toast.error("Failed to update custom fields")
    } finally {
      setIsSavingFields(false)
    }
  }

  function handleAddField() {
    if (!newField.name.trim()) return
    const field: ICustomFieldDef = {
      id: generateId("field"),
      name: newField.name.trim(),
      type: newField.type,
      required: newField.required,
      ...(HAS_OPTIONS.includes(newField.type)
        ? {
            options: newField.options
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean),
          }
        : {}),
    }
    saveCustomFields([...(project!.customFields ?? []), field])
    setNewField({ name: "", type: "text", options: "", required: false })
  }

  function handleDeleteField(fieldId: string) {
    saveCustomFields((project!.customFields ?? []).filter((f) => f.id !== fieldId))
  }

  function handleUpdateField(fieldId: string, updates: Partial<ICustomFieldDef>) {
    const updated = (project!.customFields ?? []).map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    )
    saveCustomFields(updated)
  }

  async function saveColumns(columns: IProjectColumn[]) {
    setIsSavingColumns(true)
    try {
      const normalized = columns.map((c, idx) => ({ ...c, order: idx }))
      const res = await axios.put(`/api/projects/${id}`, { columns: normalized })
      updateProjectLocal(id, res.data.data)
      toast.success("Columns updated")
    } catch {
      toast.error("Failed to update columns")
    } finally {
      setIsSavingColumns(false)
    }
  }

  function handleAddColumn() {
    if (!newColumnName.trim()) return
    const columns = [...(project!.columns ?? [])].sort((a, b) => a.order - b.order)
    const newColumn: IProjectColumn = {
      id: generateId("col"),
      name: newColumnName.trim(),
      color: "#94a3b8",
      order: columns.length,
    }
    saveColumns([...columns, newColumn])
    setNewColumnName("")
  }

  function handleRenameColumn(columnId: string, name: string) {
    const columns = (project!.columns ?? []).map((c) => (c.id === columnId ? { ...c, name } : c))
    saveColumns(columns)
  }

  function handleColumnLimit(columnId: string, limit: string) {
    const value = limit.trim() === "" ? undefined : Number(limit)
    const columns = (project!.columns ?? []).map((c) =>
      c.id === columnId ? { ...c, limit: value !== undefined && !Number.isNaN(value) ? value : undefined } : c
    )
    saveColumns(columns)
  }

  function handleColumnColor(columnId: string, color: string) {
    const columns = (project!.columns ?? []).map((c) => (c.id === columnId ? { ...c, color } : c))
    saveColumns(columns)
  }

  function handleDeleteColumn(columnId: string) {
    const columns = (project!.columns ?? []).filter((c) => c.id !== columnId)
    saveColumns(columns)
  }

  function handleMoveColumn(columnId: string, direction: -1 | 1) {
    const columns = [...(project!.columns ?? [])].sort((a, b) => a.order - b.order)
    const index = columns.findIndex((c) => c.id === columnId)
    const targetIndex = index + direction
    if (index === -1 || targetIndex < 0 || targetIndex >= columns.length) return
    const reordered = [...columns]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    saveColumns(reordered)
  }

  async function handleArchive() {
    setIsArchiving(true)
    try {
      const res = await axios.put(`/api/projects/${id}`, { status: "archived" })
      updateProjectLocal(id, res.data.data)
      toast.success("Project archived")
    } catch {
      toast.error("Failed to archive project")
    } finally {
      setIsArchiving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await axios.delete(`/api/projects/${id}`)
      removeProject(id)
      toast.success("Project deleted")
      router.push("/projects")
    } catch {
      toast.error("Failed to delete project")
      setIsDeleting(false)
    }
  }

  const sortedColumns = [...(project.customFields ?? [])]
  const columns = [...(project.columns ?? [])].sort((a, b) => a.order - b.order)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <form onSubmit={handleSubmit(onSubmitBasics)}>
          <CardHeader>
            <CardTitle>Project basics</CardTitle>
            <CardDescription>Update the core information for this project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register("description")} />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" type="color" className="h-9 w-full p-1" {...register("color")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Input id="icon" placeholder="e.g. rocket" {...register("icon")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Controller
                  control={control}
                  name="visibility"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private — invite only</SelectItem>
                        <SelectItem value="team">Team — visible to org members</SelectItem>
                        <SelectItem value="public">Public — visible to everyone</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={isSavingBasics}>
              {isSavingBasics && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom fields</CardTitle>
          <CardDescription>Define extra fields that can be set on tasks in this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedColumns.length > 0 && (
            <div className="space-y-3">
              {sortedColumns.map((field) => (
                <div key={field.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                  <Input
                    value={field.name}
                    onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                    className="max-w-48"
                  />
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium capitalize text-muted-foreground">
                    {field.type}
                  </span>
                  {HAS_OPTIONS.includes(field.type) && (
                    <Input
                      value={(field.options ?? []).join(", ")}
                      onChange={(e) =>
                        handleUpdateField(field.id, {
                          options: e.target.value
                            .split(",")
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Comma-separated options"
                      className="min-w-48 flex-1"
                    />
                  )}
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        handleUpdateField(field.id, { required: checked === true })
                      }
                    />
                    Required
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => handleDeleteField(field.id)}
                    disabled={isSavingFields}
                    aria-label="Delete field"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <Label>Add a custom field</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Field name"
                value={newField.name}
                onChange={(e) => setNewField((f) => ({ ...f, name: e.target.value }))}
                className="max-w-48"
              />
              <Select
                value={newField.type}
                onValueChange={(value) => setNewField((f) => ({ ...f, type: value as CustomFieldType }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {HAS_OPTIONS.includes(newField.type) && (
                <Input
                  placeholder="Comma-separated options"
                  value={newField.options}
                  onChange={(e) => setNewField((f) => ({ ...f, options: e.target.value }))}
                  className="min-w-48 flex-1"
                />
              )}
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={newField.required}
                  onCheckedChange={(checked) => setNewField((f) => ({ ...f, required: checked === true }))}
                />
                Required
              </label>
              <Button onClick={handleAddField} disabled={!newField.name.trim() || isSavingFields}>
                <Plus className="h-4 w-4" />
                Add field
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kanban columns</CardTitle>
          <CardDescription>Configure the columns shown on the project board.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {columns.map((column, index) => (
            <div key={column.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
              <Input
                type="color"
                value={column.color}
                onChange={(e) => handleColumnColor(column.id, e.target.value)}
                className="h-9 w-12 p-1"
              />
              <Input
                value={column.name}
                onChange={(e) => handleRenameColumn(column.id, e.target.value)}
                className="max-w-48"
              />
              <Input
                type="number"
                min={0}
                placeholder="WIP limit"
                value={column.limit ?? ""}
                onChange={(e) => handleColumnLimit(column.id, e.target.value)}
                className="w-28"
              />
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveColumn(column.id, -1)}
                  disabled={index === 0 || isSavingColumns}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveColumn(column.id, 1)}
                  disabled={index === columns.length - 1 || isSavingColumns}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteColumn(column.id)}
                  disabled={isSavingColumns}
                  aria-label="Delete column"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          <Separator />

          <div className="flex items-center gap-2">
            <Input
              placeholder="New column name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="max-w-48"
            />
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim() || isSavingColumns}>
              <Plus className="h-4 w-4" />
              Add column
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>These actions are irreversible or significantly affect the project.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Archive project</p>
            <p className="text-sm text-muted-foreground">
              Archived projects are read-only and hidden from active project lists.
            </p>
          </div>
          <Button variant="outline" onClick={handleArchive} disabled={isArchiving || project.status === "archived"}>
            {isArchiving && <Loader2 className="h-4 w-4 animate-spin" />}
            Archive project
          </Button>
        </CardContent>
        <CardContent className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Delete project</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete this project and all of its tasks and comments.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete project
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project"
        description={`This will permanently delete "${project.name}" and all of its tasks and comments. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
