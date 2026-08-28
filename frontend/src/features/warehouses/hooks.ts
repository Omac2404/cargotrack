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

// CGI uyumlu depo tipleri — label / description = i18n key (render'da t() ile çevrilir)
export const WAREHOUSE_TYPES: Record<string, { code: string; label: string; description: string }> = {
  R: { code: 'R', label: 'ui.wh_type_r_label', description: 'ui.wh_type_r_desc' },
  S: { code: 'S', label: 'ui.wh_type_s_label', description: 'ui.wh_type_s_desc' },
  T: { code: 'T', label: 'ui.wh_type_t_label', description: 'ui.wh_type_t_desc' },
  U: { code: 'U', label: 'ui.wh_type_u_label', description: 'ui.wh_type_u_desc' },
  V: { code: 'V', label: 'ui.wh_type_v_label', description: 'ui.wh_type_v_desc' },
  Y: { code: 'Y', label: 'ui.wh_type_y_label', description: 'ui.wh_type_y_desc' },
  Z: { code: 'Z', label: 'ui.wh_type_z_label', description: 'ui.wh_type_z_desc' },
}
