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

/** Tek bir kalemin gelir/gider KDV hesabı */
export function calcFinLineTotals(entry: FinLineEntry, noVat?: boolean) {
  const income = Number(entry.income || 0)
  const expense = Number(entry.expense || 0)
  const incomeVatRate = noVat ? 0 : Number(entry.income_vat || 0)
  const expenseVatRate = noVat ? 0 : Number(entry.expense_vat || 0)

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
export function calcFinTotals(schema: FinItem[], data: FinancialData) {
  let totalIncome = 0, totalIncomeVat = 0
  let totalExpense = 0, totalExpenseVat = 0
  const schemaKeys = new Set(schema.map((s) => s.key))
  for (const item of schema) {
    const entry = data[item.key] || {}
    const t = calcFinLineTotals(entry, item.noVat)
    totalIncome += t.income
    totalIncomeVat += t.income_vat
    totalExpense += t.expense
    totalExpenseVat += t.expense_vat
  }
  // Kullanıcı-eklenmiş custom kalemleri de topla (schema'da olmayan key'ler)
  for (const key of Object.keys(data)) {
    if (schemaKeys.has(key)) continue
    const t = calcFinLineTotals(data[key] || {}, false)
    totalIncome += t.income
    totalIncomeVat += t.income_vat
    totalExpense += t.expense
    totalExpenseVat += t.expense_vat
  }
  return {
    totalIncome,
    totalIncomeVat,
    totalIncomeWithVat: totalIncome + totalIncomeVat,
    totalExpense,
    totalExpenseVat,
    totalExpenseWithVat: totalExpense + totalExpenseVat,
    profit: totalIncome - totalExpense,
    profitWithVat: (totalIncome + totalIncomeVat) - (totalExpense + totalExpenseVat),
    margin: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
  }
}
