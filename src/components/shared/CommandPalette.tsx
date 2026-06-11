"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import {
  LayoutDashboard,
  ListChecks,
  Gauge,
  BarChart3,
  Users,
  Settings,
  FolderKanban,
  CheckSquare,
  Plus,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useUIStore } from "@/store/uiStore"
import { useProjectStore } from "@/store/projectStore"
import type { ITask } from "@/types"

type TaskSearchResult = Omit<ITask, "projectId"> & {
  projectId: { _id: string; name: string; color: string }
}

const NAV_SHORTCUTS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "My Tasks", href: "/my-tasks", icon: ListChecks },
  { label: "Workload", href: "/workload", icon: Gauge },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Team", href: "/settings/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "All Projects", href: "/projects", icon: FolderKanban },
  { label: "New Project", href: "/projects/new", icon: Plus },
]

export function CommandPalette() {
  const router = useRouter()
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()
  const { projects, fetchProjects } = useProjectStore()
  const [search, setSearch] = useState("")
  const [tasks, setTasks] = useState<TaskSearchResult[]>([])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  useEffect(() => {
    if (commandPaletteOpen) fetchProjects()
  }, [commandPaletteOpen, fetchProjects])

  useEffect(() => {
    if (!commandPaletteOpen || search.trim().length < 2) return
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      axios
        .get("/api/tasks", { params: { search, limit: 8 }, signal: controller.signal })
        .then((res) => setTasks(res.data.data))
        .catch(() => {})
    }, 200)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [search, commandPaletteOpen])

  const showTasks = search.trim().length >= 2 && tasks.length > 0

  function go(href: string) {
    setCommandPaletteOpen(false)
    setSearch("")
    router.push(href)
  }

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Search tasks, projects, or jump to..." value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {showTasks && (
          <>
            <CommandGroup heading="Tasks">
              {tasks.map((task) => (
                <CommandItem
                  key={task._id}
                  value={`task-${task._id}`}
                  onSelect={() => go(`/projects/${task.projectId._id}/board?task=${task._id}`)}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {task.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Projects">
          {projects.map((project) => (
            <CommandItem
              key={project._id}
              value={`project-${project.name}`}
              onSelect={() => go(`/projects/${project._id}/board`)}
            >
              <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
              {project.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {NAV_SHORTCUTS.map((item) => (
            <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
