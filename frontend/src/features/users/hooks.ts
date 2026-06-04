import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User, UserRole } from '@/types/api'

interface SaveResp { id: number; message: string }

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/api/users'),
  })
}

export function useSaveUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<User> & { password?: string; user_id?: number }) =>
      api.post<SaveResp>('/api/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const ROLE_LABELS: Record<UserRole, { label: string; variant: 'default' | 'warning' | 'secondary' }> = {
  super_admin: { label: 'Süper Admin', variant: 'warning' },
  admin: { label: 'Yönetici', variant: 'default' },
  user: { label: 'Kullanıcı', variant: 'secondary' },
}
