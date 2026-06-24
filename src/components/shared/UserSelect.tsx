"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { Check, ChevronsUpDown, UserPlus, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { UserAvatar, AvatarStack } from "@/components/shared/Avatar"
import { cn } from "@/lib/utils"
import type { ITeamWithMembers, IUserSummary } from "@/types"

interface UserSelectProps {
  value: string[]
  onChange: (ids: string[]) => void
  multiple?: boolean
  placeholder?: string
  className?: string
  /** Show a "Departments" group that assigns all members of a department at once. */
  showTeams?: boolean
  /**
   * Already-known user objects for the current `value` (e.g. a task's populated
   * assignees). Lets the trigger render names/avatars immediately, instead of only
   * after the picker has been opened and its own user search has resolved the ids.
   */
  knownUsers?: IUserSummary[]
}

export function UserSelect({
  value,
  onChange,
  multiple = true,
  placeholder = "Assign people",
  className,
  showTeams = true,
  knownUsers = [],
}: UserSelectProps) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<IUserSummary[]>([])
  const [teams, setTeams] = useState<ITeamWithMembers[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    axios
      .get("/api/users", { params: { search }, signal: controller.signal })
      .then((res) => setUsers(res.data.data))
      .catch(() => {})
    return () => controller.abort()
  }, [open, search])

  useEffect(() => {
    if (!open || !showTeams || !multiple) return
    const controller = new AbortController()
    axios
      .get("/api/teams", { signal: controller.signal })
      .then((res) => setTeams(res.data.data))
      .catch(() => {})
    return () => controller.abort()
  }, [open, showTeams, multiple])

  const userMap = useMemo(() => {
    const map = new Map<string, IUserSummary>()
    for (const u of knownUsers) map.set(u._id, u)
    for (const u of users) map.set(u._id, u)
    return map
  }, [knownUsers, users])

  const selectedUsers = value
    .map((id) => userMap.get(id))
    .filter((u): u is IUserSummary => !!u)

  function toggleUser(id: string) {
    if (multiple) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
    } else {
      onChange(value.includes(id) ? [] : [id])
      setOpen(false)
    }
  }

  function toggleTeam(team: ITeamWithMembers) {
    const memberIds = team.members.map((m) => m._id)
    if (memberIds.length === 0) return
    const allSelected = memberIds.every((id) => value.includes(id))
    if (allSelected) {
      onChange(value.filter((v) => !memberIds.includes(v)))
    } else {
      onChange(Array.from(new Set([...value, ...memberIds])))
    }
  }

  const query = search.trim().toLowerCase()
  const visibleTeams =
    showTeams && multiple
      ? teams.filter((t) => t.members.length > 0 && (!query || t.name.toLowerCase().includes(query)))
      : []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", className)}
          >
            {value.length === 0 ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <UserPlus className="h-4 w-4" />
                {placeholder}
              </span>
            ) : (
              <AvatarStack users={selectedUsers} />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search people..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No people found.</CommandEmpty>
            {visibleTeams.length > 0 && (
              <CommandGroup heading="Departments">
                {visibleTeams.map((team) => {
                  const memberIds = team.members.map((m) => m._id)
                  const allSelected = memberIds.every((id) => value.includes(id))
                  return (
                    <CommandItem
                      key={team._id}
                      value={`team-${team._id}`}
                      onSelect={() => toggleTeam(team)}
                    >
                      <span className="icon-chip mr-2 h-7 w-7 rounded-lg">
                        <UsersRound className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm">{team.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {team.members.length} member{team.members.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <Check
                        className={cn("ml-auto h-4 w-4", allSelected ? "opacity-100" : "opacity-0")}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
            <CommandGroup heading={visibleTeams.length > 0 ? "People" : undefined}>
              {users.map((u) => (
                <CommandItem key={u._id} value={u._id} onSelect={() => toggleUser(u._id)}>
                  <UserAvatar name={u.name} avatar={u.avatar} size="sm" className="mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value.includes(u._id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
