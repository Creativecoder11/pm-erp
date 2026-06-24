import { create } from "zustand"

interface UIStore {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  commandPaletteOpen: boolean
  activeTaskId: string | null
  celebration: number
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  openTaskModal: (taskId: string) => void
  closeTaskModal: () => void
  celebrate: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  commandPaletteOpen: false,
  activeTaskId: null,
  celebration: 0,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  openTaskModal: (taskId) => set({ activeTaskId: taskId }),
  closeTaskModal: () => set({ activeTaskId: null }),
  celebrate: () => set((state) => ({ celebration: state.celebration + 1 })),
}))
