import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ArchiveEntity = 'shipments' | 'partners' | 'vehicles' | 'warehouses' | 'assignments'

export interface ArchivedItem {
  id: number
  deleted_at: string
  deleted_by: number | null
  deleted_by_username: string | null
  deleted_by_fullname: string | null
  // entity-specific fields (any to keep type flexible across tabs)
  [k: string]: unknown
}

export interface ArchiveListResp {
  items: ArchivedItem[]
  total: number
  entity: string
}

export function useArchiveCounts() {
  return useQuery({
    queryKey: ['archive', 'counts'],
    queryFn: () => api.get<Record<ArchiveEntity, number>>('/api/archive/counts'),
    staleTime: 30_000,
  })
}

export function useArchiveList(entity: ArchiveEntity, q?: string) {
  return useQuery({
    queryKey: ['archive', 'list', entity, q || ''],
    queryFn: () =>
      api.get<ArchiveListResp>(`/api/archive/${entity}`, q ? { q } : undefined),
    staleTime: 10_000,
  })
}

export function useRestoreOne(entity: ArchiveEntity) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/api/archive/${entity}/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['archive'] })
      // Aktif listeleri de tazelet — geri yüklenen kayıt artık görünür
      qc.invalidateQueries({ queryKey: [entity] })
    },
  })
}

export function usePurgeOne(entity: ArchiveEntity) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/archive/${entity}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['archive'] })
    },
  })
}

export function useBulkRestore(entity: ArchiveEntity) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => api.post(`/api/archive/${entity}/bulk-restore`, { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['archive'] })
      qc.invalidateQueries({ queryKey: [entity] })
    },
  })
}

export function useBulkPurge(entity: ArchiveEntity) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => api.post(`/api/archive/${entity}/bulk-purge`, { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['archive'] })
    },
  })
}
