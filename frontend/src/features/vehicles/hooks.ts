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

// Ekipman tipleri mode'a göre değişir — label i18n key (t() ile çevrilir)
export const EQUIPMENT_BY_MODE: Record<VehicleTransport, Array<{ value: string; label: string }>> = {
  road: [
    { value: 'tilt',       label: 'transport.equipment.tilt' },
    { value: 'frigorifik', label: 'transport.equipment.frigorifik' },
    { value: 'open',       label: 'transport.equipment.open' },
    { value: 'container',  label: 'transport.equipment.container' },
    { value: 'tanker',     label: 'transport.equipment.tanker' },
    { value: 'other',      label: 'transport.equipment.other' },
  ],
  sea: [
    { value: 'container_20',     label: 'transport.equipment.container_20' },
    { value: 'container_40',     label: 'transport.equipment.container_40' },
    { value: 'container_40hc',   label: 'transport.equipment.container_40hc' },
    { value: 'container_reefer', label: 'transport.equipment.container_reefer' },
    { value: 'bulk',             label: 'transport.equipment.bulk' },
    { value: 'breakbulk',        label: 'transport.equipment.breakbulk' },
    { value: 'tanker',           label: 'transport.equipment.tanker' },
    { value: 'roro',             label: 'transport.equipment.roro' },
    { value: 'other',            label: 'transport.equipment.other' },
  ],
  air: [
    { value: 'passenger', label: 'transport.equipment.passenger' },
    { value: 'freighter', label: 'transport.equipment.freighter' },
    { value: 'combi',     label: 'transport.equipment.combi' },
    { value: 'express',   label: 'transport.equipment.express' },
    { value: 'other',     label: 'transport.equipment.other' },
  ],
}

// label i18n key — UI'de t(VEHICLE_STATUS_LABELS[s].label) ile çevrilir
export const VEHICLE_STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'secondary' | 'warning' }> = {
  active:      { label: 'vehicle.status.active',      variant: 'success' },
  inactive:    { label: 'vehicle.status.inactive',    variant: 'secondary' },
  maintenance: { label: 'vehicle.status.maintenance', variant: 'warning' },
}
