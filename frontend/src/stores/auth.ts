import { create } from 'zustand'
import type { User } from '@/types/api'
import { clearToken, setToken } from '@/lib/api'
import { hasPermission, type PermissionKey } from '@/lib/permissions'

const USER_KEY = 'ct_user'

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  hasRole: (minRole: 'user' | 'admin' | 'super_admin') => boolean
  can: (permission: PermissionKey) => boolean
}

const ROLE_RANK: Record<string, number> = { user: 1, admin: 2, super_admin: 3 }

export const useAuth = create<AuthState>((set, get) => ({
  user: loadUser(),
  isAuthenticated: !!loadUser() && !!localStorage.getItem('ct_token'),
  login: (token, user) => {
    setToken(token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },
  logout: () => {
    clearToken()
    localStorage.removeItem(USER_KEY)
    set({ user: null, isAuthenticated: false })
  },
  hasRole: (minRole) => {
    const u = get().user
    if (!u) return false
    return (ROLE_RANK[u.role] || 0) >= (ROLE_RANK[minRole] || 0)
  },
  can: (permission) => {
    const u = get().user
    if (!u) return false
    return hasPermission(u.permissions, permission)
  },
}))
