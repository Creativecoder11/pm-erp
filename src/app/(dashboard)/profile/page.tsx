"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from "next-auth/react"
import axios from "axios"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/Avatar"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { updateUserSchema } from "@/lib/validations"
import type { IUser, ITeamWithMembers } from "@/types"
import type { z } from "zod"

const profileSchema = updateUserSchema.pick({ name: true, avatar: true })
type FormInput = z.input<typeof profileSchema>

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [user, setUser] = useState<IUser | null>(null)
  const [departments, setDepartments] = useState<ITeamWithMembers[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", avatar: "" },
  })

  const avatarPreview = watch("avatar")
  const namePreview = watch("name")

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    async function load() {
      try {
        const [userRes, teamsRes] = await Promise.all([
          axios.get(`/api/users/${userId}`),
          axios.get("/api/teams"),
        ])
        const data = userRes.data.data as IUser
        setUser(data)
        reset({ name: data.name, avatar: data.avatar ?? "" })

        const teams = teamsRes.data.data as ITeamWithMembers[]
        setDepartments(teams.filter((t) => t.members.some((m) => m._id === userId)))
      } catch {
        toast.error("Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [session?.user?.id, reset])

  async function onSubmit(data: FormInput) {
    if (!user) return
    setIsSaving(true)
    try {
      const res = await axios.put(`/api/users/${user._id}`, data)
      const updated = res.data.data as IUser
      setUser(updated)
      await update({ name: updated.name, image: updated.avatar })
      toast.success("Profile updated")
    } catch {
      toast.error("Failed to update profile")
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
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal information and how others see you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Your name and avatar are visible to your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex items-center gap-4">
              <UserAvatar
                name={namePreview || user?.name || "User"}
                avatar={avatarPreview || undefined}
                size="lg"
                className="h-16 w-16 text-xl"
              />
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">
                  {user?.role}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input id="avatar" placeholder="https://..." {...register("avatar")} />
              {errors.avatar && <p className="text-xs text-destructive">{errors.avatar.message}</p>}
            </div>

            {departments.length > 0 && (
              <div className="space-y-2">
                <Label>Departments</Label>
                <div className="flex flex-wrap gap-2">
                  {departments.map((d) => (
                    <Badge key={d._id} variant="outline">
                      {d.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
