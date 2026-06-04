import { create } from 'zustand'

/**
 * Genel UI state — mobil sidebar drawer'ı vs.
 */
interface UIState {
  /** Mobil ekranda sidebar drawer açık mı */
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (o: boolean) => void
  toggleMobileSidebar: () => void
}

export const useUI = create<UIState>((set) => ({
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (o) => set({ mobileSidebarOpen: o }),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
}))
