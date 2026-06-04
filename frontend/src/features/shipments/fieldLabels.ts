/**
 * Shipment kolon kodlarını Türkçe insan-okunabilir etiketlere çevirir.
 * Geçmiş sekmesinde diff renderer tarafından kullanılır.
 *
 * Nested JSON yolu (örn: "financial_data.nakliye.income") için
 * önce tam yolu, sonra son segmenti, en son ham anahtarı dener.
 */

const TOP_LEVEL: Record<string, string> = {
  // Genel
  shipment_no: 'Sevkiyat No',
  transport_type: 'Taşıma Tipi',
  status: 'Durum',
  created_date: 'Oluşturma Tarihi',
  responsible_user: 'Sorumlu Kullanıcı',
  client_reference: 'Müşteri Referansı',

  // Taraflar
  client_billing: 'Müşteri (Faturalama)',
  sender: 'Gönderici',
  receiver: 'Alıcı',
  agent: 'Acente',
  client_contact: 'İletişim Kişi',
  client_phone: 'Telefon',
  client_email: 'E-posta',
  client_delivery_address: 'Teslim Adresi',
  departure_country: 'Çıkış Ülkesi',
  arrival_country: 'Varış Ülkesi',

  // Yük
  goods_description: 'Mal Tanımı',
  hs_code: 'HS Kodu',
  gross_weight: 'Brüt Ağırlık (kg)',
  net_weight: 'Net Ağırlık (kg)',
  volume_cbm: 'Hacim (m³)',
  dimensions: 'Boyutlar',
  quantity: 'Kap Adedi',
  package_count: 'Paket Sayısı',
  pallets: 'Palet',
  package_type: 'Paket Tipi',
  package_type_custom: 'Paket Tipi (Özel)',
  dangerous_goods: 'Tehlikeli Madde',
  adr_code: 'ADR Kodu',
  temperature_controlled: 'Sıcaklık Kontrollü',
  temperature_min: 'Min Sıcaklık (°C)',
  temperature_max: 'Max Sıcaklık (°C)',
  incoterm: 'Incoterm',
  incoterm_location: 'Incoterm Lokasyon',
  incoterm_postal: 'Incoterm Posta Kodu',
  incoterm_city: 'Incoterm Şehir',
  incoterm_country_field: 'Incoterm Ülke',
  insurance: 'Sigortalı',
  goods_value: 'Mal Değeri',
  crates_data: 'Kap Listesi',

  // Finansal
  purchase_price: 'Toplam Alış (özet)',
  sale_price: 'Toplam Satış (özet)',
  freight_cost: 'Navlun Maliyeti',
  customs_cost: 'Gümrük Maliyeti',
  transport_handling: 'Taşıma Elleçleme',
  storage_handling: 'Depo Elleçleme',
  storage_cost: 'Depo Maliyeti',
  insurance_cost: 'Sigorta Maliyeti',
  other_costs: 'Diğer Maliyetler',
  currency_code: 'Para Birimi',
  financial_data: 'Finansal',

  // Belgeler
  documents: 'Belgeler',
  documents_data: 'Belge Durumu',

  // Depolama
  warehouse: 'Depo',
  entry_date: 'Giriş Tarihi',
  exit_date: 'Çıkış Tarihi',
  daily_rate: 'Günlük Ücret',
  handling_fee: 'Elleçleme Ücreti',
  other_storage_fees: 'Diğer Depo Ücretleri',
  storage_data: 'Depo Verileri',
  depo_stock_log: 'Stok Hareketleri',
  depo_kap_sayisi: 'Depo Kap Sayısı',
  depo_ucret_tipi: 'Depo Ücret Tipi',
  depo_gun_ucret: 'Depo Günlük Ücret',
  depo_hafta_ucret: 'Depo Haftalık Ücret',
  depo_ay_ucret: 'Depo Aylık Ücret',
  depo_musteri: 'Depo Müşterisi',
  depo_gunluk_ucret: 'Depo Günlük Ücret',
  depo_toplam_satis: 'Depo Toplam Satış',

  // Elleçleme
  ellecleme_filmleme: 'Elleçleme: Filmleme',
  ellecleme_paletleme: 'Elleçleme: Paletleme',
  ellecleme_etiketleme: 'Elleçleme: Etiketleme',
  ellecleme_depo_giris: 'Elleçleme: Depo Giriş',
  ellecleme_depo_cikis: 'Elleçleme: Depo Çıkış',

  // Mode-spesifik (sea/air detayları)
  mode_data: 'Detaylar',

  // Sevkiyata özel taraf bilgileri
  parties_data: 'Taraf Ek Bilgileri',

  // Faturalama
  invoice_generated: 'Fatura Üretildi',
  invoice_no: 'Fatura No',
  invoice_date: 'Fatura Tarihi',
  invoice_amount: 'Fatura Tutarı',
  payment_received: 'Ödeme Alındı',
  payment_type: 'Ödeme Tipi',
  payment_notes: 'Ödeme Notları',
}

// Finansal kalem (FIN_SCHEMAS) ve mode_data nested key Türkçeleri
const NESTED_LABELS: Record<string, string> = {
  // financial_data ortak kalemler
  income: 'Gelir',
  income_vat: 'Gelir KDV %',
  income_vat_custom: 'Gelir KDV (Özel)',
  expense: 'Gider',
  expense_vat: 'Gider KDV %',
  expense_vat_custom: 'Gider KDV (Özel)',
  label: 'Etiket',
  notes: 'Notlar',

  // financial_data kalem anahtarları (FIN_SCHEMAS'tan)
  nakliye: 'Nakliye',
  gumruk: 'Gümrük',
  ardiye: 'Ardiye',
  sigorta: 'Sigorta',
  diger: 'Diğer',
  liman: 'Liman',
  konteyner: 'Konteyner',
  thc: 'THC',
  bl_fee: 'B/L Ücreti',
  awb_fee: 'AWB Ücreti',
  havayolu: 'Havayolu Navlunu',
  yakıt: 'Yakıt',
  guvenlik: 'Güvenlik',
  elleçleme: 'Elleçleme',
  depo_kira: 'Depo Kirası',
  handling: 'Elleçleme',

  // mode_data
  ship_name: 'Gemi Adı',
  voyage_no: 'Sefer No',
  bl_number: 'B/L No',
  container_no: 'Konteyner No',
  container_type: 'Konteyner Tipi',
  port_of_loading: 'Yükleme Limanı',
  port_of_discharge: 'Boşaltma Limanı',
  etd: 'Tahmini Kalkış',
  eta: 'Tahmini Varış',
  flight_no: 'Uçuş No',
  awb_number: 'AWB No',
  airport_origin: 'Çıkış Havalimanı',
  airport_dest: 'Varış Havalimanı',

  // parties_data nested keys
  client: 'Müşteri',
  sender: 'Gönderici',
  receiver: 'Alıcı',
  agent: 'Acente',
  delivery_address_2: '2. Teslim Adresi',
  address: 'Sevkiyat Adresi',
  contact: 'İletişim Kişi',
  phone: 'Telefon',
  email: 'E-posta',

  // storage_data nested keys
  warehouse_type_code: 'Depo Tipi (Gümrük Kodu)',
  transit_doc_no: 'Transit Evrak No',
  transit_expiry_date: 'Transit Son Geçerlilik Tarihi',
}

export function labelForField(path: string): string {
  // Tam yol (örn: "client_billing")
  if (TOP_LEVEL[path]) return TOP_LEVEL[path]

  const parts = path.split('.')
  if (parts.length === 1) return TOP_LEVEL[path] || prettify(path)

  // Nested: "financial_data.nakliye.income" → "Finansal Kalemler · Nakliye · Gelir"
  return parts
    .map((seg, i) => {
      if (i === 0) return TOP_LEVEL[seg] || prettify(seg)
      return NESTED_LABELS[seg] || prettify(seg)
    })
    .join(' · ')
}

function prettify(s: string): string {
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Belirli alanların ham değerini Türkçe insan-okunabilir label'a çevirir.
 * Örn: status="in_progress" → "Devam Ediyor", payment_type="havale" → "Havale / EFT"
 */
const VALUE_MAPS: Record<string, Record<string, string>> = {
  status: {
    draft: 'Taslak',
    in_progress: 'Devam Ediyor',
    to_invoice: 'Faturalanacak',
    closed: 'Kapalı',
  },
  transport_type: {
    road: 'Karayolu',
    maritime: 'Denizyolu',
    sea: 'Denizyolu',
    air: 'Havayolu',
    storage: 'Depolama',
    import: 'İthalat',
    export: 'İhracat',
  },
  payment_type: {
    havale: 'Havale / EFT',
    cek: 'Çek',
    nakit: 'Nakit',
    kredi_karti: 'Kredi Kartı',
    akreditif: 'Akreditif',
    vesaik: 'Vesaik Mukabili',
    diger: 'Diğer',
  },
  depo_ucret_tipi: {
    gun: 'Günlük',
    hafta: 'Haftalık',
    ay: 'Aylık',
  },
}

// Bu alan adları boolean (Evet/Hayır) olarak yorumlanır (DB'de 0/1 olsa bile)
const BOOLEAN_FIELDS = new Set([
  'pallets',
  'dangerous_goods',
  'temperature_controlled',
  'insurance',
  'invoice_generated',
  'payment_received',
])

// Bu alan adları (veya dot-notation ile biten) yüzde olarak gösterilir
const PERCENT_SUFFIXES = ['income_vat', 'expense_vat']

// Bu son segmentler para birimi sembolüyle gösterilebilir (sayı ise)
const MONEY_SUFFIXES = new Set([
  'income', 'expense',
  'purchase_price', 'sale_price', 'goods_value', 'invoice_amount',
  'freight_cost', 'customs_cost', 'transport_handling', 'storage_handling',
  'storage_cost', 'insurance_cost', 'other_costs',
  'daily_rate', 'handling_fee', 'other_storage_fees',
  'depo_gun_ucret', 'depo_hafta_ucret', 'depo_ay_ucret',
  'depo_gunluk_ucret', 'depo_toplam_satis',
  'ellecleme_filmleme', 'ellecleme_paletleme', 'ellecleme_etiketleme',
  'ellecleme_depo_giris', 'ellecleme_depo_cikis',
])

function lastSegment(path: string): string {
  const parts = path.split('.')
  return parts[parts.length - 1]
}

function topSegment(path: string): string {
  return path.split('.')[0]
}

/**
 * Bir değeri okunabilir string'e çevir (geçmiş satırında "Eski → Yeni" gösterimi için).
 * Alan yolunu bilirse enum kodlarını Türkçe label'a çevirir, sayıları formatlar,
 * boolean'ları Evet/Hayır yapar, vs.
 */
export function formatChangeValue(
  v: unknown,
  path: string = '',
  maxLen = 80
): { short: string; full: string } {
  if (v === null || v === undefined || v === '') {
    return { short: 'Boş', full: 'Belirtilmemiş' }
  }

  const last = lastSegment(path)
  const top = topSegment(path)

  // Enum mapping (status, transport_type, payment_type, depo_ucret_tipi)
  const valueMap = VALUE_MAPS[last] || VALUE_MAPS[top]
  if (valueMap) {
    const key = String(v)
    if (valueMap[key]) return { short: valueMap[key], full: valueMap[key] }
  }

  // Boolean alanlar (DB'de 0/1 gelse bile)
  if (BOOLEAN_FIELDS.has(last) || typeof v === 'boolean') {
    const isTrue = v === true || v === 1 || v === '1' || v === 'true'
    return { short: isTrue ? 'Evet' : 'Hayır', full: isTrue ? 'Evet' : 'Hayır' }
  }

  // KDV yüzdesi (income_vat / expense_vat → "%18", "%0", custom değerler ham gösterilir)
  if (PERCENT_SUFFIXES.includes(last) && (typeof v === 'number' || /^\d+(\.\d+)?$/.test(String(v)))) {
    const s = `%${Number(v)}`
    return { short: s, full: s }
  }

  // Para tutarı alanları (sayı ise binlik ayraç + 2 decimal)
  if (MONEY_SUFFIXES.has(last) && (typeof v === 'number' || /^-?\d+(\.\d+)?$/.test(String(v)))) {
    const n = Number(v)
    const s = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
    return { short: s, full: s }
  }

  // Tarih alanları (YYYY-MM-DD formatında)
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = v.slice(0, 10)
    const [y, m, day] = d.split('-')
    const formatted = `${day}.${m}.${y}`
    return { short: formatted, full: formatted }
  }

  // Sayılar (genel)
  if (typeof v === 'number') {
    const s = new Intl.NumberFormat('tr-TR').format(v)
    return { short: s, full: s }
  }

  // Stringler
  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (!trimmed) return { short: 'Boş', full: 'Belirtilmemiş' }
    if (trimmed.length <= maxLen) return { short: trimmed, full: trimmed }
    return { short: trimmed.slice(0, maxLen) + '…', full: trimmed }
  }

  // Object/array fallback (normalde flatten edildiği için buraya düşmez)
  const full = JSON.stringify(v, null, 2)
  const short = full.length <= maxLen ? full : full.slice(0, maxLen) + '…'
  return { short, full }
}
