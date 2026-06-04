import { z } from 'zod'

const optString = z.string().optional().or(z.literal('')).transform((v) => v || '')
const numericString = z.union([z.string(), z.number()]).optional().transform((v) => {
  if (v === undefined || v === '' || v === null) return undefined
  const n = typeof v === 'string' ? parseFloat(v) : v
  return isFinite(n) ? n : undefined
})

export const shipmentSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),

  transport_type: z.enum(['road', 'maritime', 'air', 'storage', 'import', 'export']),
  status: z.enum(['draft', 'in_progress', 'to_invoice', 'closed']).default('draft'),
  created_date: optString,
  responsible_user: optString,
  client_reference: optString,

  // Taraflar
  client_billing: optString,
  sender: optString,
  receiver: optString,
  agent: optString,
  client_contact: optString,
  client_phone: optString,
  client_email: optString,
  client_delivery_address: optString,
  departure_country: optString,
  arrival_country: optString,

  // Yük
  goods_description: optString,
  hs_code: optString,
  gross_weight: numericString,
  net_weight: numericString,
  volume_cbm: numericString,
  dimensions: optString,
  quantity: numericString,
  package_count: numericString,
  package_type: optString,
  dangerous_goods: z.boolean().or(z.number()).default(0).transform((v) => (v ? 1 : 0)),
  adr_code: optString,
  temperature_controlled: z.boolean().or(z.number()).default(0).transform((v) => (v ? 1 : 0)),
  temperature_min: numericString,
  temperature_max: numericString,
  incoterm: optString,
  incoterm_location: optString,
  insurance: z.boolean().or(z.number()).default(0).transform((v) => (v ? 1 : 0)),
  goods_value: numericString,
  parties_data: z.string().optional().or(z.literal('')),

  // Finansal
  purchase_price: numericString,
  sale_price: numericString,
  freight_cost: numericString,
  customs_cost: numericString,
  transport_handling: numericString,
  insurance_cost: numericString,
  other_costs: numericString,
  currency_code: z.string().default('EUR'),

  // Depo (storage / depo bağlantısı için)
  warehouse: optString,
  entry_date: optString,
  exit_date: optString,
  daily_rate: numericString,
  handling_fee: numericString,
  other_storage_fees: numericString,
  // Elleçleme kalemleri
  ellecleme_filmleme: numericString,
  ellecleme_paletleme: numericString,
  ellecleme_etiketleme: numericString,
  ellecleme_depo_giris: numericString,
  ellecleme_depo_cikis: numericString,
  depo_musteri: optString,
  depo_kap_sayisi: numericString,
  depo_ucret_tipi: optString,
  depo_gun_ucret: numericString,
  depo_hafta_ucret: numericString,
  depo_ay_ucret: numericString,
  // Incoterm detayları
  incoterm_postal: optString,
  incoterm_city: optString,
  incoterm_country_field: optString,

  // Fatura
  invoice_no: optString,
  invoice_date: optString,
  invoice_amount: numericString,
  payment_received: z.boolean().or(z.number()).default(0).transform((v) => (v ? 1 : 0)),
  payment_type: optString,
  payment_notes: optString,
  invoice_generated: z.boolean().or(z.number()).default(0).transform((v) => (v ? 1 : 0)),

  // JSON kolonları — string olarak saklanır
  mode_data: z.union([z.string(), z.record(z.string(), z.unknown())]).optional().transform((v) => {
    if (v === undefined || v === null || v === '') return ''
    return typeof v === 'string' ? v : JSON.stringify(v)
  }),
  financial_data: z.union([z.string(), z.record(z.string(), z.unknown())]).optional().transform((v) => {
    if (v === undefined || v === null || v === '') return ''
    return typeof v === 'string' ? v : JSON.stringify(v)
  }),
  storage_data: z.union([z.string(), z.record(z.string(), z.unknown())]).optional().transform((v) => {
    if (v === undefined || v === null || v === '') return ''
    return typeof v === 'string' ? v : JSON.stringify(v)
  }),
  documents_data: z.union([z.string(), z.record(z.string(), z.unknown())]).optional().transform((v) => {
    if (v === undefined || v === null || v === '') return ''
    return typeof v === 'string' ? v : JSON.stringify(v)
  }),
  crates_data: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]).optional().transform((v) => {
    if (v === undefined || v === null || v === '') return ''
    return typeof v === 'string' ? v : JSON.stringify(v)
  }),
  depo_stock_log: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]).optional().transform((v) => {
    if (v === undefined || v === null || v === '') return ''
    return typeof v === 'string' ? v : JSON.stringify(v)
  }),
})

export type ShipmentFormValues = z.input<typeof shipmentSchema>
