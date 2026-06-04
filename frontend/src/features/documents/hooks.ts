import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getToken } from '@/lib/api'

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
      qc.invalidateQueries({ queryKey: ['shipment', vars.shipmentId] })
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
      qc.invalidateQueries({ queryKey: ['shipment', vars.shipmentId] })
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
    throw new Error('Dosya indirilemedi: HTTP ' + resp.status)
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
 */
export interface DocSlot {
  key: string
  label: string
  description?: string
}

export const STANDARD_DOC_SLOTS: DocSlot[] = [
  { key: 'invoice', label: 'Fatura', description: 'Ticari fatura' },
  { key: 'packing_list', label: 'Çeki Listesi', description: 'Packing list' },
  { key: 'bl', label: 'BL', description: 'Bill of Lading (denizyolu)' },
  { key: 'awb', label: 'AWB', description: 'Air Waybill (havayolu)' },
  { key: 'cmr', label: 'CMR', description: 'CMR konşimentosu (karayolu)' },
  { key: 'atr', label: 'ATR', description: 'A.TR Dolaşım Belgesi' },
  { key: 'eur1', label: 'EUR.1', description: 'EUR.1 Dolaşım Belgesi' },
  { key: 'certificate_origin', label: 'Menşe Şahadetnamesi', description: 'Certificate of Origin' },
  { key: 'customs_declaration', label: 'Gümrük Beyannamesi', description: '' },
  { key: 'insurance_policy', label: 'Sigorta Poliçesi', description: '' },
  { key: 'weight_certificate', label: 'Ağırlık Belgesi', description: '' },
  { key: 'fumigation', label: 'Fümigasyon', description: '' },
]
