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
  selected_label: string   // i18n key: ui.stg_unit_day | ui.stg_unit_week | ui.stg_unit_month
  /** Formül parametreleri — render: t('ui.stg_cost_formula', { ...formula_params, unit: t(formula_params.unit) }); hesaplanamıyorsa null */
  formula_params: { kap: number; rate: string; unit: string; count: number; total: string } | null
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
  const perLabel = pricing === 'gun' ? 'ui.stg_unit_day' : pricing === 'hafta' ? 'ui.stg_unit_week' : 'ui.stg_unit_month'

  return {
    days,
    weeks,
    months,
    daily_total: dailyTotal,
    weekly_total: weeklyTotal,
    monthly_total: monthlyTotal,
    selected_total: selectedTotal,
    selected_label: perLabel,
    formula_params: kap > 0 && perRate > 0 && perCount > 0
      ? { kap, rate: perRate.toFixed(2), unit: perLabel, count: perCount, total: selectedTotal.toFixed(2) }
      : null,
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
  /** i18n key (ui.stg_transit_expired | ui.stg_transit_expiring); render: t(message_key, message_params) */
  message_key: string
  message_params: Record<string, string | number>
}

const TRANSIT_LIMITS_DAYS: Record<string, number> = {
  T: 45,  // entrepôt type II - 45 gün
  V: 90,  // installation de stockage temporaire - 90 gün
}

export function computeTransitAlert(input: TransitAlertInput): TransitAlert {
  const inactive: TransitAlert = {
    active: false, severity: 'info', days_remaining: null, expiry_date: null, message_key: '', message_params: {},
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

  const message_key = remaining <= 0 ? 'ui.stg_transit_expired' : 'ui.stg_transit_expiring'
  const message_params = {
    overdue: Math.abs(remaining),
    remaining,
    expiry,
    type,
    limit: TRANSIT_LIMITS_DAYS[type],
  }

  return {
    active: true,
    severity,
    days_remaining: remaining,
    expiry_date: expiry,
    message_key,
    message_params,
  }
}

// === Depo tipleri (CGI uyumlu) — referans için frontend de listede ===
// label / description: i18n key'leri — render sırasında t() ile çevrilir
export const WAREHOUSE_TYPE_DESC: Record<string, { label: string; description: string; transit_limit_days?: number }> = {
  R: { label: 'ui.stg_wh_type_r_label', description: 'ui.stg_wh_type_r_desc' },
  S: { label: 'ui.stg_wh_type_s_label', description: 'ui.stg_wh_type_s_desc', transit_limit_days: 45 },
  T: { label: 'ui.stg_wh_type_t_label', description: 'ui.stg_wh_type_t_desc', transit_limit_days: 45 },
  U: { label: 'ui.stg_wh_type_u_label', description: 'ui.stg_wh_type_u_desc' },
  V: { label: 'ui.stg_wh_type_v_label', description: 'ui.stg_wh_type_v_desc', transit_limit_days: 90 },
  Y: { label: 'ui.stg_wh_type_y_label', description: 'ui.stg_wh_type_y_desc' },
  Z: { label: 'ui.stg_wh_type_z_label', description: 'ui.stg_wh_type_z_desc' },
}
