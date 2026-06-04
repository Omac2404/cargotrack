/**
 * Elleçleme kalemleri (handling) — depolama modunda kullanılır.
 * PHP cargotrack.php:11865 ELL_ITEMS'tan port.
 *
 * Veri modeli (storage_data.ell altında):
 *   _ellData[itemKey + '_sales']           // satış tutarı
 *   _ellData[itemKey + '_cost']            // maliyet tutarı
 *   _ellData[itemKey + '_sales_vat']       // satış KDV oranı ('0'..'20' veya 'custom')
 *   _ellData[itemKey + '_cost_vat']        // maliyet KDV oranı
 *   _ellData[itemKey + '_sales_vat_custom']// custom KDV oranı (custom seçilirse)
 *   _ellData[itemKey + '_cost_vat_custom']
 */

export interface HandlingItem {
  key: string
  label: string
  /** Eski form alan ID'leri (geriye uyumluluk) — kaydederken bunlar da güncellenir */
  legacy_sales_id?: string
  legacy_cost_id?: string
}

export const HANDLING_ITEMS: HandlingItem[] = [
  { key: 'ellecleme_filmleme', label: 'Filmleme' },
  { key: 'ellecleme_paletleme', label: 'Paletleme' },
  { key: 'ellecleme_etiketleme', label: 'Etiketleme' },
  { key: 'ellecleme_depo_giris', label: 'Depo Giriş (İndi)' },
  { key: 'ellecleme_depo_cikis', label: 'Depo Çıkış (Bindi)' },
  // Diğer: legacy compat
  { key: 'other', label: 'Diğer', legacy_sales_id: 'other_storage_fees', legacy_cost_id: 'handling_fee' },
]

export type HandlingData = Record<string, string | number>

/** Bir kalemin KDV oranını çöz (custom değer ya da hard-coded değer) */
export function getHandlingVatRate(data: HandlingData, itemKey: string, side: 'sales' | 'cost'): number {
  let v = data[`${itemKey}_${side}_vat`]
  if (v === undefined || v === '') v = '20'
  if (v === 'custom') {
    const c = parseFloat(String(data[`${itemKey}_${side}_vat_custom`] || ''))
    return isFinite(c) ? c : 0
  }
  const n = parseFloat(String(v))
  return isFinite(n) ? n : 0
}

/** Tek bir kalemin gelir/gider+KDV/kâr hesabı */
export function calcHandlingLineTotals(data: HandlingData, itemKey: string) {
  const sales = parseFloat(String(data[`${itemKey}_sales`] || '0')) || 0
  const cost = parseFloat(String(data[`${itemKey}_cost`] || '0')) || 0
  const salesVatRate = getHandlingVatRate(data, itemKey, 'sales')
  const costVatRate = getHandlingVatRate(data, itemKey, 'cost')
  return {
    sales,
    sales_vat: sales * (salesVatRate / 100),
    sales_total: sales + sales * (salesVatRate / 100),
    cost,
    cost_vat: cost * (costVatRate / 100),
    cost_total: cost + cost * (costVatRate / 100),
    profit: sales - cost,
    profit_with_vat: (sales + sales * (salesVatRate / 100)) - (cost + cost * (costVatRate / 100)),
  }
}

/** Toplam handling (elleçleme) — tüm kalemler */
export function calcHandlingTotals(data: HandlingData) {
  let totalSales = 0, totalSalesVat = 0
  let totalCost = 0, totalCostVat = 0
  for (const item of HANDLING_ITEMS) {
    const t = calcHandlingLineTotals(data, item.key)
    totalSales += t.sales
    totalSalesVat += t.sales_vat
    totalCost += t.cost
    totalCostVat += t.cost_vat
  }
  return {
    totalSales,
    totalSalesVat,
    totalSalesWithVat: totalSales + totalSalesVat,
    totalCost,
    totalCostVat,
    totalCostWithVat: totalCost + totalCostVat,
    profit: totalSales - totalCost,
    profitWithVat: (totalSales + totalSalesVat) - (totalCost + totalCostVat),
  }
}
