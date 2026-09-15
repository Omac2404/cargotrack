/**
 * Sözleşmeli depoculuk PDF'leri (Fransızca):
 *   GET /api/pdf/wh-statement/:accountId?period=YYYY-MM  — Relevé mensuel d'entreposage
 *   GET /api/pdf/wh-stock/:accountId?from&to             — Fiche de stock (hareket defteri)
 */
const express = require('express');
const PDFDocument = require('pdfkit');
const { pool } = require('../config/database');
const { COMPANY, addressLines, legalFooterLines } = require('../config/company');
const { logAudit } = require('../helpers/audit');
const { sendError, toInt, toNullableDate } = require('../helpers/utils');
const W = require('../helpers/warehousing');
const { buildStatement, loadAccount } = require('./warehousing');
const {
  verifyTokenFlexible, setupFonts, setupPdfHeaders,
  letterheadFile, letterheadRatio, COLORS, formatFr, CURRENCY_SYMBOL,
} = require('./pdf').shared;
const { can } = require('../config/permissions');

const router = express.Router();

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40;
const CONTENT_W = PAGE_W - M * 2;
const BOTTOM_LIMIT = PAGE_H - 70;

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DIRECTION_FR = { in: 'Entrée', out: 'Sortie', adjust: 'Ajustement' };
const STATUS_FR = { draft: 'BROUILLON', issued: 'ÉMIS', paid: 'PAYÉ' };

const frDate = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
const periodFr = (period) => {
  const [y, m] = period.split('-').map(Number);
  const name = MONTHS_FR[m - 1] || '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
};

function requireRead(req, res) {
  if (!can(req.user, 'warehousing.read')) {
    sendError(res, 'Accès refusé (warehousing.read)', 403);
    return false;
  }
  return true;
}

/** Antet + sağ üst başlık bloğu; içerik başlangıç y'sini döner */
function drawHeader(doc, F, title, rightLines) {
  let leftBottom = 48;
  if (letterheadFile) {
    const LW = 140;
    doc.image(letterheadFile, M, 34, { width: LW });
    leftBottom = 34 + Math.round(LW * letterheadRatio);
  } else {
    doc.font(F.bold).fontSize(15).fillColor(COLORS.text).text(COMPANY.name, M, 40, { width: 260 });
    let y = 60;
    doc.font(F.regular).fontSize(8).fillColor(COLORS.textMuted);
    for (const l of addressLines()) { doc.text(l, M, y, { width: 260, lineBreak: false }); y += 10; }
    leftBottom = y;
  }

  const RX = 200, RW = PAGE_W - M - RX;
  // Baslik tek satira sigana kadar kucultulur (sarip alt satirlarin ustune binmesin)
  let titleSize = 17;
  doc.font(F.bold);
  while (titleSize > 11 && doc.fontSize(titleSize).widthOfString(title) > RW) titleSize -= 0.5;
  doc.fontSize(titleSize).fillColor(COLORS.primary)
    .text(title, RX, 42, { width: RW, align: 'right', lineBreak: false });
  let ry = 66;
  for (const [label, value, bold] of rightLines) {
    doc.font(F.regular).fontSize(8).fillColor(COLORS.textMuted)
      .text(label, RX, ry, { width: RW - 130, align: 'right', lineBreak: false });
    doc.font(bold ? F.bold : F.regular).fontSize(9).fillColor(COLORS.text)
      .text(value, PAGE_W - M - 125, ry - 1, { width: 125, align: 'right', lineBreak: false, ellipsis: true });
    ry += 13;
  }
  const y = Math.max(leftBottom, ry) + 10;
  doc.moveTo(M, y).lineTo(PAGE_W - M, y).lineWidth(1).strokeColor(COLORS.primary).stroke();
  return y + 12;
}

/** Tüm sayfalara yasal künye + sayfa numarası + (varsa) filigran */
function finalizePages(doc, F, watermark) {
  const legal = legalFooterLines();
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    let ly = PAGE_H - 22 - legal.length * 10;
    doc.moveTo(M, ly - 8).lineTo(PAGE_W - M, ly - 8).lineWidth(0.5).strokeColor(COLORS.borderLight).stroke();
    doc.font(F.bold).fontSize(7).fillColor(COLORS.primary);
    for (const line of legal) {
      doc.text(line, M, ly, { width: CONTENT_W, align: 'center', lineBreak: false });
      ly += 10;
    }
    doc.font(F.regular).fontSize(7).fillColor(COLORS.textLight)
      .text(`Page ${i - range.start + 1} / ${range.count}`, M, PAGE_H - 14, { width: CONTENT_W, align: 'right', lineBreak: false });
    if (watermark) {
      doc.save();
      doc.opacity(0.07);
      let wmSize = 96;
      doc.font(F.bold);
      while (wmSize > 40 && doc.fontSize(wmSize).widthOfString(watermark) > PAGE_W * 0.95) wmSize -= 4;
      doc.fontSize(wmSize).fillColor(COLORS.primary);
      doc.rotate(-28, { origin: [PAGE_W / 2, PAGE_H / 2] });
      doc.text(watermark, 0, PAGE_H / 2 - wmSize / 2, { width: PAGE_W, align: 'center', lineBreak: false });
      doc.restore();
      doc.opacity(1);
    }
  }
}

/** Basit tablo: başlık + satırlar, sayfa taşmasında başlığı tekrarlar */
function drawTable(doc, F, y, columns, rows, opts = {}) {
  const headH = 18;
  const rowH = opts.rowH || 15;
  const drawHead = (hy) => {
    doc.rect(M, hy, CONTENT_W, headH).fill(COLORS.primary);
    let x = M;
    doc.font(F.bold).fontSize(7.5).fillColor('#ffffff');
    for (const c of columns) {
      doc.text(c.label, x + 4, hy + 5, { width: c.w - 8, align: c.align || 'left', lineBreak: false, ellipsis: true });
      x += c.w;
    }
    return hy + headH;
  };
  y = drawHead(y);
  rows.forEach((r, idx) => {
    if (y + rowH > BOTTOM_LIMIT) {
      doc.addPage();
      y = drawHead(M);
    }
    if (idx % 2 === 1) doc.rect(M, y, CONTENT_W, rowH).fill('#f8fafc');
    let x = M;
    for (const c of columns) {
      const v = typeof c.value === 'function' ? c.value(r) : r[c.key];
      const style = typeof c.style === 'function' ? c.style(r) : {};
      doc.font(style.bold || c.bold ? F.bold : F.regular).fontSize(8).fillColor(style.color || COLORS.text)
        .text(v === null || v === undefined || v === '' ? '—' : String(v), x + 4, y + 4, {
          width: c.w - 8, align: c.align || 'left', lineBreak: false, ellipsis: true,
        });
      x += c.w;
    }
    doc.moveTo(M, y + rowH).lineTo(PAGE_W - M, y + rowH).lineWidth(0.4).strokeColor(COLORS.borderLight).stroke();
    y += rowH;
  });
  return y;
}

function ensureSpace(doc, y, needed) {
  if (y + needed > BOTTOM_LIMIT) { doc.addPage(); return M; }
  return y;
}

function sectionTitle(doc, F, y, text) {
  doc.font(F.bold).fontSize(9).fillColor(COLORS.textMuted).text(text.toUpperCase(), M, y, { characterSpacing: 0.6, lineBreak: false });
  return y + 15;
}

// ============================================================
// Relevé mensuel d'entreposage
// ============================================================
router.get('/wh-statement/:accountId', verifyTokenFlexible, async (req, res) => {
  try {
    if (!requireRead(req, res)) return;
    const acc = await loadAccount(toInt(req.params.accountId));
    if (!acc) return sendError(res, 'Compte introuvable', 404);
    const period = W.isValidPeriod(req.query.period) ? req.query.period : W.toISODate(new Date()).slice(0, 7);

    const [saved] = await pool.execute('SELECT * FROM wh_statements WHERE account_id = ? AND period = ? LIMIT 1', [acc.id, period]);
    const record = saved[0] || null;
    let st = null;
    if (record && record.status !== 'draft' && record.snapshot) {
      try { st = JSON.parse(record.snapshot); } catch (e) { st = null; }
    }
    if (!st) st = await buildStatement(acc, period);

    const statementNo = record ? record.statement_no : W.statementNumber(acc, period);
    const cur = st.currency || acc.currency_code || 'EUR';
    const sym = CURRENCY_SYMBOL[cur] || cur;
    const money = (n) => `${formatFr(n)} ${sym}`;

    setupPdfHeaders(res, `Releve_${statementNo}.pdf`);
    await logAudit(req, 'download', 'warehousing', acc.id, `releve/${statementNo}`);

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    doc.pipe(res);
    const F = setupFonts(doc);

    const statusLabel = record ? STATUS_FR[record.status] : 'PROVISOIRE';
    let y = drawHeader(doc, F, "RELEVÉ MENSUEL D'ENTREPOSAGE", [
      ['N° de relevé', statementNo, true],
      ['Période', periodFr(period), true],
      ["Date d'édition", frDate(W.toISODate(new Date()))],
      ['Statut', statusLabel],
      ...(record && record.invoice_no ? [['N° de facture', record.invoice_no, true]] : []),
    ]);

    // ---- Müşteri / sözleşme kartı ----
    const cardH = 74;
    doc.roundedRect(M, y, CONTENT_W, cardH, 6).lineWidth(0.8).strokeColor(COLORS.borderLight).fillColor('#f8fafc').fillAndStroke();
    const colL = M + 14, colR = M + CONTENT_W / 2 + 10, colW = CONTENT_W / 2 - 24;
    const info = (label, value, x, iy) => {
      doc.font(F.bold).fontSize(7).fillColor(COLORS.textLight).text(label.toUpperCase(), x, iy, { characterSpacing: 0.4, lineBreak: false });
      doc.font(F.bold).fontSize(10).fillColor(COLORS.text).text(value || '—', x, iy + 9, { width: colW, lineBreak: false, ellipsis: true });
    };
    info('Client', acc.client_name, colL, y + 10);
    info('Compte', acc.account_code || `#${acc.id}`, colR, y + 10);
    info('Entrepôt', acc.warehouse, colL, y + 40);
    info('Mode de facturation du stockage', (W.STORAGE_BILLING[st.storage_billing] || {}).fr?.replace('Stockage — ', '') || '—', colR, y + 40);
    y += cardH + 12;

    if (st.partial) {
      doc.font(F.italic).fontSize(8).fillColor('#b45309')
        .text(`Mois en cours — calcul arrêté au ${frDate(st.calculated_until)} (${st.days_counted} jour(s) sur ${st.days_in_month}).`, M, y, { width: CONTENT_W });
      y += 14;
    }

    // ---- Stok özeti bandı ----
    y = sectionTitle(doc, F, y, 'Synthèse du stock (palettes)');
    const stats = [
      ['Stock initial', st.stock.opening],
      ['Entrées', st.stock.in ? `+${st.stock.in}` : 0],
      ['Sorties', st.stock.out ? `-${st.stock.out}` : 0],
      ['Ajustements', st.stock.adjust > 0 ? `+${st.stock.adjust}` : st.stock.adjust],
      ['Stock final', st.stock.closing],
      ['Pic', st.stock.peak],
      ['Palettes-jours', formatFr(st.stock.pallet_days, 0)],
    ];
    const cellW = CONTENT_W / stats.length;
    doc.rect(M, y, CONTENT_W, 38).fill(COLORS.primaryFaint);
    stats.forEach(([label, value], i) => {
      const x = M + i * cellW;
      doc.font(F.regular).fontSize(7).fillColor(COLORS.textMuted).text(label, x, y + 6, { width: cellW, align: 'center', lineBreak: false });
      doc.font(F.bold).fontSize(12).fillColor(COLORS.primary).text(String(value), x, y + 18, { width: cellW, align: 'center', lineBreak: false });
    });
    y += 38 + 6;
    doc.font(F.regular).fontSize(7).fillColor(COLORS.textLight)
      .text(`Occupation moyenne : ${formatFr(st.stock.average)} palette(s) · Colis entrés : ${st.stock.packages_in || 0} · Colis sortis : ${st.stock.packages_out || 0}`, M, y, { width: CONTENT_W, lineBreak: false });
    y += 18;

    // ---- Faturalanan kalemler ----
    y = sectionTitle(doc, F, y, 'Prestations facturées');
    const chargeCols = [
      { label: 'Désignation', key: 'label', w: 235 },
      { label: 'Quantité', w: 65, align: 'right', value: (r) => formatFr(r.quantity, Number.isInteger(r.quantity) ? 0 : 2) },
      { label: 'Unité', key: 'unit', w: 70 },
      { label: 'P.U. HT', w: 65, align: 'right', value: (r) => formatFr(r.unit_price, r.unit_price < 1 && r.unit_price > 0 ? 4 : 2) },
      { label: `Montant HT (${cur})`, w: CONTENT_W - 435, align: 'right', bold: true, value: (r) => formatFr(r.amount) },
    ];
    if (st.lines.length) {
      y = drawTable(doc, F, y, chargeCols, st.lines, { rowH: 17 });
    } else {
      doc.font(F.italic).fontSize(9).fillColor(COLORS.textLight).text('Aucune prestation sur la période.', M, y + 4);
      y += 20;
    }

    // ---- Toplamlar ----
    y = ensureSpace(doc, y + 10, 70);
    const TX = PAGE_W - M - 230;
    const totalRow = (label, value, strong) => {
      doc.font(strong ? F.bold : F.regular).fontSize(strong ? 12 : 9.5).fillColor(strong ? COLORS.primary : COLORS.text)
        .text(label, TX, y, { width: 120, lineBreak: false });
      doc.font(F.bold).fontSize(strong ? 12 : 9.5).fillColor(strong ? COLORS.primary : COLORS.text)
        .text(value, TX + 110, y, { width: 120, align: 'right', lineBreak: false });
      y += strong ? 18 : 14;
    };
    totalRow('Total HT', money(st.total_ht));
    totalRow(`TVA ${formatFr(st.vat_rate, st.vat_rate % 1 ? 2 : 0)} %`, money(st.total_vat));
    doc.moveTo(TX, y + 1).lineTo(PAGE_W - M, y + 1).lineWidth(1).strokeColor(COLORS.primary).stroke();
    y += 6;
    totalRow('Total TTC', money(st.total_ttc), true);
    if (acc.payment_terms) {
      doc.font(F.regular).fontSize(8).fillColor(COLORS.textMuted).text(`Conditions de paiement : ${acc.payment_terms}`, M, y + 4, { width: CONTENT_W });
      y += 16;
    }

    // ---- Hareket detayı ----
    y = ensureSpace(doc, y + 16, 60);
    y = sectionTitle(doc, F, y, `Détail des mouvements — ${periodFr(period)}`);
    let bal = st.stock.opening;
    const mvRows = st.movements.map((m) => {
      bal += m.direction === 'in' ? Math.abs(m.pallets) : m.direction === 'out' ? -Math.abs(m.pallets) : m.pallets;
      return { ...m, balance: bal };
    });
    if (mvRows.length) {
      y = drawTable(doc, F, y, [
        { label: 'Date', w: 58, value: (r) => frDate(r.date) },
        { label: 'Type', w: 62, value: (r) => DIRECTION_FR[r.direction], style: (r) => ({ color: r.direction === 'in' ? '#059669' : r.direction === 'out' ? '#dc2626' : COLORS.textMuted, bold: true }) },
        { label: 'Palettes', w: 50, align: 'right', value: (r) => (r.direction === 'out' ? `-${Math.abs(r.pallets)}` : r.direction === 'in' ? `+${Math.abs(r.pallets)}` : r.pallets) },
        { label: 'Colis', w: 42, align: 'right', value: (r) => r.packages },
        { label: 'Poids kg', w: 55, align: 'right', value: (r) => (r.weight_kg === null ? '' : formatFr(r.weight_kg, 0)) },
        { label: 'Référence', w: 90, key: 'reference' },
        { label: 'Produit / observations', w: CONTENT_W - 407, value: (r) => [r.product, r.notes].filter(Boolean).join(' — ') },
        { label: 'Solde', w: 50, align: 'right', bold: true, key: 'balance' },
      ], mvRows);
    } else {
      doc.font(F.italic).fontSize(9).fillColor(COLORS.textLight).text('Aucun mouvement sur la période.', M, y + 4);
      y += 20;
    }

    // ---- Hizmet detayı ----
    if (st.services.length) {
      y = ensureSpace(doc, y + 16, 60);
      y = sectionTitle(doc, F, y, 'Détail des prestations logistiques');
      y = drawTable(doc, F, y, [
        { label: 'Date', w: 58, value: (r) => frDate(r.date) },
        { label: 'Prestation', w: 170, value: (r) => (r.service_type === 'custom' ? r.label : (W.SERVICE_TYPES[r.service_type] || {}).fr) || r.label },
        { label: 'Quantité', w: 55, align: 'right', value: (r) => formatFr(r.quantity, Number.isInteger(r.quantity) ? 0 : 2) },
        { label: 'P.U. HT', w: 60, align: 'right', value: (r) => formatFr(r.unit_price, r.unit_price < 1 && r.unit_price > 0 ? 4 : 2) },
        { label: 'Montant HT', w: 70, align: 'right', bold: true, value: (r) => formatFr(r.amount) },
        { label: 'Référence', w: CONTENT_W - 413, key: 'reference' },
      ], st.services);
    }

    const watermark = !record ? 'PROVISOIRE' : record.status === 'draft' ? 'BROUILLON' : null;
    finalizePages(doc, F, watermark);
    doc.end();
  } catch (err) {
    console.error('[pdf/wh-statement]', err);
    if (!res.headersSent) sendError(res, 'PDF impossible', 500);
  }
});

// ============================================================
// Fiche de stock — hareket defteri (tarih aralığı)
// ============================================================
router.get('/wh-stock/:accountId', verifyTokenFlexible, async (req, res) => {
  try {
    if (!requireRead(req, res)) return;
    const acc = await loadAccount(toInt(req.params.accountId));
    if (!acc) return sendError(res, 'Compte introuvable', 404);
    const from = toNullableDate(req.query.from);
    const to = toNullableDate(req.query.to);

    const [all] = await pool.execute(
      'SELECT * FROM wh_movements WHERE account_id = ? AND deleted_at IS NULL ORDER BY movement_date ASC, id ASC', [acc.id]
    );
    const { rows, balance } = W.runningBalances(all);
    const opening = from ? rows.filter((r) => r.movement_date < from).reduce((s, r) => s + W.signedPallets(r), 0) : 0;
    const list = rows.filter((r) => (!from || r.movement_date >= from) && (!to || r.movement_date <= to));

    setupPdfHeaders(res, `Fiche_stock_${acc.account_code || acc.id}.pdf`);
    await logAudit(req, 'download', 'warehousing', acc.id, `fiche-stock/${acc.account_code}`);

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    doc.pipe(res);
    const F = setupFonts(doc);

    let y = drawHeader(doc, F, 'FICHE DE STOCK', [
      ['Client', acc.client_name, true],
      ['Compte', acc.account_code || `#${acc.id}`],
      ['Période', `${from ? frDate(from) : 'début'} → ${to ? frDate(to) : frDate(W.toISODate(new Date()))}`],
      ["Date d'édition", frDate(W.toISODate(new Date()))],
    ]);

    const inSum = list.filter((r) => r.direction === 'in').reduce((s, r) => s + Math.abs(r.pallets), 0);
    const outSum = list.filter((r) => r.direction === 'out').reduce((s, r) => s + Math.abs(r.pallets), 0);
    const endBal = list.length ? list[list.length - 1].balance_after : opening;
    const stats = [['Stock au début', opening], ['Entrées', inSum ? `+${inSum}` : 0], ['Sorties', outSum ? `-${outSum}` : 0], ['Stock en fin de période', endBal], ['Stock actuel', balance]];
    const cellW = CONTENT_W / stats.length;
    doc.rect(M, y, CONTENT_W, 38).fill(COLORS.primaryFaint);
    stats.forEach(([label, value], i) => {
      const x = M + i * cellW;
      doc.font(F.regular).fontSize(7).fillColor(COLORS.textMuted).text(label, x, y + 6, { width: cellW, align: 'center', lineBreak: false });
      doc.font(F.bold).fontSize(12).fillColor(COLORS.primary).text(String(value), x, y + 18, { width: cellW, align: 'center', lineBreak: false });
    });
    y += 50;

    if (list.length) {
      drawTable(doc, F, y, [
        { label: 'Date', w: 58, value: (r) => frDate(r.movement_date) },
        { label: 'Type', w: 62, value: (r) => DIRECTION_FR[r.direction], style: (r) => ({ color: r.direction === 'in' ? '#059669' : r.direction === 'out' ? '#dc2626' : COLORS.textMuted, bold: true }) },
        { label: 'Palettes', w: 50, align: 'right', value: (r) => (r.direction === 'out' ? `-${Math.abs(r.pallets)}` : r.direction === 'in' ? `+${Math.abs(r.pallets)}` : r.pallets) },
        { label: 'Colis', w: 42, align: 'right', value: (r) => r.packages },
        { label: 'Poids kg', w: 55, align: 'right', value: (r) => (r.weight_kg === null || r.weight_kg === undefined ? '' : formatFr(r.weight_kg, 0)) },
        { label: 'Référence', w: 90, key: 'reference' },
        { label: 'Produit / observations', w: CONTENT_W - 407, value: (r) => [r.product, r.notes].filter(Boolean).join(' — ') },
        { label: 'Solde', w: 50, align: 'right', bold: true, key: 'balance_after' },
      ], list);
    } else {
      doc.font(F.italic).fontSize(9).fillColor(COLORS.textLight).text('Aucun mouvement sur la période.', M, y);
    }

    finalizePages(doc, F, null);
    doc.end();
  } catch (err) {
    console.error('[pdf/wh-stock]', err);
    if (!res.headersSent) sendError(res, 'PDF impossible', 500);
  }
});

module.exports = router;
