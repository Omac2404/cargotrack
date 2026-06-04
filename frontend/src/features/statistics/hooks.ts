import { useQuery } from '@tanstack/react-query'
import { api, getToken } from '@/lib/api'

export interface StatsFilters {
  date_from?: string
  date_to?: string
  transport_type?: string
  customer_id?: number
  currency?: string
}

export interface StatsOverview {
  total_count: number
  open_count: number
  closed_count: number
  draft_count: number
  toinvoice_count: number
  total_sales: number
  total_cost: number
  total_profit: number
  avg_margin: number
  total_weight: number
  total_quantity: number
  missing_doc_shipments: number
  unpaid_total: number
  unpaid_count: number
  overdue_count: number
  new_customers: number
}

export interface StatsComparison {
  prev_total_count: number
  prev_total_sales: number
  prev_total_profit: number
  prev_avg_margin: number
}

export interface MonthlyPoint {
  month: string
  revenue: number | string
  cost: number | string
  profit: number | string
  count: number
}

export interface CurrencyBreakdown {
  currency_code: string
  revenue: number | string
  count: number
}

export interface UnpaidInvoice {
  id: number
  shipment_no: string
  client_billing: string
  sale_price: number | string
  currency_code: string
  invoice_date?: string
  invoice_no?: string
  status: string
  days_old?: number
  overdue?: boolean
}

export interface TopProfitItem {
  shipment_no: string
  client_billing: string
  sale_price: number | string
  purchase_price: number | string
  currency_code: string
  transport_type: string
  profit: number | string
  margin: number | string
}

export interface ModeBreakdown {
  transport_type: string
  count: number
  revenue: number | string
  profit: number | string
  avg_margin: number | string | null
}

export interface VehicleLoad {
  transport_type: string
  vehicle_count: number
  assignment_count: number
  total_load: number | string | null
  total_capacity: number | string | null
}

export interface CustomerStat {
  client_billing: string
  shipment_count: number
  revenue: number | string
  profit: number | string
  avg_margin?: number | string | null
}

export interface GeoStat {
  country: string
  count: number
  revenue: number | string
}

export interface InactiveCustomer {
  client_billing: string
  last_activity: string
  total_shipments: number
  lifetime_revenue: number | string
}

export interface RouteStat {
  route: string
  departure_country: string
  arrival_country: string
  count: number
  revenue: number | string
  avg_margin: number | string | null
}

export interface VehiclePerf {
  id: number
  vehicle_code: string
  plate: string
  transport_type: string
  driver_name?: string
  assignment_count: number
  total_quantity: number | string | null
  total_weight: number | string | null
}

export interface WarehouseLoad {
  id: number
  warehouse_code: string
  name: string
  warehouse_type: string
  active_shipments: number
}

export interface StatusDist { status: string; count: number }

export interface StatisticsResponse {
  filters: {
    date_from: string
    date_to: string
    transport_type?: string
    currency: string
    period_days: number
  }
  overview: StatsOverview
  comparison: StatsComparison
  financial: {
    monthly_trend: MonthlyPoint[]
    currency_breakdown: CurrencyBreakdown[]
    unpaid_invoices: UnpaidInvoice[]
    top_profit: TopProfitItem[]
    low_margin: TopProfitItem[]
  }
  modes: {
    breakdown: ModeBreakdown[]
    vehicle_load: VehicleLoad[]
  }
  customers: {
    top_revenue: CustomerStat[]
    top_profit: CustomerStat[]
    inactive: InactiveCustomer[]
    geo_departure: GeoStat[]
    geo_arrival: GeoStat[]
  }
  operations: {
    top_routes: RouteStat[]
    vehicle_performance: VehiclePerf[]
    warehouse_load: WarehouseLoad[]
    doc_missing_top: Record<string, number>
    status_distribution: StatusDist[]
    avg_duration_days: number
  }
}

export function useStatistics(filters: StatsFilters) {
  return useQuery({
    queryKey: ['statistics', filters],
    queryFn: () => api.post<StatisticsResponse>('/api/statistics', filters),
    staleTime: 60_000,
  })
}

export async function exportStatsExcel(filters: StatsFilters) {
  const token = getToken()
  const resp = await fetch('/api/statistics/export-excel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(filters),
  })
  if (!resp.ok) throw new Error('Excel oluşturulamadı: HTTP ' + resp.status)
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `CargoTrack_Istatistik_${filters.date_from}_${filters.date_to}.xls`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
