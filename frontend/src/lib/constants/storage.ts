/**
 * Depolama (storage) modülü için helper'lar ve veri yapıları.
 * PHP cargotrack.php:12042-12345'ten port edilmiştir.
 */

// === Stok hareket veri yapısı ===
export interface StockMovement {
  entry_date: string  // YYYY-MM-DD
  exit_date: string   // YYYY-MM-DD veya '' (henüz çıkmamış)
  in: number          // giriş kap sayısı
  out: number         // çıkış kap sayısı
  note: string
}

/** Eski format (date alanı) → yeni format (entry_date) dönüşümü (idempotent) */
export function migrateStockLog(arr: unknown): StockMovement[] {
  if (!Array.isArray(arr)) return []
  return arr.map((r) => {
    if (!r || typeof r !== 'object') return null
    const rec = r as Record<string, unknown>
    // Yeni format
    if (rec.entry_date !== undefined) {
      return {
        entry_date: String(rec.entry_date || ''),
        exit_date: String(rec.exit_date || ''),
        in: parseInt(String(rec.in || 0), 10) || 0,
        out: parseInt(String(rec.out || 0), 10) || 0,
        note: String(rec.note || ''),
      }
    }
    // Eski format
    return {
      entry_date: String(rec.date || ''),
      exit_date: '',
      in: parseInt(String(rec.in || 0), 10) || 0,
      out: parseInt(String(rec.out || 0), 10) || 0,
      note: String(rec.note || ''),
    }
  }).filter((r): r is StockMovement => r !== null)
}

/** İki tarih arasındaki gün farkı */
export function stockDaysBetween(entryDate: string, exitDate: string): number | null {
  if (!entryDate || !exitDate) return null
  const d1 = new Date(entryDate + 'T00:00:00')
  const d2 = new Date(exitDate + 'T00:00:00')
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null
  const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000)
  return diff >= 0 ? diff : null
}

/** Stok log özet hesabı */
export function stockLogSummary(log: StockMovement[]) {
  const todayISO = new Date().toISOString().slice(0, 10)
  let balance = 0
  let totalIn = 0
  let totalOut = 0
  let totalWaitingDays = 0 // tamamlanmış hareketler için kap × gün

  const enriched = log.map((r) => {
    balance += (r.in || 0) - (r.out || 0)
    totalIn += r.in || 0
    totalOut += r.out || 0
    let days: number | null = null
    let ongoing = false
    if (r.exit_date) {
      days = stockDaysBetween(r.entry_date, r.exit_date)
      if (days !== null) totalWaitingDays += days * Math.max(r.in || 0, r.out || 0)
    } else {
      days = stockDaysBetween(r.entry_date, todayISO)
      ongoing = true
    }
    return { ...r, days, ongoing, runningBalance: balance }
  })

  return { enriched, totalIn, totalOut, currentStock: balance, totalWaitingDays }
}

// === Storage cost hesabı (gün/hafta/ay tarife) ===
export interface StorageCostInput {
  entry_date?: string
  exit_date?: string
  kap_count: number             // depo_kap_sayisi
  rate_per_day?: number         // depo_gun_ucret
  rate_per_week?: number        // depo_hafta_ucret
  rate_per_month?: number       // depo_ay_ucret
  pricing_type?: 'gun' | 'hafta' | 'ay'  // depo_ucret_tipi
}

export interface StorageCostResult {
  days: number
  weeks: number
  months: number
  daily_total: number
  weekly_total: number
  monthly_total: number
  selected_total: number   // pricing_type'a göre seçili tarife
  selected_label: string
  formula: string          // "5 kap × €10/gün × 30 gün = €1.500,00"
}

export function calcStorageCost(input: StorageCostInput): StorageCostResult {
  let days = 0
  if (input.entry_date && input.exit_date) {
    const d = stockDaysBetween(input.entry_date, input.exit_date)
    days = d !== null ? d : 0
  }
  const weeks = Math.ceil(days / 7)
  const months = Math.ceil(days / 30)
  const kap = input.kap_count || 0
  const r = {
    day: input.rate_per_day || 0,
    week: input.rate_per_week || 0,
    month: input.rate_per_month || 0,
  }
  const dailyTotal = kap * r.day * days
  const weeklyTotal = kap * r.week * weeks
  const monthlyTotal = kap * r.month * months

  const pricing = input.pricing_type || 'gun'
  const selectedTotal = pricing === 'gun' ? dailyTotal : pricing === 'hafta' ? weeklyTotal : monthlyTotal
  const perRate = pricing === 'gun' ? r.day : pricing === 'hafta' ? r.week : r.month
  const perCount = pricing === 'gun' ? days : pricing === 'hafta' ? weeks : months
  const perLabel = pricing === 'gun' ? 'gün' : pricing === 'hafta' ? 'hafta' : 'ay'

  return {
    days,
    weeks,
    months,
    daily_total: dailyTotal,
    weekly_total: weeklyTotal,
    monthly_total: monthlyTotal,
    selected_total: selectedTotal,
    selected_label: perLabel,
    formula: kap > 0 && perRate > 0 && perCount > 0
      ? `${kap} kap × ${perRate.toFixed(2)}/${perLabel} × ${perCount} ${perLabel} = ${selectedTotal.toFixed(2)}`
      : '',
  }
}

// === Transit alert (geçici antrepo süre uyarısı) ===
// T tipi (entrepôt II) ve V tipi (geçici stoklama) depolar için son kullanma tarihi uyarısı
// PHP cargotrack.php:11239-11405'ten port (basitleştirilmiş)
export interface TransitAlertInput {
  warehouse_type?: string      // 'T', 'V' vb. (warehouses.type_code)
  entry_date?: string
  transit_expiry_date?: string // storage_data.transit_expiry_date
  transit_alert_dismissed?: boolean
}

export interface TransitAlert {
  active: boolean
  severity: 'info' | 'warning' | 'danger'
  days_remaining: number | null
  expiry_date: string | null
  message: string
}

const TRANSIT_LIMITS_DAYS: Record<string, number> = {
  T: 45,  // entrepôt type II - 45 gün
  V: 90,  // installation de stockage temporaire - 90 gün
}

export function computeTransitAlert(input: TransitAlertInput): TransitAlert {
  const inactive: TransitAlert = {
    active: false, severity: 'info', days_remaining: null, expiry_date: null, message: '',
  }

  if (input.transit_alert_dismissed) return inactive
  const type = (input.warehouse_type || '').toUpperCase()
  if (!type || !(type in TRANSIT_LIMITS_DAYS)) return inactive
  if (!input.entry_date) return inactive

  // Expiry hesap: kullanıcı manuel girmişse onu kullan, yoksa entry_date + limit
  let expiry: string
  if (input.transit_expiry_date) {
    expiry = input.transit_expiry_date
  } else {
    const d = new Date(input.entry_date + 'T00:00:00')
    if (isNaN(d.getTime())) return inactive
    d.setDate(d.getDate() + TRANSIT_LIMITS_DAYS[type])
    expiry = d.toISOString().slice(0, 10)
  }

  const today = new Date().toISOString().slice(0, 10)
  const remaining = stockDaysBetween(today, expiry)
  if (remaining === null) return inactive

  let severity: 'info' | 'warning' | 'danger' = 'info'
  if (remaining <= 0) severity = 'danger'
  else if (remaining <= 7) severity = 'danger'
  else if (remaining <= 15) severity = 'warning'

  const message = remaining <= 0
    ? `Transit süresi DOLMUŞ (${Math.abs(remaining)} gün geçti). Tip ${type} depoda azami ${TRANSIT_LIMITS_DAYS[type]} gün.`
    : `Transit süresi bitiyor — ${remaining} gün kaldı (${expiry}). Tip ${type} depoda azami ${TRANSIT_LIMITS_DAYS[type]} gün.`

  return {
    active: true,
    severity,
    days_remaining: remaining,
    expiry_date: expiry,
    message,
  }
}

// === Depo tipleri (CGI uyumlu) — referans için frontend de listede ===
export const WAREHOUSE_TYPE_DESC: Record<string, { label: string; description: string; transit_limit_days?: number }> = {
  R: { label: 'Entrepôt Public Type I', description: 'Kamuya açık depo, ortaklaşa kullanım' },
  S: { label: 'Entrepôt Public Type II (T)', description: 'Geçici antrepo - 45 gün limit', transit_limit_days: 45 },
  T: { label: 'Entrepôt Public Type II', description: 'Müşterek antrepo (kamu) - 45 gün', transit_limit_days: 45 },
  U: { label: 'Entrepôt Privé', description: 'Özel antrepo, tek kullanıcı' },
  V: { label: 'Geçici Stoklama (V)', description: 'Installation de stockage temporaire - 90 gün', transit_limit_days: 90 },
  Y: { label: 'Diğer Depo', description: 'Antrepo dışı depolama' },
  Z: { label: 'Serbest Bölge', description: 'Zone Franche - vergi muafiyetli' },
}
