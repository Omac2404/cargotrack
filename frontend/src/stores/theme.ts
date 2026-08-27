import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'blue'
const STORAGE_KEY = 'ct_theme'

function loadTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY) as string | null
  if (saved === 'turquoise') return 'blue' // eski ad
  if (saved === 'light' || saved === 'dark' || saved === 'blue') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(t: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', t === 'dark')
  root.classList.toggle('blue', t === 'blue')
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
  // Sirali gecis: aydinlik -> karanlik -> mavi -> aydinlik (kisayol icin)
  toggle: () => {
    const order: Theme[] = ['light', 'dark', 'blue']
    const cur = order.indexOf(get().theme)
    get().set(order[(cur + 1) % order.length])
  },
}))
