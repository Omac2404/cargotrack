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

// === Status labels (i18n keys) — UI'de t(SHIPMENT_STATUS_LABELS[s]) ile çevrilir ===
export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'shipment.status.draft',
  in_progress: 'shipment.status.in_progress',
  to_invoice: 'shipment.status.to_invoice',
  closed: 'shipment.status.closed',
}

// === Ödeme tipleri (i18n key'leri ile) ===
export const PAYMENT_TYPES = [
  { value: '', label: 'shipment.not_specified' },
  { value: 'havale', label: 'shipment.payment_types.wire' },
  { value: 'cek', label: 'shipment.payment_types.check' },
  { value: 'nakit', label: 'shipment.payment_types.cash' },
  { value: 'kredi_karti', label: 'shipment.payment_types.credit_card' },
  { value: 'akreditif', label: 'shipment.payment_types.letter_of_credit' },
  { value: 'vesaik', label: 'shipment.payment_types.documents' },
  { value: 'diger', label: 'shipment.payment_types.other' },
]
