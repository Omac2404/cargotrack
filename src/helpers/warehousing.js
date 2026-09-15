/**
 * Sözleşmeli depoculuk (entreposage) hesaplama motoru.
 *
 * Saf fonksiyonlar — veritabanına dokunmaz; rota ve PDF aynı hesabı kullanır
 * ki ekrandaki döküm ile basılan döküm asla ayrışmasın.
 *
 * Palet-gün kuralı: bir gün için stok, o günün TÜM hareketleri işlendikten
 * sonraki miktardır. Böylece giriş günü sayılır, çıkış günü sayılmaz
 * (Fransız depoculuğunda yaygın uygulama).
 */

/** Depolama faturalama yöntemleri */
const STORAGE_BILLING = {
  pallet_day: { fr: 'Stockage — palette / jour', unit: 'palette-jour' },
  pallet_month_avg: { fr: 'Stockage — palette / mois (occupation moyenne)', unit: 'palette-mois' },
  pallet_month_peak: { fr: 'Stockage — palette / mois (pic d’occupation)', unit: 'palette-mois' },
  pallet_month_started: { fr: 'Stockage — palette / mois entamé', unit: 'palette-mois' },
  fixed_month: { fr: 'Stockage — forfait mensuel', unit: 'mois' },
};

/**
 * Depo hizmet türleri — tarife kolonu ve Fransızca fatura etiketi.
 * `custom` serbest etiket/fiyatla girilir.
 */
const SERVICE_TYPES = {
  order_prep: { rateCol: 'order_prep_rate', fr: 'Préparation de commandes', unit: 'commande' },
  order_line: { rateCol: 'order_line_rate', fr: 'Préparation — lignes / colis prélevés', unit: 'ligne' },
  labeling: { rateCol: 'label_rate', fr: 'Étiquetage', unit: 'étiquette' },
  filming: { rateCol: 'filming_rate', fr: 'Filmage', unit: 'palette' },
  palletizing: { rateCol: 'palletizing_rate', fr: 'Palettisation', unit: 'palette' },
  unloading: { rateCol: 'unloading_rate', fr: 'Dépotage / déchargement conteneur', unit: 'conteneur' },
  custom: { rateCol: null, fr: 'Prestation', unit: 'unité' },
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function isValidPeriod(period) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(period || ''));
}

/** 'YYYY-MM-DD' (yerel saat kayması olmadan) */
function toISODate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  // mysql2 DATE kolonlarını yerel gece yarısı Date olarak döndürür
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function periodBounds(period) {
  const [y, m] = period.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const start = `${period}-01`;
  const end = `${period}-${String(daysInMonth).padStart(2, '0')}`;
  return { year: y, month: m, daysInMonth, start, end };
}

/** Hareketin stoka etkisi (işaretli palet) */
function signedPallets(mv) {
  const p = parseInt(mv.pallets, 10) || 0;
  if (mv.direction === 'in') return Math.abs(p);
  if (mv.direction === 'out') return -Math.abs(p);
  return p; // adjust: işaretli girilir
}

function parseExtraServices(raw) {
  if (!raw) return [];
  let v = raw;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch (e) { return []; }
  }
  return Array.isArray(v)
    ? v.filter((x) => x && String(x.label || '').trim()).map((x) => ({
        label: String(x.label).trim(),
        unit: String(x.unit || '').trim(),
        price: Number(x.price) || 0,
      }))
    : [];
}

/**
 * Tüm hareketler üzerinden, her hareketten sonraki bakiyeyi hesaplar.
 * Tarih + id sırasına göre. Negatife düşen ilk noktayı da bildirir.
 */
function runningBalances(movements) {
  const sorted = [...movements].sort((a, b) => {
    const da = toISODate(a.movement_date), db = toISODate(b.movement_date);
    if (da !== db) return da < db ? -1 : 1;
    return (a.id || 0) - (b.id || 0);
  });
  let bal = 0;
  let firstNegative = null;
  // Aynı gün içindeki sıra, gün sonu stokunu değiştirmez; negatif kontrolü
  // gün sonu bakiyesine göre yapılır (gün içinde önce çıkış girilmiş olabilir).
  const endOfDay = new Map();
  const rows = sorted.map((mv) => {
    bal += signedPallets(mv);
    const d = toISODate(mv.movement_date);
    endOfDay.set(d, bal);
    return { ...mv, movement_date: d, balance_after: bal };
  });
  for (const [d, b] of endOfDay) {
    if (b < 0 && !firstNegative) firstNegative = { date: d, balance: b };
  }
  return { rows, balance: bal, firstNegative };
}

/**
 * Bir hesap + dönem için ay sonu dökümünü hesaplar.
 *
 * @param {object} account   wh_accounts satırı
 * @param {Array}  movements hesabın silinmemiş TÜM hareketleri (dönem sonuna kadar yeterli)
 * @param {Array}  services  hesabın dönem içindeki silinmemiş hizmetleri
 * @param {string} period    'YYYY-MM'
 * @param {string} [today]   'YYYY-MM-DD' — test için enjekte edilebilir
 */
function computeStatement(account, movements, services, period, today) {
  const { daysInMonth, start, end } = periodBounds(period);
  const todayISO = today || toISODate(new Date());
  // İçinde bulunulan ay: bugüne kadar hesaplanır (gelecek günler faturalanmaz)
  const partial = todayISO >= start && todayISO < end;
  const calcEnd = partial ? todayISO : end;
  const future = todayISO < start;

  const opening = movements
    .filter((mv) => toISODate(mv.movement_date) < start)
    .reduce((s, mv) => s + signedPallets(mv), 0);

  const inPeriod = movements
    .filter((mv) => {
      const d = toISODate(mv.movement_date);
      return d >= start && d <= end;
    })
    .sort((a, b) => {
      const da = toISODate(a.movement_date), db = toISODate(b.movement_date);
      if (da !== db) return da < db ? -1 : 1;
      return (a.id || 0) - (b.id || 0);
    });

  // Günlük stok serisi
  const byDay = new Map();
  for (const mv of inPeriod) {
    const d = toISODate(mv.movement_date);
    if (!byDay.has(d)) byDay.set(d, { in: 0, out: 0, adjust: 0 });
    const agg = byDay.get(d);
    const p = parseInt(mv.pallets, 10) || 0;
    if (mv.direction === 'in') agg.in += Math.abs(p);
    else if (mv.direction === 'out') agg.out += Math.abs(p);
    else agg.adjust += p;
  }

  const daily = [];
  let stock = opening;
  let palletDays = 0;
  let peak = Math.max(opening, 0);
  let daysCounted = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = `${period}-${String(day).padStart(2, '0')}`;
    const agg = byDay.get(d) || { in: 0, out: 0, adjust: 0 };
    stock += agg.in - agg.out + agg.adjust;
    const counted = !future && d <= calcEnd;
    if (counted) {
      palletDays += Math.max(stock, 0);
      peak = Math.max(peak, stock);
      daysCounted++;
    }
    daily.push({ date: d, in: agg.in, out: agg.out, adjust: agg.adjust, stock, counted });
  }

  const totalIn = inPeriod.filter((m) => m.direction === 'in').reduce((s, m) => s + Math.abs(parseInt(m.pallets, 10) || 0), 0);
  const totalOut = inPeriod.filter((m) => m.direction === 'out').reduce((s, m) => s + Math.abs(parseInt(m.pallets, 10) || 0), 0);
  const totalAdjust = inPeriod.filter((m) => m.direction === 'adjust').reduce((s, m) => s + (parseInt(m.pallets, 10) || 0), 0);
  const closing = opening + totalIn - totalOut + totalAdjust;
  const packagesIn = inPeriod.filter((m) => m.direction === 'in').reduce((s, m) => s + (parseInt(m.packages, 10) || 0), 0);
  const packagesOut = inPeriod.filter((m) => m.direction === 'out').reduce((s, m) => s + (parseInt(m.packages, 10) || 0), 0);

  // ---- Fatura satırları ----
  const lines = [];
  const pushLine = (code, label, quantity, unit, unitPrice, extra = {}) => {
    const qty = round2(quantity);
    const price = Number(unitPrice) || 0;
    lines.push({ code, label, quantity: qty, unit, unit_price: price, amount: round2(qty * price), ...extra });
  };

  const billing = STORAGE_BILLING[account.storage_billing] ? account.storage_billing : 'pallet_day';
  const rate = Number(account.storage_rate) || 0;
  let storageQty = 0;
  let storagePrice = rate;
  switch (billing) {
    case 'pallet_day': storageQty = palletDays; break;
    case 'pallet_month_avg': storageQty = daysInMonth ? palletDays / daysInMonth : 0; break;
    case 'pallet_month_peak': storageQty = peak; break;
    case 'pallet_month_started': storageQty = Math.max(opening, 0) + totalIn; break;
    case 'fixed_month':
      storageQty = future ? 0 : 1;
      storagePrice = Number(account.fixed_monthly_fee) || 0;
      break;
    default: break;
  }
  if (storageQty > 0 || storagePrice > 0) {
    pushLine('storage', STORAGE_BILLING[billing].fr, storageQty, STORAGE_BILLING[billing].unit, storagePrice);
  }
  const storageAmount = lines.length ? lines[lines.length - 1].amount : 0;
  const minFee = Number(account.min_monthly_fee) || 0;
  if (minFee > 0 && !future && storageAmount < minFee) {
    pushLine('storage_min', 'Complément minimum mensuel de stockage', 1, 'forfait', round2(minFee - storageAmount));
  }

  if (totalIn > 0 && Number(account.in_rate) > 0) {
    pushLine('handling_in', 'Manutention entrée (réception)', totalIn, 'palette', account.in_rate);
  }
  if (totalOut > 0 && Number(account.out_rate) > 0) {
    pushLine('handling_out', 'Manutention sortie (expédition)', totalOut, 'palette', account.out_rate);
  }

  // Hizmetler: tür + etiket + birim fiyat bazında gruplanır
  const groups = new Map();
  for (const sv of services) {
    const type = SERVICE_TYPES[sv.service_type] ? sv.service_type : 'custom';
    const def = SERVICE_TYPES[type];
    const label = type === 'custom' ? (String(sv.label || '').trim() || def.fr) : def.fr;
    const unit = String(sv.unit || '').trim() || def.unit;
    const price = Number(sv.unit_price) || 0;
    const key = `${type}|${label}|${unit}|${price}`;
    if (!groups.has(key)) groups.set(key, { type, label, unit, price, qty: 0, count: 0 });
    const g = groups.get(key);
    g.qty += Number(sv.quantity) || 0;
    g.count++;
  }
  for (const g of groups.values()) {
    if (g.qty > 0) pushLine(`service_${g.type}`, g.label, g.qty, g.unit, g.price, { entries: g.count });
  }

  const totalHt = round2(lines.reduce((s, l) => s + l.amount, 0));
  const vatRate = account.vat_rate === null || account.vat_rate === undefined || account.vat_rate === ''
    ? 20 : Number(account.vat_rate);
  const totalVat = round2(totalHt * (vatRate / 100));

  return {
    period,
    period_start: start,
    period_end: end,
    days_in_month: daysInMonth,
    days_counted: daysCounted,
    partial,
    calculated_until: future ? null : calcEnd,
    currency: account.currency_code || 'EUR',
    vat_rate: vatRate,
    stock: {
      opening,
      in: totalIn,
      out: totalOut,
      adjust: totalAdjust,
      closing,
      peak,
      pallet_days: palletDays,
      average: daysInMonth ? round2(palletDays / daysInMonth) : 0,
      packages_in: packagesIn,
      packages_out: packagesOut,
    },
    storage_billing: billing,
    lines,
    total_ht: totalHt,
    total_vat: totalVat,
    total_ttc: round2(totalHt + totalVat),
    daily,
    movements: inPeriod.map((m) => ({
      id: m.id,
      date: toISODate(m.movement_date),
      direction: m.direction,
      pallets: parseInt(m.pallets, 10) || 0,
      packages: m.packages === null || m.packages === undefined ? null : parseInt(m.packages, 10),
      weight_kg: m.weight_kg === null || m.weight_kg === undefined ? null : Number(m.weight_kg),
      reference: m.reference || '',
      product: m.product || '',
      notes: m.notes || '',
    })),
    services: services.map((sv) => ({
      id: sv.id,
      date: toISODate(sv.service_date),
      service_type: sv.service_type,
      label: sv.label || '',
      unit: sv.unit || '',
      quantity: Number(sv.quantity) || 0,
      unit_price: Number(sv.unit_price) || 0,
      amount: round2((Number(sv.quantity) || 0) * (Number(sv.unit_price) || 0)),
      reference: sv.reference || '',
    })),
  };
}

function statementNumber(account, period) {
  const code = String(account.account_code || `DEP-${account.id}`).replace(/[^A-Za-z0-9]/g, '');
  return `REL-${code}-${period.replace('-', '')}`;
}

module.exports = {
  STORAGE_BILLING,
  SERVICE_TYPES,
  isValidPeriod,
  periodBounds,
  toISODate,
  signedPallets,
  runningBalances,
  computeStatement,
  statementNumber,
  parseExtraServices,
  round2,
};
