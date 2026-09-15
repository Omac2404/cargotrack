/** Sözleşmeli depoculuk (entreposage) tipleri — backend src/routes/warehousing.js ile birebir */

export type StorageBilling =
  | 'pallet_day'
  | 'pallet_month_avg'
  | 'pallet_month_peak'
  | 'pallet_month_started'
  | 'fixed_month'

export type AccountStatus = 'active' | 'suspended' | 'closed'
export type MovementDirection = 'in' | 'out' | 'adjust'
export type ServiceType = 'order_prep' | 'order_line' | 'labeling' | 'filming' | 'palletizing' | 'unloading' | 'custom'
export type StatementStatus = 'draft' | 'issued' | 'paid'

export interface ExtraService {
  label: string
  unit: string
  price: number | string
}

export interface WhAccount {
  id: number
  account_code: string | null
  client_name: string
  warehouse: string
  contact_person: string
  contact_email: string
  contact_phone: string
  start_date: string | null
  end_date: string | null
  status: AccountStatus
  currency_code: string
  vat_rate: number | string
  storage_billing: StorageBilling
  storage_rate: number | string
  fixed_monthly_fee: number | string
  min_monthly_fee: number | string
  in_rate: number | string
  out_rate: number | string
  order_prep_rate: number | string
  order_line_rate: number | string
  label_rate: number | string
  filming_rate: number | string
  palletizing_rate: number | string
  unloading_rate: number | string
  extra_services: ExtraService[]
  payment_terms: string
  notes: string
  current_stock?: number
  movement_count?: number
}

export interface WhAccountOverview extends WhAccount {
  current_stock: number
  last_movement_date: string | null
  period_in: number
  period_out: number
  period_pallet_days: number
  period_total_ht: number
  period_partial: boolean
  statement: { id: number; status: StatementStatus; statement_no: string; total_ttc: number } | null
}

export interface WhOverview {
  period: string
  accounts: WhAccountOverview[]
  totals: { stock: number; total_ht: number; in: number; out: number }
}

export interface WhMovement {
  id: number
  account_id: number
  movement_date: string
  direction: MovementDirection
  pallets: number
  packages: number | null
  weight_kg: number | string | null
  reference: string
  product: string
  notes: string
  balance_after: number
}

export interface WhService {
  id: number
  account_id: number
  service_date: string
  service_type: ServiceType
  label: string
  unit: string
  quantity: number
  unit_price: number
  amount: number
  reference: string
  notes: string
}

export interface StatementLine {
  code: string
  label: string
  quantity: number
  unit: string
  unit_price: number
  amount: number
  entries?: number
}

export interface StatementRecord {
  id: number
  account_id: number
  period: string
  statement_no: string
  status: StatementStatus
  total_ht: number | string
  total_vat: number | string
  total_ttc: number | string
  currency_code: string
  invoice_no: string
  issued_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface WhStatement {
  period: string
  period_start: string
  period_end: string
  days_in_month: number
  days_counted: number
  partial: boolean
  calculated_until: string | null
  currency: string
  vat_rate: number
  stock: {
    opening: number
    in: number
    out: number
    adjust: number
    closing: number
    peak: number
    pallet_days: number
    average: number
    packages_in: number
    packages_out: number
  }
  storage_billing: StorageBilling
  lines: StatementLine[]
  total_ht: number
  total_vat: number
  total_ttc: number
  daily: Array<{ date: string; in: number; out: number; adjust: number; stock: number; counted: boolean }>
  movements: Array<{ id: number; date: string; direction: MovementDirection; pallets: number; packages: number | null; weight_kg: number | null; reference: string; product: string; notes: string }>
  services: Array<{ id: number; date: string; service_type: ServiceType; label: string; unit: string; quantity: number; unit_price: number; amount: number; reference: string }>
  source: 'live' | 'snapshot'
  statement_no: string
  record: StatementRecord | null
  live_total_ht: number
}

/** Tarife kolonu ↔ hizmet türü (backend SERVICE_TYPES ile aynı) */
export const SERVICE_RATE_COL: Record<Exclude<ServiceType, 'custom'>, keyof WhAccount> = {
  order_prep: 'order_prep_rate',
  order_line: 'order_line_rate',
  labeling: 'label_rate',
  filming: 'filming_rate',
  palletizing: 'palletizing_rate',
  unloading: 'unloading_rate',
}

export const SERVICE_TYPES: ServiceType[] = ['order_prep', 'order_line', 'labeling', 'filming', 'palletizing', 'unloading', 'custom']
export const STORAGE_BILLINGS: StorageBilling[] = ['pallet_day', 'pallet_month_avg', 'pallet_month_peak', 'pallet_month_started', 'fixed_month']

export const currentPeriod = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const periodRange = (period: string) => {
  const [y, m] = period.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, '0')}` }
}
