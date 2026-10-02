/**
 * ATR / EUR.1 dolaşım belgesi yazdırma.
 *
 *   GET /api/pdf/certificate/:id?dx=0&dy=0&grid=0
 *
 * Belgeler matbu (önceden basılı, yeşil) formlara doldurulduğu için PDF
 * SADECE metinleri basar; kutuların yerleri milimetre cinsinden sabittir
 * (LAYOUT). Böylece her baskıda aynı yere düşer — Excel'de olduğu gibi kaymaz.
 *
 *   dx / dy : yazıcıya göre tüm baskıyı milimetre kaydırır (kalibrasyon)
 *   grid=1  : kutu çerçevelerini ve alan adlarını da çizer; boş kağıda basıp
 *             matbu formla üst üste tutarak hizayı kontrol etmek için.
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

/**
 * Alan yerleşimi — matbu formdaki kutulara göre milimetre.
 *   x, y    : metnin sol üst köşesi
 *   w       : kullanılabilir genişlik (taşarsa punto küçülür)
 *   size    : punto
 *   lines   : çok satırlı alanlarda en fazla satır sayısı
 *   lh      : satır yüksekliği (mm)
 *   box     : grid modunda çizilecek çerçeve [w, h] (mm)
 */
const LAYOUT = {
  atr: {
    title: 'A.TR.',
    fields: {
      cert_no:            { x: 150, y: 15.5, w: 48, size: 12, label: 'N° A.TR.' },
      exporter:           { x: 22,  y: 23.5, w: 78, size: 8.5, lines: 4, lh: 4.2, box: [80, 20], label: '1. Exportateur' },
      transport_doc_no:   { x: 116, y: 27.5, w: 50, size: 8, label: '2. Document de transport' },
      transport_doc_date: { x: 172, y: 27.5, w: 24, size: 8, date: true },
      consignee:          { x: 22,  y: 37.5, w: 78, size: 8.5, lines: 5, lh: 4.2, box: [80, 24], label: '3. Destinataire' },
      export_country:     { x: 114, y: 65.5, w: 40, size: 9, box: [40, 6], label: "5. État d'exportation" },
      destination_country:{ x: 157, y: 65.5, w: 38, size: 9, box: [38, 6], label: '6. État de destination' },
      transport_info:     { x: 22,  y: 80,   w: 78, size: 8.5, lines: 4, lh: 4.2, box: [80, 18], label: '7. Informations transport' },
      observations:       { x: 114, y: 80,   w: 80, size: 8.5, lines: 4, lh: 4.2, box: [80, 18], label: '8. Observations' },
      order_no:           { x: 19,  y: 126,  w: 10, size: 8.5, label: "9. N° d'ordre" },
      goods_description:  { x: 30,  y: 126,  w: 142, size: 9, lines: 22, lh: 4.6, box: [142, 100], label: '10. Marchandises' },
      gross_weight:       { x: 176, y: 124,  w: 24, size: 9, box: [24, 6], label: '11. Masse brute' },
      customs_doc_model:  { x: 33,  y: 246.5, w: 16, size: 8, label: '12. modèle' },
      customs_doc_no:     { x: 55,  y: 246.5, w: 48, size: 8, label: "n° document d'export" },
      customs_doc_date:   { x: 33,  y: 251.5, w: 24, size: 8, date: true, label: 'du' },
      customs_office:     { x: 58,  y: 256,  w: 60, size: 8, label: 'Bureau de douane' },
      issue_country:      { x: 51,  y: 260.5, w: 40, size: 8, label: 'État de délivrance' },
      issue_place:        { x: 30,  y: 265.5, w: 30, size: 8, label: 'À' },
      issue_date:         { x: 62,  y: 265.5, w: 24, size: 8, date: true, label: 'le' },
      declaration_place:  { x: 138, y: 265.5, w: 36, size: 8, label: '13. Lieu' },
      declaration_date:   { x: 178, y: 265.5, w: 24, size: 8, date: true, label: 'date' },
    },
  },
  // EUR.1 formu aynı aileden; kutu numaraları ve birkaç satır farklı
  eur1: {
    title: 'EUR.1',
    fields: {
      cert_no:            { x: 150, y: 15.5, w: 48, size: 12, label: 'N° EUR.1' },
      exporter:           { x: 22,  y: 23.5, w: 78, size: 8.5, lines: 4, lh: 4.2, box: [80, 20], label: '1. Exportateur' },
      origin_country:     { x: 116, y: 27.5, w: 80, size: 8.5, lines: 2, lh: 4.2, label: "2. Pays d'origine" },
      consignee:          { x: 22,  y: 37.5, w: 78, size: 8.5, lines: 5, lh: 4.2, box: [80, 24], label: '3. Destinataire' },
      export_country:     { x: 114, y: 55,   w: 40, size: 9, box: [40, 6], label: "4. Pays d'exportation" },
      destination_country:{ x: 157, y: 55,   w: 38, size: 9, box: [38, 6], label: '5. Pays de destination' },
      transport_info:     { x: 22,  y: 80,   w: 78, size: 8.5, lines: 4, lh: 4.2, box: [80, 18], label: '6. Informations transport' },
      observations:       { x: 114, y: 80,   w: 80, size: 8.5, lines: 4, lh: 4.2, box: [80, 18], label: '7. Observations' },
      order_no:           { x: 19,  y: 126,  w: 10, size: 8.5, label: "8. N° d'ordre" },
      goods_description:  { x: 30,  y: 126,  w: 132, size: 9, lines: 22, lh: 4.6, box: [132, 92], label: '8. Marchandises' },
      gross_weight:       { x: 166, y: 124,  w: 24, size: 9, box: [24, 6], label: '9. Masse brute' },
      invoice_ref:        { x: 166, y: 215,  w: 30, size: 8, lines: 2, lh: 4.2, label: '10. Factures' },
      customs_doc_model:  { x: 33,  y: 246.5, w: 16, size: 8, label: '11. modèle' },
      customs_doc_no:     { x: 55,  y: 246.5, w: 48, size: 8, label: "n° document d'export" },
      customs_doc_date:   { x: 33,  y: 251.5, w: 24, size: 8, date: true, label: 'du' },
      customs_office:     { x: 58,  y: 256,  w: 60, size: 8, label: 'Bureau de douane' },
      issue_country:      { x: 51,  y: 260.5, w: 40, size: 8, label: 'Pays de délivrance' },
      issue_place:        { x: 30,  y: 265.5, w: 30, size: 8, label: 'À' },
      issue_date:         { x: 62,  y: 265.5, w: 24, size: 8, date: true, label: 'le' },
      declaration_place:  { x: 138, y: 265.5, w: 36, size: 8, label: '12. Lieu' },
      declaration_date:   { x: 178, y: 265.5, w: 24, size: 8, date: true, label: 'date' },
    },
  },
};

/** Değeri kutuya sığacak şekilde (gerekirse küçülterek) yazar */
function drawValue(doc, F, cfg, value, dx, dy) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return;

  const x = mm(cfg.x + dx);
  const y = mm(cfg.y + dy);
  const width = mm(cfg.w);
  const maxLines = cfg.lines || 1;
  const lineHeight = mm(cfg.lh || 4.2);

  // Satırlara böl: elle girilen satır sonları korunur, uzun satırlar bölünür
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

  let lines = raw.flatMap((l) => wrap(l, size));
  // Satır sayısı taşıyorsa puntoyu küçült (en fazla 2 punto)
  while (lines.length > maxLines && size > (cfg.size || 9) - 2.5) {
    size -= 0.5;
    lines = raw.flatMap((l) => wrap(l, size));
  }
  lines = lines.slice(0, maxLines);

  doc.fontSize(size).fillColor('#000000');
  lines.forEach((l, i) => {
    doc.text(l, x, y + i * lineHeight, { width, lineBreak: false });
  });
}

/** Hizalama kontrolü için kutu çerçeveleri ve alan adları */
function drawGrid(doc, F, layout, dx, dy) {
  doc.lineWidth(0.4).strokeColor('#b9c6d4');
  for (const [key, cfg] of Object.entries(layout.fields)) {
    const [bw, bh] = cfg.box || [cfg.w, (cfg.lines || 1) * (cfg.lh || 4.2)];
    doc.rect(mm(cfg.x + dx) - 2, mm(cfg.y + dy) - 3, mm(bw), mm(bh) + 2).stroke();
    doc.font(F.regular).fontSize(5).fillColor('#8aa0b4')
      .text(cfg.label || key, mm(cfg.x + dx) - 2, mm(cfg.y + dy) - 7, { width: mm(bw), lineBreak: false });
  }
  doc.font(F.regular).fontSize(6).fillColor('#8aa0b4').text(
    `Grille de contrôle — ${layout.title} · décalage ${dx} / ${dy} mm`,
    mm(14), mm(287), { lineBreak: false }
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
