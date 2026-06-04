import * as XLSX from 'xlsx'

/**
 * Bir veri dizisini Excel (.xlsx) olarak indir.
 *
 * @param data Satır objeler dizisi (her obje bir satır)
 * @param columns Sütun tanımları — her satırdan hangi alanı hangi başlıkla alacağız
 * @param filename Dosya adı (uzantısız; "_YYYY-MM-DD.xlsx" otomatik eklenir)
 * @param sheetName Sheet adı (default: "Veriler")
 *
 * @example
 * exportToExcel(
 *   shipments,
 *   [
 *     { header: 'Sevkiyat No', key: 'shipment_no' },
 *     { header: 'Müşteri', key: 'client_billing' },
 *     { header: 'Tarih', key: 'created_date', format: (v) => formatDate(v) },
 *   ],
 *   'sevkiyatlar'
 * )
 */
export interface ExportColumn<T = unknown> {
  /** Excel'de görünecek başlık */
  header: string
  /** Veri objesinin hangi alanı */
  key: keyof T | string
  /** İsteğe bağlı formatter — ham değeri stringle (formatDate, formatMoney vs.) */
  format?: (value: unknown, row: T) => string | number | boolean | null
  /** Sütun genişliği (karakter) — default otomatik */
  width?: number
}

export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName = 'Veriler',
): void {
  // Satırları map'le
  const rows = data.map((row) => {
    const out: Record<string, string | number | boolean | null> = {}
    for (const col of columns) {
      const raw = (row as unknown as Record<string, unknown>)[col.key as string]
      const value = col.format ? col.format(raw, row) : (raw as string | number | boolean | null)
      out[col.header] = value ?? ''
    }
    return out
  })

  // Worksheet oluştur
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: columns.map((c) => c.header),
  })

  // Sütun genişlikleri
  ws['!cols'] = columns.map((col) => {
    if (col.width) return { wch: col.width }
    // Otomatik: başlık + en uzun değerin uzunluğu (max 50)
    const maxLen = Math.max(
      col.header.length,
      ...rows.map((r) => String(r[col.header] ?? '').length)
    )
    return { wch: Math.min(50, Math.max(8, maxLen + 2)) }
  })

  // Workbook oluştur ve indir
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const today = new Date()
  const datePart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  XLSX.writeFile(wb, `${filename}_${datePart}.xlsx`)
}

/** Sayı/para birimi/tarih formatlayıcılar (Excel için ham değeri tercih edilir; bu helper'lar görsel format için) */
export const exportFormatters = {
  date: (v: unknown): string => {
    if (!v) return ''
    const d = v instanceof Date ? v : new Date(String(v))
    if (isNaN(d.getTime())) return String(v)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  },
  dateTime: (v: unknown): string => {
    if (!v) return ''
    const d = v instanceof Date ? v : new Date(String(v))
    if (isNaN(d.getTime())) return String(v)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },
  number: (v: unknown, decimals = 2): number | string => {
    if (v === null || v === undefined || v === '') return ''
    const n = Number(v)
    return Number.isFinite(n) ? Number(n.toFixed(decimals)) : String(v)
  },
  yesNo: (v: unknown): string => (Number(v) === 1 || v === true ? 'Evet' : 'Hayır'),
}
