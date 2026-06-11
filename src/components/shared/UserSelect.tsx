"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Check, ChevronsUpDown, UserPlus } from "lucide-react"
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
import type { IUserSummary } from "@/types"

interface UserSelectProps {
  value: string[]
  onChange: (ids: string[]) => void
  multiple?: boolean
  placeholder?: string
  className?: string
}

export function UserSelect({
  value,
  onChange,
  multiple = true,
  placeholder = "Assign people",
  className,
}: UserSelectProps) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<IUserSummary[]>([])
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

  const selectedUsers = users.filter((u) => value.includes(u._id))

  function toggleUser(id: string) {
    if (multiple) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
    } else {
      onChange(value.includes(id) ? [] : [id])
      setOpen(false)
    }
  }

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
            <CommandGroup>
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
