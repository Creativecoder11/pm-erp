"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { DatePicker } from "@/components/shared/DatePicker"
import { useProjectStore } from "@/store/projectStore"
import { cn } from "@/lib/utils"
import { createProjectSchema } from "@/lib/validations"
import type { z } from "zod"

type FormInput = z.input<typeof createProjectSchema>

const PROJECT_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#84cc16",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
]

export default function NewProjectPage() {
  const router = useRouter()
  const { addProject } = useProjectStore()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      color: PROJECT_COLORS[0],
      visibility: "team",
      tags: [],
    },
  })

  async function onSubmit(data: FormInput) {
    setError(null)
    setIsLoading(true)
    try {
      const payload = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate as string).toISOString() : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate as string).toISOString() : undefined,
      }
      const res = await axios.post("/api/projects", payload)
      addProject(res.data.data)
      router.push(`/projects/${res.data.data._id}/board`)
    } catch {
      setError("Could not create project. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
        <p className="text-sm text-muted-foreground">Set up a new project for your team to collaborate on.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>You can change these settings anytime from project settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" placeholder="e.g. Website Redesign" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this project about?"
                rows={3}
                {...register("description")}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ backgroundColor: color }}
                        onClick={() => field.onChange(color)}
                      >
                        {field.value === color && <Check className="h-4 w-4 text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              />
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
                <Label>Due date</Label>
                <Controller
                  control={control}
                  name="dueDate"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ? new Date(field.value) : null}
                      onChange={(date) => field.onChange(date ? date.toISOString() : "")}
                      placeholder="No due date"
                    />
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Start date</Label>
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? new Date(field.value) : null}
                    onChange={(date) => field.onChange(date ? date.toISOString() : "")}
                    placeholder="No start date"
                    className={cn("sm:max-w-[calc(50%-0.5rem)]")}
                  />
                )}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
