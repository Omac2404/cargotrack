import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Shipment, TransportType, AuditEntry } from '@/types/api'

export interface ShipmentChangeEntry extends Omit<AuditEntry, 'changes'> {
  changes: Record<string, { from: unknown; to: unknown }> | null
}

interface DeleteParams {
  id: number
  expected_transport_type?: TransportType
}

interface SaveResponse {
  id: number
  shipment_no?: string
  message: string
}

export function useShipments(transportType?: TransportType) {
  return useQuery({
    queryKey: ['shipments', transportType],
    queryFn: () =>
      api.get<Shipment[]>('/api/shipments', transportType ? { transport_type: transportType } : undefined),
  })
}

export function useShipment(id: number | string | undefined) {
  return useQuery({
    queryKey: ['shipment', id],
    queryFn: () => api.get<Shipment>(`/api/shipments/${id}`),
    enabled: !!id,
  })
}

export function useSaveShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Shipment>) => api.post<SaveResponse>('/api/shipments', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['shipments'] })
      if (vars.id) qc.invalidateQueries({ queryKey: ['shipment', vars.id] })
    },
  })
}

export interface ShipmentHistory {
  created: {
    at: string
    user_id: number | null
    username: string | null
    full_name: string | null
  }
  entries: ShipmentChangeEntry[]
}

export function useShipmentHistory(id: number | string | undefined) {
  return useQuery({
    queryKey: ['shipment-history', id],
    queryFn: () => api.get<ShipmentHistory>(`/api/shipments/${id}/history`),
    enabled: !!id,
  })
}

export function useDeleteShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, expected_transport_type }: DeleteParams) =>
      api.delete<{ message: string }>(`/api/shipments/${id}`, expected_transport_type ? { expected_transport_type } : undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipments'] }),
  })
}

export interface BulkActionParams {
  ids: number[]
  action: 'delete' | 'set_status'
  status?: 'draft' | 'in_progress' | 'to_invoice' | 'closed'
}

export function useBulkShipmentAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: BulkActionParams) =>
      api.post<{ affected: number; message: string }>('/api/shipments/bulk-action', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipments'] }),
  })
}
