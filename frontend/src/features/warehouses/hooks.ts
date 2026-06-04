import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Warehouse } from '@/types/api'

interface SaveResp {
  id: number
  warehouse_code?: string
  message: string
}

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get<Warehouse[]>('/api/warehouses'),
  })
}

export function useSaveWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Warehouse> & { warehouse_id?: number }) =>
      api.post<SaveResp>('/api/warehouses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

export function useDeleteWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/api/warehouses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

// CGI uyumlu depo tipleri
export const WAREHOUSE_TYPES: Record<string, { code: string; label: string; description: string }> = {
  R: { code: 'R', label: 'Tip I', description: 'Entrepôt douanier type I (kamu)' },
  S: { code: 'S', label: 'Tip II', description: 'Entrepôt douanier type II' },
  T: { code: 'T', label: 'Tip III', description: 'Entrepôt douanier type III' },
  U: { code: 'U', label: 'Özel', description: 'Entrepôt privé (özel)' },
  V: { code: 'V', label: 'Geçici', description: 'Installation de stockage temporaire' },
  Y: { code: 'Y', label: 'Diğer', description: 'Entrepôt autre que douanier' },
  Z: { code: 'Z', label: 'Serbest', description: 'Zone franche (serbest bölge)' },
}
