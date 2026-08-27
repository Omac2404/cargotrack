/**
 * financial_data JSON'undan alış/satış özetini hesaplar.
 *
 * Panel finansal sekmesindeki calcFinTotals ile AYNI kural:
 *  - Débours kalemleri (müşteri adına ödenen vergiler) ciroya dahil edilmez
 *  - KDV hariç (HT) tutarlar toplanır
 *
 * İstatistikler sale_price/purchase_price kolonlarından okunuyor; kullanıcı
 * kalemleri finansal sekmeye girdiği için bu kolonlar 0 kalıyor ve panodaki
 * ciro/kâr hep 0 görünüyordu. Kayıt sırasında ve açılışta buradan doldurulur.
 */

// frontend/src/lib/constants/finSchemas.ts DEBOURS_KEYS ile birebir aynı tutulmalı
const DEBOURS_KEYS = new Set([
  'ith_tva',
  'ith_droit_douane',
  'ith_taxe_parafiscal',
  'ith_anti_dumping',
  'ith_droit_porte',
]);

/**
 * @param {string|object|null} raw financial_data (JSON string ya da parse edilmiş nesne)
 * @returns {{income:number, expense:number}|null} kalem yoksa null
 */
function finSummaryTotals(raw) {
  let fin = raw;
  if (typeof fin === 'string') {
    if (!fin.trim()) return null;
    try { fin = JSON.parse(fin); } catch (e) { return null; }
  }
  if (!fin || typeof fin !== 'object' || Array.isArray(fin)) return null;

  let income = 0, expense = 0, any = false;
  for (const [key, entry] of Object.entries(fin)) {
    if (!entry || typeof entry !== 'object') continue;
    if (DEBOURS_KEYS.has(key)) continue;
    const inc = parseFloat(entry.income) || 0;
    const exp = parseFloat(entry.expense) || 0;
    if (inc || exp) any = true;
    income += inc;
    expense += exp;
  }
  return any ? { income: Math.round(income * 100) / 100, expense: Math.round(expense * 100) / 100 } : null;
}

module.exports = { finSummaryTotals };
