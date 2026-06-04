/**
 * Tüm sabitleri tek noktadan export et.
 * Kullanım: import { TRANSPORT_MODES, FIN_SCHEMAS, COUNTRIES, CURRENCIES, ... } from '@/lib/constants'
 */

export * from './transportModes'
export * from './finSchemas'
export * from './countries'
export * from './cityCountry'
export * from './handling'
export * from './storage'
export * from './currencies'

// === Status labels ===
export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  in_progress: 'Devam Ediyor',
  to_invoice: 'Faturalanacak',
  closed: 'Kapalı',
}

// === Ödeme tipleri ===
export const PAYMENT_TYPES = [
  { value: '', label: 'Belirtilmedi' },
  { value: 'havale', label: 'Havale / EFT' },
  { value: 'cek', label: 'Çek' },
  { value: 'nakit', label: 'Nakit' },
  { value: 'kredi_karti', label: 'Kredi Kartı' },
  { value: 'akreditif', label: 'Akreditif' },
  { value: 'vesaik', label: 'Vesaik Mukabili' },
  { value: 'diger', label: 'Diğer' },
]
