import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getToken } from '@/lib/api'
import { shipmentKey } from '@/features/shipments/hooks'
import i18n from '@/i18n'

interface UploadResp {
  message: string
  filename: string
  download_url: string
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ shipmentId, docKey, file }: { shipmentId: number; docKey: string; file: File }) => {
      const fd = new FormData()
      fd.append('shipment_id', String(shipmentId))
      fd.append('doc_key', docKey)
      fd.append('file', file)
      return api.upload<UploadResp>('/api/documents/upload', fd)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: shipmentKey(vars.shipmentId) })
      qc.invalidateQueries({ queryKey: ['shipments'] })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ shipmentId, docKey }: { shipmentId: number; docKey: string }) =>
      api.delete<{ message: string }>(`/api/documents/${shipmentId}/${docKey}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: shipmentKey(vars.shipmentId) })
      qc.invalidateQueries({ queryKey: ['shipments'] })
    },
  })
}

/**
 * Korumalı download endpoint'i — JWT token query string ile geçemez, blob fetch + URL.createObjectURL
 */
export async function downloadDocument(shipmentId: number, docKey: string, filename: string) {
  const token = getToken()
  const resp = await fetch(`/api/documents/${shipmentId}/${docKey}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!resp.ok) {
    throw new Error(i18n.t('ui.doc_download_failed', { status: resp.status }))
  }
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Standart lojistik belge tipleri — UI slot listesi
 * label / description = i18n key (render'da t() ile çevrilir); raw=true ise label ham metindir (özel slot)
 */
export interface DocSlot {
  key: string
  label: string
  description?: string
  raw?: boolean
}

export const STANDARD_DOC_SLOTS: DocSlot[] = [
  { key: 'invoice', label: 'ui.doc_slot_invoice', description: 'ui.doc_slot_invoice_desc' },
  { key: 'packing_list', label: 'transport.documents.packing_list', description: 'ui.doc_slot_packing_list_desc' },
  { key: 'bl', label: 'ui.doc_slot_bl', description: 'ui.doc_slot_bl_desc' },
  { key: 'awb', label: 'ui.doc_slot_awb', description: 'ui.doc_slot_awb_desc' },
  { key: 'cmr', label: 'ui.doc_slot_cmr', description: 'ui.doc_slot_cmr_desc' },
  { key: 'atr', label: 'ui.doc_slot_atr', description: 'ui.doc_slot_atr_desc' },
  { key: 'eur1', label: 'ui.doc_slot_eur1', description: 'ui.doc_slot_eur1_desc' },
  { key: 'certificate_origin', label: 'transport.documents.cert_origin', description: 'ui.doc_slot_cert_origin_desc' },
  { key: 'customs_declaration', label: 'transport.documents.customs_dec', description: '' },
  { key: 'insurance_policy', label: 'transport.documents.insurance', description: '' },
  { key: 'weight_certificate', label: 'ui.doc_slot_weight_cert', description: '' },
  { key: 'fumigation', label: 'ui.doc_slot_fumigation', description: '' },
]
