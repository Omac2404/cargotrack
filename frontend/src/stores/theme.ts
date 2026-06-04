import { create } from 'zustand'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'ct_theme'

function loadTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark')
}

interface ThemeState {
  theme: Theme
  set: (t: Theme) => void
  toggle: () => void
}

const initial = loadTheme()
applyTheme(initial)

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initial,
  set: (t) => {
    localStorage.setItem(STORAGE_KEY, t)
    applyTheme(t)
    set({ theme: t })
  },
  toggle: () => get().set(get().theme === 'dark' ? 'light' : 'dark'),
}))
