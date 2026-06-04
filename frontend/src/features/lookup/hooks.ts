import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SidebarAlerts, VehicleSummary, WarehouseSummary } from '@/types/api'

export function useVehicleSummary() {
  return useQuery({
    queryKey: ['vehicle-summary'],
    queryFn: () => api.get<VehicleSummary[]>('/api/lookup/vehicle-summary'),
    staleTime: 60_000,
  })
}

export function useWarehouseSummary() {
  return useQuery({
    queryKey: ['warehouse-summary'],
    queryFn: () => api.get<WarehouseSummary[]>('/api/lookup/warehouse-summary'),
    staleTime: 60_000,
  })
}

export function useSidebarAlerts() {
  return useQuery({
    queryKey: ['sidebar-alerts'],
    queryFn: () => api.get<SidebarAlerts>('/api/lookup/sidebar-alerts'),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // 5 dk
  })
}
