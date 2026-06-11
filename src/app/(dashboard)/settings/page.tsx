"use client"

import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from "next-auth/react"
import axios from "axios"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { updateOrganizationSchema } from "@/lib/validations"
import type { IOrganization } from "@/types"
import type { z } from "zod"

type FormInput = z.input<typeof updateOrganizationSchema>

export default function OrganizationSettingsPage() {
  const { data: session } = useSession()
  const [org, setOrg] = useState<IOrganization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const isOrgAdmin = session?.user?.role === "admin" || session?.user?.role === "superadmin"

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: "",
      logo: "",
      settings: {
        allowPublicProjects: false,
        defaultProjectVisibility: "private",
        maxMembers: 10,
      },
    },
  })

  useEffect(() => {
    async function fetchOrg() {
      try {
        const res = await axios.get("/api/organizations")
        const data = res.data.data as IOrganization
        setOrg(data)
        reset({
          name: data.name,
          logo: data.logo ?? "",
          settings: {
            allowPublicProjects: data.settings.allowPublicProjects,
            defaultProjectVisibility: data.settings.defaultProjectVisibility,
            maxMembers: data.settings.maxMembers,
          },
        })
      } catch {
        toast.error("Failed to load organization settings")
      } finally {
        setIsLoading(false)
      }
    }
    fetchOrg()
  }, [reset])

  async function onSubmit(data: FormInput) {
    setIsSaving(true)
    try {
      const res = await axios.put("/api/organizations", data)
      setOrg(res.data.data as IOrganization)
      toast.success("Organization settings updated")
    } catch {
      toast.error("Failed to update organization settings")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner className="py-16" />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization&apos;s profile and project defaults.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic information about your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {org?.slug && <Badge variant="outline">Slug: {org.slug}</Badge>}
              {org?.plan && <Badge variant="secondary" className="capitalize">{org.plan} plan</Badge>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Organization name</Label>
              <Input id="name" disabled={!isOrgAdmin} {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input id="logo" placeholder="https://..." disabled={!isOrgAdmin} {...register("logo")} />
              {errors.logo && <p className="text-xs text-destructive">{errors.logo.message}</p>}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="allowPublicProjects">Allow public projects</Label>
                <p className="text-xs text-muted-foreground">
                  Members can create projects visible to anyone in the organization.
                </p>
              </div>
              <Controller
                control={control}
                name="settings.allowPublicProjects"
                render={({ field }) => (
                  <Switch
                    id="allowPublicProjects"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    disabled={!isOrgAdmin}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default project visibility</Label>
                <Controller
                  control={control}
                  name="settings.defaultProjectVisibility"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isOrgAdmin}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMembers">Max members</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  min={1}
                  disabled={!isOrgAdmin}
                  {...register("settings.maxMembers", { valueAsNumber: true })}
                />
                {errors.settings?.maxMembers && (
                  <p className="text-xs text-destructive">{errors.settings.maxMembers.message}</p>
                )}
              </div>
            </div>

            {isOrgAdmin && (
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
