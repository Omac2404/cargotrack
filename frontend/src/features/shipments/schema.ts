import { z } from 'zod'

const optString = z.string().optional().or(z.literal('')).transform((v) => v || '')
/**
 * Sayısal alan dönüşümü — üç durumu AYIRIR:
 *   undefined → alan hiç dokunulmadı, istekte gönderilmez (DB'deki değer korunur)
 *   null      → kullanıcı alanı boşalttı, backend kolonu sıfırlar
 *   number    → normal değer
 * Daha önce boş değer de undefined'a dönüyordu; bu yüzden bir kez girilen
 * ağırlık/kap sayısı silinemiyordu (istek gövdesinden düştüğü için eski değer kalıyordu).
 */
const numericString = z.union([z.string(), z.number()]).nullish().transform((v) => {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = typeof v === 'string' ? parseFloat(v) : v
  return isFinite(n) ? n : null
})

/**
 * JSON tutan kolonlar için ortak dönüşüm.
 *
 * Backend bu alanları bazen düz metin (LONGTEXT), bazen ayrıştırılmış nesne
 * (gerçek JSON kolonu → mysql2 otomatik parse eder) olarak döndürür. Tek bir
 * tipe bağlanırsa diğer durumda form doğrulaması patlar ve kullanıcı hangi
 * alan olduğunu göremediği için kaydı hiç yapamaz. Her iki biçimi de kabul
 * edip her zaman string olarak gönderiyoruz.
 */
const jsonField = z
  .union([z.string(), z.record(z.string(), z.unknown()), z.array(z.unknown())])
  .nullish()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return ''
    return typeof v === 'string' ? v : JSON.stringify(v)
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
  // parties_data DB'de JSON kolonu; mysql2 bunu NESNE olarak döndürüyor.
  // Yalnızca string kabul edildiğinde, taraf ek bilgisi girilmiş her sevkiyat
  // doğrulamadan geçemiyor ve "Eksik / hatalı alanlar var" ile kaydedilemiyordu.
  parties_data: jsonField,

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
  mode_data: jsonField,
  financial_data: jsonField,
  storage_data: jsonField,
  // documents_data BİLEREK YOK: belge yükleme/durum güncellemesi kendi endpoint'i
  // üzerinden yürüyor. Formda tutulursa, form açıkken yüklenen belgeler
  // Kaydet'e basıldığında eski (bayat) değerle geri ezilir.
  crates_data: jsonField,
  goods_items: jsonField,
  depo_stock_log: jsonField,
})

export type ShipmentFormValues = z.input<typeof shipmentSchema>
