import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// === Monthly revenue ===
export interface MonthlyRevenueRow {
  month: number
  month_name: string
  shipment_count: number
  total_sale: number
  total_purchase: number
  profit: number
  margin: number
}
export interface MonthlyRevenueResponse {
  year: number
  transport_type: string
  series: MonthlyRevenueRow[]
  totals: { shipment_count: number; total_sale: number; total_purchase: number; profit: number; margin: number }
}
export function useMonthlyRevenue(year: number, transportType?: string) {
  return useQuery({
    queryKey: ['report-monthly-revenue', year, transportType || 'all'],
    queryFn: () => api.get<MonthlyRevenueResponse>('/api/reports/monthly-revenue', {
      year: String(year),
      transport_type: transportType || undefined,
    }),
  })
}

// === Customer ranking ===
export interface CustomerRankingRow {
  company_name: string
  shipment_count: number
  total_sale: number
  total_purchase: number
  profit: number
  margin: number
  pending_payment: number
}
export interface CustomerRankingResponse {
  year: number
  limit: number
  customers: CustomerRankingRow[]
}
export function useCustomerRanking(year: number, limit = 20) {
  return useQuery({
    queryKey: ['report-customer-ranking', year, limit],
    queryFn: () => api.get<CustomerRankingResponse>('/api/reports/customer-ranking', {
      year: String(year),
      limit: String(limit),
    }),
  })
}

// === Aging ===
export interface AgingItem {
  id: number
  shipment_no: string
  client: string
  invoice_no: string
  invoice_date: string
  amount: number
  currency: string
  days_overdue: number
}
export interface AgingBucket {
  key: string
  label: string
  items: AgingItem[]
  total: number
}
export interface AgingResponse {
  buckets: AgingBucket[]
  total_unpaid: number
  total_count: number
}
export function useAging() {
  return useQuery({
    queryKey: ['report-aging'],
    queryFn: () => api.get<AgingResponse>('/api/reports/aging'),
  })
}

// === Vehicle utilization ===
export interface VehicleUtilRow {
  id: number
  vehicle_code: string
  plate: string
  transport_type: string
  capacity_kg: number
  assignment_count: number
  total_quantity: number
  total_weight: number
  avg_utilization: number
}
export interface VehicleUtilResponse {
  start: string
  end: string
  vehicles: VehicleUtilRow[]
}
export function useVehicleUtilization(start?: string, end?: string) {
  return useQuery({
    queryKey: ['report-vehicle-util', start, end],
    queryFn: () => api.get<VehicleUtilResponse>('/api/reports/vehicle-utilization', {
      start: start || undefined,
      end: end || undefined,
    }),
  })
}

// === User performance ===
export interface UserPerfRow {
  id: number
  username: string
  full_name: string
  role: string
  shipment_count: number
  total_sale: number
  profit: number
}
export interface UserPerfResponse {
  year: number
  users: UserPerfRow[]
}
export function useUserPerformance(year: number) {
  return useQuery({
    queryKey: ['report-user-perf', year],
    queryFn: () => api.get<UserPerfResponse>('/api/reports/user-performance', { year: String(year) }),
  })
}
