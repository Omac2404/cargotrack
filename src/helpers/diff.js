/**
 * Alan-bazlı değişiklik (diff) yardımcısı.
 *
 * `computeDiff(oldRow, newPartial, colDefs)`:
 *   - oldRow      → DB'den çekilmiş ham satır (mysql2 tipleri: Date, Number, JSON-parsed object, vs.)
 *   - newPartial  → buildDataRecord(input) çıktısı (zaten normalize edilmiş; json'lar stringified)
 *   - colDefs     → { [col]: { type: 'text'|'int'|'float'|'nfloat'|'bool'|'date'|'json'|'enum'|'email' } }
 *
 * Dönüş:
 *   {
 *     "client_billing": { from: "Eski Co", to: "Yeni Co" },
 *     "financial_data.nakliye.income": { from: 1000, to: 1200 },
 *     ...
 *   }
 *
 * JSON alanları (financial_data, mode_data, vs.) dot-notation ile flatten edilir;
 * sadece gerçekten değişen yaprak (leaf) anahtarlar diff'e girer.
 */

// İzlenmeyen alanlar — DB tarafından yönetilir veya değişmemesi gerekir
const ALWAYS_IGNORE = new Set([
  'shipment_no',     // create'te tek sefer üretilir
  'created_at',
  'updated_at',
  'created_by',
]);

function normalize(v, type) {
  if (v === null || v === undefined || v === '') return null;
  switch (type) {
    case 'int':
    case 'float':
    case 'nfloat': {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    case 'bool': {
      return (Number(v) === 1 || v === true || v === '1' || v === 'true') ? 1 : 0;
    }
    case 'date': {
      if (v instanceof Date) {
        if (isNaN(v.getTime())) return null;
        // Date'i YYYY-MM-DD'e çevir (yerel saat dilimi yerine UTC günü kullan; saat 00:00 kaydedildiğinden bu doğru olur)
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const s = String(v);
      return s.length >= 10 ? s.slice(0, 10) : null;
    }
    case 'json': {
      if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return v; }
      }
      return v;
    }
    case 'email':
    case 'text':
    case 'enum':
    default:
      return v == null ? null : String(v);
  }
}

const isPlainObject = (x) =>
  x !== null && typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date);

function flattenJsonDiff(oldVal, newVal, prefix, out) {
  // İki taraf da object değilse → primitive (veya array) compare
  if (!isPlainObject(oldVal) && !isPlainObject(newVal)) {
    const oldS = JSON.stringify(oldVal ?? null);
    const newS = JSON.stringify(newVal ?? null);
    if (oldS !== newS) {
      out[prefix] = { from: oldVal ?? null, to: newVal ?? null };
    }
    return;
  }
  const oldObj = isPlainObject(oldVal) ? oldVal : {};
  const newObj = isPlainObject(newVal) ? newVal : {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const k of allKeys) {
    flattenJsonDiff(oldObj[k], newObj[k], prefix ? `${prefix}.${k}` : k, out);
  }
}

function computeDiff(oldRow, newPartial, colDefs, extraIgnore = []) {
  const ignore = new Set([...ALWAYS_IGNORE, ...extraIgnore]);
  const diff = {};
  for (const [key, def] of Object.entries(colDefs)) {
    if (ignore.has(key)) continue;
    if (newPartial[key] === undefined) continue;

    const oldNorm = normalize(oldRow[key], def.type);
    const newNorm = normalize(newPartial[key], def.type);

    if (def.type === 'json') {
      flattenJsonDiff(oldNorm, newNorm, key, diff);
    } else {
      const oldS = oldNorm === null ? null : String(oldNorm);
      const newS = newNorm === null ? null : String(newNorm);
      if (oldS !== newS) {
        diff[key] = { from: oldNorm, to: newNorm };
      }
    }
  }
  return diff;
}

module.exports = { computeDiff, normalize };
