import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Shipment } from '@/types/api'

export function useStorageOrders(filters: { status?: 'active' | 'closed' | 'all'; warehouse_id?: number } = {}) {
  return useQuery({
    queryKey: ['storage-orders', filters],
    queryFn: () => api.get<Shipment[]>('/api/storage-orders', filters as Record<string, string | number | undefined>),
  })
}
