import { getToken } from '@/lib/api'

/**
 * PDF endpoint'leri için URL üretir.
 * Token query parametresi olarak eklenir (browser <a> ile direkt aç).
 */
function makePdfUrl(path: string): string {
  const token = getToken()
  const sep = path.includes('?') ? '&' : '?'
  return token ? `${path}${sep}token=${encodeURIComponent(token)}` : path
}

export function getFileCoverUrl(shipmentId: number) {
  return makePdfUrl(`/api/pdf/file-cover/${shipmentId}`)
}

export function getProformaUrl(shipmentId: number) {
  return makePdfUrl(`/api/pdf/proforma/${shipmentId}`)
}

export function getStorageReportUrl(shipmentId: number) {
  return makePdfUrl(`/api/pdf/storage-report/${shipmentId}`)
}

export function getBarcodesUrl(shipmentId: number) {
  return makePdfUrl(`/api/pdf/barcodes/${shipmentId}`)
}

/** Araç yükleme listesi (feuille de chargement) — araçtaki tüm aktif yükler */
export function getVehicleManifestUrl(vehicleId: number) {
  return makePdfUrl(`/api/pdf/vehicle-manifest/${vehicleId}`)
}

/**
 * Yeni sekmede PDF aç.
 */
export function openPdf(url: string) {
  window.open(url, '_blank')
}

// ============================================================
// Dosya kapağı — düzenlenebilir alanlar
// ============================================================

export interface CoverFieldDef {
  key: string
  label: string
}

export interface CoverFieldsResponse {
  shipment_no: string
  fields: { left: CoverFieldDef[]; right: CoverFieldDef[] }
  /** Otomatik değerler + kullanıcının kaydettiği düzenlemeler */
  values: Record<string, string>
  /** Saf otomatik değerler — "otomatik değerlere dön" için */
  auto: Record<string, string>
}

/** Kapak alanlarının otomatik doldurulmuş hâlini getirir (düzenleme formu için). */
export async function fetchCoverFields(shipmentId: number): Promise<CoverFieldsResponse> {
  const { api } = await import('@/lib/api')
  return api.get<CoverFieldsResponse>(`/api/pdf/file-cover/${shipmentId}/fields`)
}

/** Kapak düzenlemelerini PDF üretmeden kaydeder. */
export async function saveCoverValues(shipmentId: number, values: Record<string, string>): Promise<number> {
  const { api } = await import('@/lib/api')
  const r = await api.post<{ saved: number }>(`/api/pdf/file-cover/${shipmentId}/save`, values)
  return r.saved
}

/**
 * Düzenlenmiş alanlarla kapağı üretir ve yeni sekmede açar.
 *
 * POST gövdesi gerektiği için <a href> ile açılamıyor: PDF blob olarak alınır,
 * object URL'e çevrilip yeni sekmede gösterilir.
 */
export async function openFileCoverWithValues(
  shipmentId: number,
  values: Record<string, string>
): Promise<void> {
  const token = getToken()
  const resp = await fetch(`/api/pdf/file-cover/${shipmentId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(values),
  })
  if (!resp.ok) {
    let message = `PDF üretilemedi (HTTP ${resp.status})`
    try {
      const j = await resp.json()
      message = j?.data?.message || message
    } catch { /* gövde PDF değilse yoksay */ }
    throw new Error(message)
  }
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  // Yazdırma diyaloğu blob'u yeniden okuyabiliyor; erken revoke edilirse
  // 60 sn sonra yazdırmaya çalışan kullanıcı boş sayfa alıyordu.
  setTimeout(() => URL.revokeObjectURL(url), 30 * 60_000)
}
