import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Vehicle, VehicleTransport } from '@/types/api'

interface SaveResp {
  id: number
  vehicle_code?: string
  message: string
}

export function useVehicles(transportType?: VehicleTransport) {
  return useQuery({
    queryKey: ['vehicles', transportType || 'all'],
    queryFn: () =>
      api.get<Vehicle[]>('/api/vehicles', transportType ? { transport_type: transportType } : undefined),
  })
}

export function useVehicle(id: number | string | undefined) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => api.get<Vehicle>(`/api/vehicles/${id}`),
    enabled: !!id,
  })
}

export interface VehicleLoadAssignment {
  id: number
  shipment_id: number
  assigned_quantity: number
  assigned_weight: number
  loading_date: string | null
  notes: string | null
  created_at: string
  shipment_no: string | null
  client_billing: string | null
  shipment_transport: string | null
  departure_country: string | null
  arrival_country: string | null
  shipment_status: string | null
  shipment_total_quantity: number | null
  shipment_total_weight: number | null
}

export interface VehicleLoadSummary {
  assignment_count: number
  total_quantity: number
  total_weight: number
  load_percent: number
  remaining_capacity_kg: number
}

export interface VehicleLoad {
  vehicle: {
    id: number
    plate: string
    capacity_kg: number
    volume_m3: number
  }
  summary: VehicleLoadSummary
  assignments: VehicleLoadAssignment[]
}

export function useVehicleLoad(id: number | string | undefined) {
  return useQuery({
    queryKey: ['vehicle-load', id],
    queryFn: () => api.get<VehicleLoad>(`/api/vehicles/${id}/load`),
    enabled: !!id,
  })
}

export function useSaveVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Vehicle> & { vehicle_id?: number }) =>
      api.post<SaveResp>('/api/vehicles', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

export function useDeleteVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/api/vehicles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

// Ekipman tipleri mode'a göre değişir (backend ile birebir uyumlu)
export const EQUIPMENT_BY_MODE: Record<VehicleTransport, Array<{ value: string; label: string }>> = {
  road: [
    { value: 'tilt', label: 'Tenteli (Tilt)' },
    { value: 'frigorifik', label: 'Frigorifik' },
    { value: 'open', label: 'Açık' },
    { value: 'container', label: 'Konteyner' },
    { value: 'tanker', label: 'Tanker' },
    { value: 'other', label: 'Diğer' },
  ],
  sea: [
    { value: 'container_20', label: 'Konteyner 20\'' },
    { value: 'container_40', label: 'Konteyner 40\'' },
    { value: 'container_40hc', label: 'Konteyner 40\' HC' },
    { value: 'container_reefer', label: 'Reefer Konteyner' },
    { value: 'bulk', label: 'Dökme' },
    { value: 'breakbulk', label: 'Parça' },
    { value: 'tanker', label: 'Tanker' },
    { value: 'roro', label: 'RoRo' },
    { value: 'other', label: 'Diğer' },
  ],
  air: [
    { value: 'passenger', label: 'Yolcu' },
    { value: 'freighter', label: 'Kargo' },
    { value: 'combi', label: 'Combi' },
    { value: 'express', label: 'Express' },
    { value: 'other', label: 'Diğer' },
  ],
}

export const VEHICLE_STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'secondary' | 'warning' }> = {
  active: { label: 'Aktif', variant: 'success' },
  inactive: { label: 'Pasif', variant: 'secondary' },
  maintenance: { label: 'Bakım', variant: 'warning' },
}
