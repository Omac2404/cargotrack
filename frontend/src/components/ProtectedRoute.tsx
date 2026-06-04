import { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { api } from '@/lib/api'
import type { User } from '@/types/api'

interface Props {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const user = useAuth((s) => s.user)
  const login = useAuth((s) => s.login)
  const location = useLocation()
  const refreshed = useRef(false)

  // İlk render'da: localStorage'daki user objesi yeni alanları (permissions) içermiyorsa
  // /me endpoint'inden refresh et. Token zaten var.
  useEffect(() => {
    if (!isAuthenticated || refreshed.current) return
    if (user && user.permissions && user.permissions.length > 0) return
    refreshed.current = true
    api.get<{ user: User }>('/api/auth/me')
      .then((data) => {
        const token = localStorage.getItem('ct_token') || ''
        if (token && data.user) login(token, data.user)
      })
      .catch(() => { /* sessiz — auth failure zaten unauthorized event tetikler */ })
  }, [isAuthenticated, user, login])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Şifre değişimi zorunlu ise /profile'a yönlendir (orası hariç hiçbir yere gidemez)
  if (user?.must_change_password && location.pathname !== '/profile') {
    return <Navigate to="/profile" state={{ forced: true }} replace />
  }

  return <>{children}</>
}
