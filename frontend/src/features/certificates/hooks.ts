import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getToken } from '@/lib/api'
import type { Certificate, CertificateType } from '@/types/api'

export function useCertificates(filters: { cert_type?: CertificateType | 'all'; q?: string } = {}) {
  const params: Record<string, string> = {}
  if (filters.cert_type && filters.cert_type !== 'all') params.cert_type = filters.cert_type
  if (filters.q) params.q = filters.q
  return useQuery({
    queryKey: ['certificates', params],
    queryFn: () => api.get<Certificate[]>('/api/certificates', params),
  })
}

export function useCertificate(id?: string | number) {
  return useQuery({
    queryKey: ['certificate', String(id)],
    queryFn: () => api.get<Certificate>(`/api/certificates/${id}`),
    enabled: !!id,
  })
}

export function useSaveCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Certificate>) =>
      api.post<{ id: number; message: string }>('/api/certificates', payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['certificates'] })
      if (vars.id) qc.invalidateQueries({ queryKey: ['certificate', String(vars.id)] })
    },
  })
}

/** Aynı gönderici/alıcı ile yeni belge — numara ve tarihler boş gelir */
export function useCopyCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post<{ id: number; message: string }>(`/api/certificates/${id}/copy`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates'] }),
  })
}

export function useDeleteCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ id: number }>(`/api/certificates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates'] }),
  })
}

/**
 * Yazdırma kalibrasyonu — yazıcıya göre değişir, tarayıcıda saklanır.
 *
 * dx / dy : baskının tamamını milimetre kaydırır.
 * mv / mh : kalibrasyon sayfasındaki işaretler arasında CETVELLE ÖLÇÜLEN
 *           mesafe (olması gereken 250 mm dikey, 170 mm yatay). Yazıcılar
 *           sayfayı çoğu zaman biraz küçültür; bu yüzden kayma sayfanın
 *           altına inildikçe büyür. Ölçülen değerden ölçek hesaplanır.
 */
export interface PrintOffset { dx: number; dy: number; mv: number; mh: number }
const OFFSET_KEY = 'ct_cert_offset'
export const CAL_V = 250
export const CAL_H = 170

const num = (v: unknown, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n !== 0 ? n : fallback
}

export function loadPrintOffset(): PrintOffset {
  try {
    const raw = localStorage.getItem(OFFSET_KEY)
    if (raw) {
      const v = JSON.parse(raw)
      return {
        dx: Number(v.dx) || 0,
        dy: Number(v.dy) || 0,
        mv: num(v.mv, CAL_V),
        mh: num(v.mh, CAL_H),
      }
    }
  } catch { /* tarayıcı depolaması kapalı olabilir */ }
  return { dx: 0, dy: 0, mv: CAL_V, mh: CAL_H }
}

export function savePrintOffset(offset: PrintOffset) {
  try { localStorage.setItem(OFFSET_KEY, JSON.stringify(offset)) } catch { /* yoksay */ }
}

/** Ölçülen mesafelerden baskı ölçeği (1 = birebir) */
export function printScale(offset: PrintOffset) {
  const clamp = (v: number) => (Number.isFinite(v) && v >= 0.9 && v <= 1.1 ? v : 1)
  return { sx: clamp(CAL_H / (offset.mh || CAL_H)), sy: clamp(CAL_V / (offset.mv || CAL_V)) }
}

export function getCertificateUrl(id: number, offset: PrintOffset, grid = false) {
  const token = getToken()
  const { sx, sy } = printScale(offset)
  const qs = new URLSearchParams()
  if (offset.dx) qs.set('dx', String(offset.dx))
  if (offset.dy) qs.set('dy', String(offset.dy))
  if (sx !== 1) qs.set('sx', sx.toFixed(5))
  if (sy !== 1) qs.set('sy', sy.toFixed(5))
  if (grid) qs.set('grid', '1')
  if (token) qs.set('token', token)
  const q = qs.toString()
  return `/api/pdf/certificate/${id}${q ? `?${q}` : ''}`
}
