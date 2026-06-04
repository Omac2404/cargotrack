import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Assignment } from '@/types/api'

interface SaveResp { id: number; message: string }

export function useAssignments(filters?: { vehicle_id?: number; shipment_id?: number }) {
  return useQuery({
    queryKey: ['assignments', filters],
    queryFn: () => api.get<Assignment[]>('/api/assignments', filters as Record<string, string | number | undefined>),
  })
}

export function useSaveAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Assignment> & { assignment_id?: number }) =>
      api.post<SaveResp>('/api/assignments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      qc.invalidateQueries({ queryKey: ['load-pool'] })
      qc.invalidateQueries({ queryKey: ['vehicle-load'] })
    },
  })
}

export function useDeleteAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/api/assignments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      qc.invalidateQueries({ queryKey: ['load-pool'] })
      qc.invalidateQueries({ queryKey: ['vehicle-load'] })
    },
  })
}

// === Yük Havuzu (sevkiyat-bazlı, kalan miktarlar) ===
export interface LoadPoolItem {
  id: number
  shipment_no: string | null
  transport_type: string | null
  status: string | null
  client_billing: string | null
  departure_country: string | null
  arrival_country: string | null
  total_quantity: number
  total_weight: number
  assigned_quantity: number
  assigned_weight: number
  assignment_count: number
  remaining_quantity: number
  remaining_weight: number
  is_unassigned: boolean
  is_fully_assigned: boolean
}

export type LoadPoolStatus = 'unassigned' | 'partial' | 'all'

export interface LoadPoolFilters {
  status?: LoadPoolStatus
  transport_type?: string
  q?: string
}

export function useLoadPool(filters?: LoadPoolFilters) {
  return useQuery({
    queryKey: ['load-pool', filters],
    queryFn: () => api.get<LoadPoolItem[]>('/api/assignments/load-pool', filters as Record<string, string | undefined>),
  })
}
