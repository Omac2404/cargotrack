/**
 * FIN_SCHEMAS — mode başına finansal kalem şeması (PHP cargotrack.php:12567'ten port).
 * Her kalem hem gelir hem gider olarak girilebilir, KDV oranı seçilebilir.
 */

export interface FinItem {
  group: string
  key: string
  label?: string
  /** TVA/KDV kalemi ise true — bu kalem üzerinde KDV girilmez (kendisi KDV'dir) */
  noVat?: boolean
}

/**
 * Gümrükleme masrafları — üç taşıma modunda da aynı kalemler kullanılıyor,
 * tek yerden yönetilsin diye ayrıldı.
 */
const IMPORT_CLEARANCE_ITEMS: FinItem[] = [
  { group: 'İthalat Vergileri', key: 'ith_frais_t1', label: 'Frais de T1 (T1 Transit Masrafı)' },
  { group: 'İthalat Vergileri', key: 'ith_forfait_dedouanement', label: 'Forfait Dédouanement (Gümrükleme Ücreti)' },
  { group: 'İthalat Vergileri', key: 'ith_frais_bad', label: 'Frais de BAD (Teslim Emri Masrafı)' },
  { group: 'İthalat Vergileri', key: 'ith_stop_douane', label: 'Stop Douane (Gümrük Durdurma)' },
]

const ROAD_SCHEMA: FinItem[] = [
  { group: 'Navlun', key: 'navlun', label: 'Navlun' },
  { group: 'Çıkış Ülkesi', key: 'ihracat_gumruk', label: 'İhracat Gümrük' },
  { group: 'Çıkış Ülkesi', key: 'cikis_tasima', label: 'Taşıma / Elleçleme' },
  { group: 'Çıkış Ülkesi', key: 'cikis_ic_nakliye', label: 'İç Nakliye' },
  { group: 'Varış Ülkesi', key: 'ithalat_gumruk', label: 'İthalat Gümrük' },
  { group: 'Varış Ülkesi', key: 'varis_depo', label: 'Depo / Elleçleme' },
  { group: 'Varış Ülkesi', key: 'varis_ic_nakliye', label: 'İç Nakliye' },
  { group: 'İthalat Vergileri', key: 'ith_tva', label: 'TVA (KDV)', noVat: true },
  { group: 'İthalat Vergileri', key: 'ith_droit_douane', label: 'Droit Douane (Gümrük Vergisi)' },
  { group: 'İthalat Vergileri', key: 'ith_taxe_parafiscal', label: 'Taxe Parafiscal (Sektörel Vergi)' },
  { group: 'İthalat Vergileri', key: 'ith_anti_dumping', label: 'Anti-Dumping (Haksız Rekabet Vergisi)' },
  { group: 'İthalat Vergileri', key: 'ith_droit_porte', label: 'Droit Porte (Liman/Terminal Geçiş Vergisi)' },
  ...IMPORT_CLEARANCE_ITEMS,
  { group: 'Genel', key: 'sigorta', label: 'Sigorta' },
  { group: 'Genel', key: 'diger', label: 'Diğer' },
]

const MARITIME_SCHEMA: FinItem[] = [
  { group: 'Navlun', key: 'navlun', label: 'Sea Freight (Navlun)' },
  { group: 'Navlun', key: 'thc_origin', label: 'THC Çıkış (Terminal Handling)' },
  { group: 'Navlun', key: 'thc_dest', label: 'THC Varış (Terminal Handling)' },
  { group: 'Navlun', key: 'bl_fee', label: 'B/L Fee (Konşimento Ücreti)' },
  { group: 'Navlun', key: 'baf', label: 'BAF (Yakıt Düzeltme)' },
  { group: 'Navlun', key: 'caf', label: 'CAF (Para Birimi Düzeltme)' },
  { group: 'Çıkış Ülkesi', key: 'cikis_depolama', label: 'Depolama' },
  { group: 'Çıkış Ülkesi', key: 'cikis_nakliye', label: 'İç Nakliye (Limana)' },
  { group: 'Çıkış Ülkesi', key: 'ihracat_gumruk', label: 'İhracat Gümrük / Evraklama' },
  { group: 'Çıkış Ülkesi', key: 'cikis_sigorta', label: 'Sigorta' },
  { group: 'Çıkış Ülkesi', key: 'demurrage_origin', label: 'Demuraj (Çıkış)' },
  { group: 'Varış Ülkesi', key: 'varis_liman', label: 'Liman Masrafları' },
  { group: 'Varış Ülkesi', key: 'varis_ic_nakliye', label: 'İç Nakliye (Limandan)' },
  { group: 'Varış Ülkesi', key: 'ithalat_gumruk', label: 'İthalat Gümrük / Evraklama' },
  { group: 'Varış Ülkesi', key: 'varis_depolama', label: 'Depolama / Elleçleme' },
  { group: 'Varış Ülkesi', key: 'demurrage_dest', label: 'Demuraj / Detention (Varış)' },
  { group: 'Varış Ülkesi', key: 'varis_sigorta', label: 'Sigorta' },
  { group: 'İthalat Vergileri', key: 'ith_tva', label: 'TVA (KDV)', noVat: true },
  { group: 'İthalat Vergileri', key: 'ith_droit_douane', label: 'Droit Douane (Gümrük Vergisi)' },
  { group: 'İthalat Vergileri', key: 'ith_taxe_parafiscal', label: 'Taxe Parafiscal' },
  { group: 'İthalat Vergileri', key: 'ith_anti_dumping', label: 'Anti-Dumping' },
  { group: 'İthalat Vergileri', key: 'ith_droit_porte', label: 'Droit Porte / Liman Vergisi' },
  ...IMPORT_CLEARANCE_ITEMS,
  { group: 'Genel', key: 'diger', label: 'Diğer' },
]

const AIR_SCHEMA: FinItem[] = [
  { group: 'Navlun', key: 'navlun', label: 'Air Freight (Navlun)' },
  { group: 'Navlun', key: 'awb_fee', label: 'AWB Fee (Konşimento Ücreti)' },
  { group: 'Navlun', key: 'fuel_surcharge', label: 'Fuel Surcharge (Yakıt Eki)' },
  { group: 'Navlun', key: 'security_surcharge', label: 'Security Surcharge (Güvenlik Eki)' },
  { group: 'Navlun', key: 'xray_fee', label: 'X-Ray / Tarama' },
  { group: 'Navlun', key: 'handling_origin', label: 'Handling Çıkış' },
  { group: 'Navlun', key: 'handling_dest', label: 'Handling Varış' },
  { group: 'Çıkış Ülkesi', key: 'cikis_tasima', label: 'İç Nakliye (Havalimanına)' },
  { group: 'Çıkış Ülkesi', key: 'ihracat_gumruk', label: 'İhracat Gümrük' },
  { group: 'Çıkış Ülkesi', key: 'cikis_sigorta', label: 'Sigorta' },
  { group: 'Varış Ülkesi', key: 'varis_ic_nakliye', label: 'İç Nakliye (Havalimanından)' },
  { group: 'Varış Ülkesi', key: 'ithalat_gumruk', label: 'İthalat Gümrük' },
  { group: 'Varış Ülkesi', key: 'varis_depo', label: 'Depo / Elleçleme' },
  { group: 'Varış Ülkesi', key: 'varis_sigorta', label: 'Sigorta' },
  { group: 'İthalat Vergileri', key: 'ith_tva', label: 'TVA (KDV)', noVat: true },
  { group: 'İthalat Vergileri', key: 'ith_droit_douane', label: 'Droit Douane (Gümrük Vergisi)' },
  { group: 'İthalat Vergileri', key: 'ith_taxe_parafiscal', label: 'Taxe Parafiscal' },
  { group: 'İthalat Vergileri', key: 'ith_anti_dumping', label: 'Anti-Dumping' },
  ...IMPORT_CLEARANCE_ITEMS,
  { group: 'Genel', key: 'diger', label: 'Diğer' },
]

export const FIN_SCHEMAS: Record<string, FinItem[]> = {
  road: ROAD_SCHEMA,
  maritime: MARITIME_SCHEMA,
  sea: MARITIME_SCHEMA,
  air: AIR_SCHEMA,
  import: ROAD_SCHEMA,
  export: ROAD_SCHEMA,
  storage: ROAD_SCHEMA,
}

export function getFinSchema(mode: string | undefined | null): FinItem[] {
  if (mode === 'sea' || mode === 'maritime') return MARITIME_SCHEMA
  return FIN_SCHEMAS[mode || 'road'] || ROAD_SCHEMA
}

// KDV oran seçenekleri (PHP cargotrack.php:12637)
export const VAT_RATES = [
  { value: '0', label: '0%' },
  { value: '1', label: '1%' },
  { value: '5.5', label: '5.5%' },
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
  { value: '18', label: '18%' },
  { value: '20', label: '20%' },
  { value: 'custom', label: 'Diğer...' },
]

// === Tek bir kalemin değer yapısı (financial_data JSON içinde) ===
export interface FinLineEntry {
  income?: number      // gelir
  income_vat?: string  // gelir KDV oranı ('0', '1', '5.5', ..., veya custom değer)
  expense?: number     // gider (maliyet)
  expense_vat?: string // gider KDV oranı
  note?: string
  /** Kullanıcı-eklenmiş custom kalemler için düzenlenebilir etiket */
  label?: string
}

export type FinancialData = Record<string, FinLineEntry>

/**
 * Varsayılan KDV oranı.
 *
 * KDV seçici, oran girilmemiş kalemlerde ekranda %20 gösteriyordu ama bu değer
 * kaydedilmiyordu; hesap ise boş oranı 0 sayıyordu. Sonuç: kullanıcı %20 görüp
 * KDV'nin hesaplanmasını bekliyor, toplamda 0,00 çıkıyordu. Ekranda görünen
 * oranla hesapta kullanılan oran artık aynı kaynaktan geliyor.
 */
export const DEFAULT_VAT_RATE = '20'

/** Kalemde saklı KDV oranını sayıya çevirir ('custom:7.5' biçimini de anlar). */
export function parseVatRate(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null || raw === '') return Number(DEFAULT_VAT_RATE)
  const s = String(raw)
  if (s.startsWith('custom:')) return parseFloat(s.slice(7)) || 0
  if (s === 'custom') return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

/** Tek bir kalemin gelir/gider KDV hesabı */
export function calcFinLineTotals(entry: FinLineEntry, noVat?: boolean) {
  const income = Number(entry.income || 0)
  const expense = Number(entry.expense || 0)
  const incomeVatRate = noVat ? 0 : parseVatRate(entry.income_vat)
  const expenseVatRate = noVat ? 0 : parseVatRate(entry.expense_vat)

  return {
    income,
    income_vat: income * (incomeVatRate / 100),
    income_total: income + income * (incomeVatRate / 100),
    expense,
    expense_vat: expense * (expenseVatRate / 100),
    expense_total: expense + expense * (expenseVatRate / 100),
    profit: income - expense,
    profit_with_vat: (income + income * (incomeVatRate / 100)) - (expense + expense * (expenseVatRate / 100)),
  }
}

/** Tüm kalemler için toplam */
/**
 * "Débours" — müşteri adına ödenen, hizmet bedeli olmayan gerçek vergiler.
 *
 * Bunlar KDV matrahına GİRMEZ ve üzerlerine KDV hesaplanmaz; faturada ayrı
 * blokta, bire bir aynen yansıtılır. Aksi halde vergiler "KDV hariç toplam"ın
 * içine girip üstlerine bir kez daha KDV bindiriliyordu.
 *
 * Dikkat: ith_frais_t1 / ith_forfait_dedouanement / ith_frais_bad /
 * ith_stop_douane birer HİZMET bedelidir (vergi değil), normal KDV'ye tabidir.
 */
export const DEBOURS_KEYS = [
  'ith_tva',
  'ith_droit_douane',
  'ith_taxe_parafiscal',
  'ith_anti_dumping',
  'ith_droit_porte',
] as const

export function isDeboursKey(key: string): boolean {
  return (DEBOURS_KEYS as readonly string[]).includes(key)
}

export function calcFinTotals(schema: FinItem[], data: FinancialData) {
  // Hizmet bedelleri (KDV matrahı)
  let totalIncome = 0, totalIncomeVat = 0
  let totalExpense = 0, totalExpenseVat = 0
  // Débours — müşteri adına ödenen vergiler; KDV matrahı dışında tutulur
  let deboursIncome = 0, deboursExpense = 0

  const accumulate = (key: string, entry: FinLineEntry, noVat?: boolean) => {
    if (isDeboursKey(key)) {
      deboursIncome += Number(entry.income || 0)
      deboursExpense += Number(entry.expense || 0)
      return
    }
    const t = calcFinLineTotals(entry, noVat)
    totalIncome += t.income
    totalIncomeVat += t.income_vat
    totalExpense += t.expense
    totalExpenseVat += t.expense_vat
  }

  const schemaKeys = new Set(schema.map((s) => s.key))
  for (const item of schema) {
    accumulate(item.key, data[item.key] || {}, item.noVat)
  }
  // Kullanıcı-eklenmiş custom kalemleri de topla (schema'da olmayan key'ler)
  for (const key of Object.keys(data)) {
    if (schemaKeys.has(key)) continue
    accumulate(key, data[key] || {}, false)
  }

  return {
    totalIncome,
    totalIncomeVat,
    totalIncomeWithVat: totalIncome + totalIncomeVat,
    /** Vergiler (débours) — KDV'siz, aynen yansıtılır */
    deboursIncome,
    deboursExpense,
    /** Müşterinin ödeyeceği nihai tutar: hizmet KDV dahil + vergiler */
    netPayableIncome: totalIncome + totalIncomeVat + deboursIncome,
    netPayableExpense: totalExpense + totalExpenseVat + deboursExpense,
    totalExpense,
    totalExpenseVat,
    totalExpenseWithVat: totalExpense + totalExpenseVat,
    /**
     * Kâr/marj débours dahil hesaplanır: vergiler genelde hem gelire hem gidere
     * aynı tutarla girilip birbirini götürür, ama tek tarafa girildiğinde
     * sonuca yansıması gerekir. Bu yüzden ciro/maliyet kutuları da bu rakamları
     * kullanır — kullanıcının bugün gördüğü toplamlar değişmesin.
     */
    grossIncome: totalIncome + deboursIncome,
    grossExpense: totalExpense + deboursExpense,
    profit: (totalIncome + deboursIncome) - (totalExpense + deboursExpense),
    profitWithVat: (totalIncome + totalIncomeVat + deboursIncome) - (totalExpense + totalExpenseVat + deboursExpense),
    margin: (totalIncome + deboursIncome) > 0
      ? (((totalIncome + deboursIncome) - (totalExpense + deboursExpense)) / (totalIncome + deboursIncome)) * 100
      : 0,
  }
}
