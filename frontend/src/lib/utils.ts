import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(d: string | Date | null | undefined, includeTime = false): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  const fmt: Intl.DateTimeFormatOptions = includeTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' }
  return new Intl.DateTimeFormat('tr-TR', fmt).format(date)
}

export function formatMoney(n: number | string | null | undefined, currency = 'EUR'): string {
  const num = typeof n === 'string' ? parseFloat(n) : (n || 0)
  if (!isFinite(num)) return '—'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatNumber(n: number | string | null | undefined, decimals = 2): string {
  const num = typeof n === 'string' ? parseFloat(n) : (n || 0)
  if (!isFinite(num)) return '—'
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}
