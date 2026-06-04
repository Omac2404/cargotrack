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

/**
 * Yeni sekmede PDF aç.
 */
export function openPdf(url: string) {
  window.open(url, '_blank')
}
