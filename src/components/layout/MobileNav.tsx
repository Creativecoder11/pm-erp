"use client"

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { SidebarNav } from "@/components/layout/Sidebar"
import { useUIStore } from "@/store/uiStore"

export function MobileNav() {
  const { mobileNavOpen, setMobileNavOpen } = useUIStore()

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
