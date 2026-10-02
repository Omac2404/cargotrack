/**
 * ATR / EUR.1 dolaşım belgesi yazdırma.
 *
 *   GET /api/pdf/certificate/:id?dx=0&dy=0&grid=0
 *
 * Belgeler matbu (önceden basılı, yeşil) formlara doldurulduğu için PDF
 * SADECE metinleri basar. Kutu koordinatları, müşterinin gönderdiği BOŞ
 * formların (CERFA 10526*01 A.TR. ve 11009*01 EUR.1) taramaları piksel
 * piksel ölçülerek çıkarıldı; çerçeve 182 × 280 mm ve A4'te ortalı.
 *
 *   dx / dy : yazıcıya göre tüm baskıyı milimetre kaydırır (kalibrasyon)
 *   grid=1  : form çerçevesini ve kutu çizgilerini de çizer; boş kağıda basıp
 *             matbu formla üst üste tutarak hizayı kontrol etmek için.
 *
 * Belge numarası (A 575914 gibi) forma zaten basılı geldiği için YAZILMAZ;
 * sistemde sadece kayıt ve arama için tutulur.
 */
const express = require('express');
const PDFDocument = require('pdfkit');
const { logAudit } = require('../helpers/audit');
const { sendError, toInt } = require('../helpers/utils');
const { loadCertificate } = require('./certificates');
const { verifyTokenFlexible, setupFonts, setupPdfHeaders } = require('./pdf').shared;
const { can } = require('../config/permissions');

const router = express.Router();

const MM = 2.834645669; // 1 mm → pt
const mm = (v) => v * MM;

const frDate = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

// Form çerçevesinin kağıttaki yeri (A4'te ortalı: (210-182)/2 = 14)
const FRAME = { x: 14, y: 9, w: 182, h: 280 };

/**
 * Alanlar — koordinatlar ÇERÇEVEYE GÖRE milimetre (sol üst köşe 0,0).
 *   lines/lh : çok satırlı alanlarda satır sayısı ve satır yüksekliği
 *   date     : gg/aa/yyyy biçiminde basılır
 */
const LAYOUT = {
  atr: {
    title: 'A.TR.',
    // Kontrol çizimi için kutu çizgileri: [x1, y1, x2, y2]
    rules: [
      [0, 0, 182, 0], [0, 280, 182, 280], [0, 0, 0, 280], [182, 0, 182, 280],
      [90.4, 0, 90.4, 102.3], [0, 102.3, 182, 102.3],
      [90.4, 9.1, 182, 9.1], [90.4, 16.9, 182, 16.9], [90.4, 25.9, 182, 25.9],
      [0, 25.9, 90.4, 25.9], [90.4, 51, 182, 51], [0, 68.2, 182, 68.2],
      [136.6, 51, 136.6, 68.2], [159.9, 102.3, 159.9, 225.8],
      [0, 225.8, 182, 225.8], [114.1, 225.8, 114.1, 280],
    ],
    fields: {
      exporter:            { x: 3,    y: 7,     w: 84, size: 8.5, lines: 4, lh: 4.3 },
      transport_doc_no:    { x: 102,  y: 21.4,  w: 42, size: 8 },
      transport_doc_date:  { x: 158,  y: 21.4,  w: 21, size: 8, date: true },
      consignee:           { x: 3,    y: 32,    w: 84, size: 8.5, lines: 7, lh: 4.3 },
      export_country:      { x: 93,   y: 58.5,  w: 41, size: 9 },
      destination_country: { x: 139,  y: 58.5,  w: 40, size: 9 },
      transport_info:      { x: 3,    y: 75,    w: 84, size: 8.5, lines: 5, lh: 4.3 },
      observations:        { x: 93,   y: 75,    w: 85, size: 8.5, lines: 5, lh: 4.3 },
      order_no:            { x: -11,  y: 112,   w: 9,  size: 8.5 },
      goods_description:   { x: 3,    y: 113,   w: 153, size: 9, lines: 23, lh: 4.6 },
      gross_weight:        { x: 161,  y: 124,   w: 19, size: 8.5 },
      customs_doc_model:   { x: 16,   y: 243.1, w: 20, size: 8 },
      customs_doc_no:      { x: 41,   y: 243.1, w: 30, size: 8 },
      customs_doc_date:    { x: 10,   y: 247.3, w: 25, size: 8, date: true },
      customs_office:      { x: 34,   y: 252.3, w: 32, size: 8 },
      issue_country:       { x: 30,   y: 256.2, w: 36, size: 8 },
      issue_place:         { x: 8,    y: 264.6, w: 24, size: 8 },
      issue_date:          { x: 39,   y: 264.6, w: 26, size: 8, date: true },
      declaration_place:   { x: 124,  y: 255.3, w: 33, size: 8 },
      declaration_date:    { x: 162,  y: 255.3, w: 17, size: 8, date: true },
    },
  },

  eur1: {
    title: 'EUR.1',
    rules: [
      [0, 0, 182, 0], [0, 280, 182, 280], [0, 0, 0, 280], [182, 0, 182, 280],
      [91.6, 0, 91.6, 102.5], [0, 102.5, 182, 102.5],
      [91.6, 8, 182, 8], [91.6, 17, 182, 17], [0, 25.2, 91.6, 25.2],
      [91.6, 51.1, 182, 51.1], [136.6, 51.1, 136.6, 72.2], [0, 72.2, 182, 72.2],
      [137.1, 102.5, 137.1, 229.8], [160, 102.5, 160, 229.8],
      [0, 229.8, 182, 229.8], [114.5, 229.8, 114.5, 280],
    ],
    fields: {
      exporter:            { x: 3,    y: 7,     w: 85, size: 8.5, lines: 4, lh: 4.3 },
      pref_from:           { x: 100,  y: 30.7,  w: 76, size: 8.5 },
      pref_to:             { x: 100,  y: 42.7,  w: 76, size: 8.5 },
      consignee:           { x: 3,    y: 31,    w: 85, size: 8.5, lines: 8, lh: 4.3 },
      origin_country:      { x: 93,   y: 65,    w: 41, size: 9 },
      destination_country: { x: 139,  y: 65,    w: 40, size: 9 },
      transport_info:      { x: 3,    y: 78,    w: 85, size: 8.5, lines: 5, lh: 4.3 },
      observations:        { x: 94,   y: 78,    w: 85, size: 8.5, lines: 5, lh: 4.3 },
      order_no:            { x: 3,    y: 109,   w: 9,  size: 8.5 },
      goods_description:   { x: 14,   y: 109,   w: 120, size: 9, lines: 25, lh: 4.6 },
      gross_weight:        { x: 139,  y: 127,   w: 19, size: 8.5 },
      invoice_ref:         { x: 162,  y: 118,   w: 18, size: 8, lines: 3, lh: 4 },
      customs_doc_model:   { x: 20,   y: 244.3, w: 20, size: 8 },
      customs_doc_no:      { x: 44,   y: 244.3, w: 28, size: 8 },
      customs_doc_date:    { x: 14,   y: 248.5, w: 23, size: 8, date: true },
      customs_office:      { x: 33,   y: 252.8, w: 33, size: 8 },
      issue_country:       { x: 51,   y: 256.5, w: 16, size: 8 },
      issue_place:         { x: 11,   y: 265.8, w: 23, size: 8 },
      issue_date:          { x: 42,   y: 265.8, w: 24, size: 8, date: true },
      declaration_place:   { x: 127,  y: 255.1, w: 33, size: 8 },
      declaration_date:    { x: 169,  y: 255.1, w: 12, size: 8, date: true },
    },
  },
};

/** Değeri kutuya sığacak şekilde (gerekirse küçülterek) yazar */
function drawValue(doc, F, cfg, value, dx, dy) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return;

  const x = mm(FRAME.x + cfg.x + dx);
  const y = mm(FRAME.y + cfg.y + dy);
  const width = mm(cfg.w);
  const maxLines = cfg.lines || 1;
  const lineHeight = mm(cfg.lh || 4.3);

  // Elle girilen satır sonları korunur, uzun satırlar kutuya göre bölünür
  const raw = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  let size = cfg.size || 9;
  doc.font(F.bold);

  const wrap = (s, fontSize) => {
    doc.fontSize(fontSize);
    const words = s.split(/\s+/);
    const out = [];
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (doc.widthOfString(next) > width && line) { out.push(line); line = w; }
      else line = next;
    }
    if (line) out.push(line);
    return out;
  };

  let lines;
  if (maxLines === 1) {
    // Tek satirlik kutular (gumruk beyan no gibi): satir bolunmez, punto kucultulur
    const one = raw.join(' ');
    doc.fontSize(size);
    while (size > 5.5 && doc.widthOfString(one) > width) { size -= 0.25; doc.fontSize(size); }
    lines = [one];
  } else {
    lines = raw.flatMap((l) => wrap(l, size));
    while (lines.length > maxLines && size > (cfg.size || 9) - 2.5) {
      size -= 0.5;
      lines = raw.flatMap((l) => wrap(l, size));
    }
    lines = lines.slice(0, maxLines);
  }

  doc.fontSize(size).fillColor('#000000');
  lines.forEach((l, i) => {
    doc.text(l, x, y + i * lineHeight, { width, lineBreak: false });
  });
}

/** Hizalama kontrolü: formun kutu çizgileri + alan adları */
function drawGrid(doc, F, layout, dx, dy) {
  doc.lineWidth(0.5).strokeColor('#9fb4c7');
  for (const [x1, y1, x2, y2] of layout.rules) {
    doc.moveTo(mm(FRAME.x + x1 + dx), mm(FRAME.y + y1 + dy))
      .lineTo(mm(FRAME.x + x2 + dx), mm(FRAME.y + y2 + dy)).stroke();
  }
  doc.lineWidth(0.3).strokeColor('#d8c4a0');
  for (const cfg of Object.values(layout.fields)) {
    const h = (cfg.lines || 1) * (cfg.lh || 4.3);
    doc.rect(mm(FRAME.x + cfg.x + dx) - 1.5, mm(FRAME.y + cfg.y + dy) - 1.5, mm(cfg.w), mm(h)).stroke();
  }
  doc.font(F.regular).fontSize(6).fillColor('#8aa0b4').text(
    `Grille de contrôle — ${layout.title} · décalage ${dx} / ${dy} mm · échelle 100 %`,
    mm(14), mm(292), { lineBreak: false }
  );
}

// ============ GET /api/pdf/certificate/:id ============
router.get('/certificate/:id', verifyTokenFlexible, async (req, res) => {
  try {
    if (!can(req.user, 'certificates.read')) return sendError(res, 'Accès refusé (certificates.read)', 403);

    const id = toInt(req.params.id);
    const cert = await loadCertificate(id);
    if (!cert) return sendError(res, 'Belge bulunamadı', 404);

    const layout = LAYOUT[cert.cert_type] || LAYOUT.atr;
    // Kalibrasyon: yazıcıdan yazıcıya değişen kaymayı kullanıcı milimetre ile düzeltir
    const clamp = (v) => Math.max(-25, Math.min(25, Number(v) || 0));
    const dx = clamp(req.query.dx);
    const dy = clamp(req.query.dy);
    const grid = ['1', 'true', 'yes'].includes(String(req.query.grid || '').toLowerCase());

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const F = setupFonts(doc);
    setupPdfHeaders(res, `${layout.title}_${cert.cert_no || cert.id}.pdf`);
    doc.pipe(res);

    if (grid) drawGrid(doc, F, layout, dx, dy);

    for (const [key, cfg] of Object.entries(layout.fields)) {
      const value = cfg.date ? frDate(cert[key]) : cert[key];
      drawValue(doc, F, cfg, value, dx, dy);
    }

    doc.end();
    await logAudit(req, 'download', 'certificates', id, `${layout.title} ${cert.cert_no || ''}`.trim());
  } catch (err) {
    console.error('[pdf/certificate]', err);
    if (!res.headersSent) sendError(res, 'Belge yazdırılamadı', 500);
  }
});

module.exports = router;
module.exports.LAYOUT = LAYOUT;
module.exports.FRAME = FRAME;
