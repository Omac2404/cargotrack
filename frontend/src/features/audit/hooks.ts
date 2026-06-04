import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AuditEntry } from '@/types/api'

interface AuditFilters {
  entity_type?: string
  entity_id?: number
  user_id?: number
  limit?: number
  offset?: number
}

export function useAuditLog(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: () => api.get<AuditEntry[]>('/api/audit', filters as Record<string, string | number | undefined>),
    staleTime: 30_000,
  })
}
