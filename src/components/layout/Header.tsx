"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { signOut, useSession } from "next-auth/react"
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Laptop,
  CheckCheck,
  Settings,
  LogOut,
  User,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserAvatar } from "@/components/shared/Avatar"
import { useUIStore } from "@/store/uiStore"
import { useNotifications } from "@/hooks/useNotifications"
import { cn, formatRelativeTime } from "@/lib/utils"
import { NOTIFICATION_ICONS } from "@/lib/notification-icons"

export function Header() {
  const { setMobileNavOpen, setCommandPaletteOpen } = useUIStore()
  const { setTheme } = useTheme()
  const { data: session } = useSession()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllAsRead()}>
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet
                </p>
              ) : (
                notifications.map((n) => {
                  const Icon = NOTIFICATION_ICONS[n.type] ?? Bell
                  return (
                    <Link
                      key={n._id}
                      href={n.link || "#"}
                      onClick={() => !n.isRead && markAsRead(n._id)}
                      className={cn(
                        "flex items-start gap-3 border-b px-3 py-2.5 text-sm transition-colors last:border-0 hover:bg-accent",
                        !n.isRead && "bg-accent/40"
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 space-y-0.5">
                        <p className="font-medium leading-snug">{n.title}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(n.createdAt)}
                        </p>
                      </div>
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </Link>
                  )
                })
              )}
            </ScrollArea>
            <div className="border-t p-2">
              <Link href="/notifications">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View all notifications
                </Button>
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Laptop className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            openOnHover
            closeDelay={150}
            render={
              <button type="button" className="ml-1 rounded-full">
                <UserAvatar
                  name={session?.user?.name ?? "User"}
                  avatar={session?.user?.image ?? undefined}
                  size="sm"
                />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <p className="truncate text-sm font-medium">{session?.user?.name}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">
                  {session?.user?.email}
                </p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </Link>
              }
            />
            <DropdownMenuItem
              render={
                <Link href="/settings/team">
                  <Users className="mr-2 h-4 w-4" />
                  Team
                </Link>
              }
            />
            <DropdownMenuItem
              render={
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              }
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
