import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Partner, PartnerType, Shipment } from '@/types/api'

interface SaveResp {
  id: number
  partner_code?: string
  message: string
}

export function usePartners(type?: PartnerType | '') {
  return useQuery({
    queryKey: ['partners', type || 'all'],
    queryFn: () => api.get<Partner[]>('/api/partners', type ? { type } : undefined),
  })
}

export function useSavePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Partner> & { partner_id?: number }) =>
      api.post<SaveResp>('/api/partners', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners'] }),
  })
}

export function useDeletePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/api/partners/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners'] }),
  })
}

export function usePartner(id: number | string | undefined) {
  return useQuery({
    queryKey: ['partner', id],
    queryFn: () => api.get<Partner>(`/api/partners/${id}`),
    enabled: !!id,
  })
}

export interface PartnerShipmentsSummary {
  count: number
  total_sale: number
  total_purchase: number
  total_profit: number
  margin: number
  total_invoiced: number
  paid_count: number
  unpaid_count: number
  by_mode: Record<string, number>
  by_status: Record<string, number>
}

export interface PartnerShipmentsResponse {
  partner: Partner
  shipments: Shipment[]
  summary: PartnerShipmentsSummary
}

export function usePartnerShipments(id: number | string | undefined) {
  return useQuery({
    queryKey: ['partner-shipments', id],
    queryFn: () => api.get<PartnerShipmentsResponse>(`/api/partners/${id}/shipments`),
    enabled: !!id,
  })
}

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  customer: 'Müşteri',
  sender: 'Gönderici',
  receiver: 'Alıcı',
  agent: 'Acente',
}
