"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/login", label: "Sign In" },
  { href: "/register", label: "Sign Up" },
]

export function AuthTabs() {
  const pathname = usePathname()

  return (
    <div className="mb-8 grid grid-cols-2 rounded-xl bg-muted p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg py-2 text-center text-sm font-medium transition-all",
              active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
