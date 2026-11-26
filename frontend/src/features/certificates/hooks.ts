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
 * Yazdırma kalibrasyonu — yazıcıya göre değişir, SUNUCUDA herkes için ortak
 * saklanır (eskiden tarayıcıdaydı; önbellek temizlenince ya da başka
 * bilgisayardan basılınca sıfırlanıp çıktı yeniden kayıyordu).
 *
 * dx / dy : baskının tamamını milimetre kaydırır.
 * mv / mh : kalibrasyon sayfasındaki işaretler arasında CETVELLE ÖLÇÜLEN
 *           mesafe (olması gereken 250 mm dikey, 170 mm yatay). Yazıcılar
 *           sayfayı çoğu zaman biraz küçültür; bu yüzden kayma sayfanın
 *           altına inildikçe büyür. Ölçülen değerden ölçek hesaplanır.
 */
export interface PrintOffset { dx: number; dy: number; mv: number; mh: number }
export const CAL_V = 250
export const CAL_H = 170
const CAL_URL = '/api/certificates/print-calibration'

export function usePrintCalibration() {
  return useQuery({
    queryKey: ['cert-print-calibration'],
    queryFn: () => api.get<PrintOffset & { defaults: PrintOffset }>(CAL_URL),
    staleTime: 0,
  })
}

export function useSavePrintCalibration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (offset: PrintOffset) => api.put<PrintOffset>(CAL_URL, offset),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cert-print-calibration'] }),
  })
}

/** Ölçülen mesafelerden baskı ölçeği (1 = birebir) */
export function printScale(offset: PrintOffset) {
  const clamp = (v: number) => (Number.isFinite(v) && v >= 0.9 && v <= 1.1 ? v : 1)
  return { sx: clamp(CAL_H / (offset.mh || CAL_H)), sy: clamp(CAL_V / (offset.mv || CAL_V)) }
}

/**
 * offset verilirse ekrandaki değerler aynen basılır; verilmezse (liste
 * sayfasından yazdırma) sunucu kayıtlı ortak kalibrasyonu uygular.
 */
export function getCertificateUrl(id: number, offset?: PrintOffset, grid = false) {
  const token = getToken()
  const qs = new URLSearchParams()
  if (offset) {
    const { sx, sy } = printScale(offset)
    qs.set('dx', String(offset.dx || 0))
    qs.set('dy', String(offset.dy || 0))
    qs.set('sx', sx.toFixed(5))
    qs.set('sy', sy.toFixed(5))
  }
  if (grid) qs.set('grid', '1')
  if (token) qs.set('token', token)
  const q = qs.toString()
  return `/api/pdf/certificate/${id}${q ? `?${q}` : ''}`
}
