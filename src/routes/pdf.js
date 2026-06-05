const express = require('express');
const PDFDocument = require('pdfkit');
const bwipjs = require('bwip-js');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const { toInt, sendError } = require('../helpers/utils');

const router = express.Router();

/** Flexible token auth — Bearer header VEYA ?token=... query */
function verifyTokenFlexible(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query.token) token = String(req.query.token);
  if (!token) return sendError(res, 'Oturum bulunamadı', 401);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return sendError(res, 'Geçersiz oturum', 401);
  }
}

const MODE_LABELS = { road: 'Karayolu', maritime: 'Denizyolu', sea: 'Denizyolu', air: 'Havayolu', storage: 'Depolama', import: 'İthalat', export: 'İhracat' };
const CURRENCY_SYMBOL = { EUR: '€', USD: '$', TRY: '₺', GBP: '£', CHF: 'CHF', JPY: '¥' };

function parseJsonField(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

async function loadShipment(id) {
  const [rows] = await pool.execute('SELECT * FROM shipments WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
  return rows[0] || null;
}

function setupPdfHeaders(res, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
}

function formatTr(n, decimals = 2) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(n) || 0);
}

function formatDateTr(d) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// === Stil paleti ===
const COLORS = {
  primary: '#6366f1',
  primaryLight: '#a5b4fc',
  primaryFaint: '#eef2ff',
  text: '#1e293b',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  border: '#cbd5e1',
  borderLight: '#e2e8f0',
  fieldBg: '#f1f5f9',
  fieldBorder: '#94a3b8',
  white: '#ffffff',
};

// ============================================================
// 1) Dosya Kapağı (File Cover) — Fransız stil A4
// ============================================================
router.get('/file-cover/:shipmentId', verifyTokenFlexible, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id);
    if (!ship) return sendError(res, 'Sevkiyat bulunamadı', 404);

    const modeData = parseJsonField(ship.mode_data);
    const financial = parseJsonField(ship.financial_data);
    const filename = `Dosya_Kapagi_${ship.shipment_no}.pdf`;
    setupPdfHeaders(res, filename);
    await logAudit(req, 'download', 'documents', id, `file-cover/${ship.shipment_no}`);

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(res);

    const W = 595.28; // A4 width
    const H = 841.89; // A4 height
    const PAD = 30;   // outer padding
    const innerW = W - PAD * 2;

    // === Dış çerçeve (outer rounded border) ===
    doc.lineWidth(1.2);
    doc.roundedRect(PAD, PAD, innerW, H - PAD * 2, 14)
       .strokeColor(COLORS.border)
       .stroke();

    let y = PAD + 20;

    // === N° DE DOSSIER üst kutusu (centered, rounded button-like) ===
    const titleBoxW = 200;
    const titleBoxH = 26;
    const titleBoxX = (W - titleBoxW) / 2;
    doc.roundedRect(titleBoxX, y, titleBoxW, titleBoxH, 13)
       .lineWidth(1.5)
       .strokeColor(COLORS.text)
       .stroke();
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(COLORS.text)
       .text('N° DE DOSSIER', titleBoxX, y + 8, { width: titleBoxW, align: 'center' });
    y += titleBoxH + 8;

    // === Sevkiyat numarası kutusu ===
    doc.roundedRect(titleBoxX, y, titleBoxW, titleBoxH, 13)
       .lineWidth(1)
       .strokeColor(COLORS.fieldBorder)
       .fillColor(COLORS.fieldBg)
       .fillAndStroke();
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(COLORS.text)
       .text(ship.shipment_no || '—', titleBoxX, y + 8, { width: titleBoxW, align: 'center' });
    y += titleBoxH + 25;

    // === Logo bölümü ===
    // Hexagon icon (basit gösterim)
    const logoY = y;
    const logoCenterX = W / 2;
    const hexSize = 22;
    // Hexagon: 6 köşeli düzgün altıgen
    doc.lineWidth(2);
    const hexPoints = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      hexPoints.push([logoCenterX + hexSize * Math.cos(angle), logoY + hexSize + hexSize * Math.sin(angle)]);
    }
    doc.moveTo(hexPoints[0][0], hexPoints[0][1]);
    for (let i = 1; i < 6; i++) doc.lineTo(hexPoints[i][0], hexPoints[i][1]);
    doc.closePath().strokeColor(COLORS.primaryLight).stroke();

    y += hexSize * 2 + 10;

    // CARGO TRACK — tek text node, bold, centered (continued sorunu yok)
    doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.text)
       .text('CARGO TRACK', PAD, y, { width: innerW, align: 'center', lineBreak: false });
    y += 22;
    doc.fontSize(8).font('Helvetica')
       .fillColor(COLORS.textMuted)
       .text('MULTI MODAL SERVICES', PAD, y, { width: innerW, align: 'center', characterSpacing: 3 });
    y += 20;

    // === Dotted ayırıcı ===
    doc.lineWidth(0.5)
       .strokeColor(COLORS.borderLight)
       .dash(2, { space: 2 })
       .moveTo(PAD + 30, y)
       .lineTo(W - PAD - 30, y)
       .stroke()
       .undash();
    y += 18;

    // === 2 kolon grid (sol / sağ) — vertical text ortada ===
    const colW = (innerW - 40) / 2;      // her kolon genişliği
    const colGap = 40;                    // ortadaki dikey text alanı
    const colLeftX = PAD + 12;
    const colRightX = colLeftX + colW + colGap;
    const fieldH = 38;                    // alan başına yükseklik (label + box)
    const fieldGap = 12;                  // alan arası boşluk

    // Field çizen yardımcı
    const drawField = (x, fy, label, value) => {
      // Label
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor(COLORS.text)
         .text(label.toUpperCase(), x, fy, { width: colW, align: 'center', characterSpacing: 0.5 });
      // Input box (rounded, light fill)
      const boxY = fy + 11;
      const boxH = 22;
      doc.roundedRect(x, boxY, colW, boxH, 11)
         .lineWidth(0.6)
         .strokeColor(COLORS.fieldBorder)
         .fillColor(COLORS.fieldBg)
         .fillAndStroke();
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(COLORS.text)
         .text(value || '', x + 10, boxY + 7, { width: colW - 20, height: 12, ellipsis: true });
    };

    // Sol kolon alanları
    const transporter = ship.transport_type === 'maritime' || ship.transport_type === 'sea'
      ? (modeData.vessel_name || '—')
      : ship.transport_type === 'air'
        ? (modeData.airline_code ? `${modeData.airline_code} ${modeData.flight_no || ''}` : '—')
        : (ship.agent || '—');
    const plate = ship.transport_type === 'maritime' || ship.transport_type === 'sea'
      ? (modeData.mbl_no || modeData.hbl_no || '—')
      : ship.transport_type === 'air'
        ? (modeData.mawb_no || modeData.hawb_no || '—')
        : ''; // road için araç plakası ayrı (assignment'tan)

    const leftFields = [
      ['EXPÉDITEUR', ship.sender || ''],
      ['DESTINATAIRE', ship.receiver || ''],
      ['FACTURE N° CLIENT', ship.invoice_no || ''],
      ['FACTURE N° FOURNISSEUR', ''],
      ['RÉFÉRENCE', ship.client_reference || ship.shipment_no],
      ['PRIX DE VENTE', ship.sale_price ? `${formatTr(ship.sale_price)} ${ship.currency_code || 'EUR'}` : ''],
      ['DOUANE EXPORT', ship.departure_country || ''],
    ];
    const rightFields = [
      ['DATE', formatDateTr(ship.created_date || ship.created_at)],
      ['POIDS', ship.gross_weight ? `${formatTr(ship.gross_weight, 0)} kg` : ''],
      ['COLISAGE', ship.quantity ? `${ship.quantity} kap` : ''],
      ['DIMENSIONS', ship.dimensions || ''],
      ['TRANSPORTEUR', transporter],
      ['PLAQUE N°', plate],
      ['DOUANE IMPORT', ship.arrival_country || ''],
    ];

    const fieldsStartY = y;
    leftFields.forEach((f, i) => drawField(colLeftX, fieldsStartY + i * (fieldH + fieldGap), f[0], f[1]));
    rightFields.forEach((f, i) => drawField(colRightX, fieldsStartY + i * (fieldH + fieldGap), f[0], f[1]));

    // === Ortadaki dikey "MULTIMODAL SERVICES" yazısı ===
    const midX = (colLeftX + colW + colRightX) / 2;
    const midStartY = fieldsStartY + 20;
    const letters = 'MULTIMODALSERVICES'.split('');
    const totalLetters = letters.length;
    const availableH = (fieldH + fieldGap) * 7 - 20;
    const letterGap = availableH / totalLetters;
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.textLight);
    letters.forEach((ch, i) => {
      doc.text(ch, midX - 4, midStartY + i * letterGap);
    });

    y = fieldsStartY + 7 * (fieldH + fieldGap) + 10;

    // === OBSERVATION kutusu (alt) ===
    const obsBoxW = 200;
    const obsBoxH = 22;
    const obsX = (W - obsBoxW) / 2;
    doc.roundedRect(obsX, y, obsBoxW, obsBoxH, 11)
       .lineWidth(1)
       .strokeColor(COLORS.fieldBorder)
       .stroke();
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.text)
       .text('OBSERVATION', obsX, y + 7, { width: obsBoxW, align: 'center', characterSpacing: 2 });
    y += obsBoxH + 8;

    // Observation alanı (büyük input box)
    const obsContentH = H - PAD - 20 - y;
    doc.roundedRect(colLeftX, y, innerW - 24, obsContentH, 14)
       .lineWidth(0.6)
       .strokeColor(COLORS.fieldBorder)
       .fillColor(COLORS.white)
       .fillAndStroke();
    if (ship.goods_description) {
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.text)
         .text(ship.goods_description, colLeftX + 10, y + 8, { width: innerW - 44, height: obsContentH - 16 });
    }

    doc.end();
  } catch (err) {
    console.error('[pdf/file-cover]', err);
    if (!res.headersSent) sendError(res, 'PDF üretilemedi', 500);
  }
});

// ============================================================
// 2) Proforma Fatura — Modern web stili
// ============================================================
router.get('/proforma/:shipmentId', verifyTokenFlexible, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id);
    if (!ship) return sendError(res, 'Sevkiyat bulunamadı', 404);

    const financial = parseJsonField(ship.financial_data);
    const filename = `Proforma_${ship.shipment_no}.pdf`;
    setupPdfHeaders(res, filename);
    await logAudit(req, 'download', 'documents', id, `proforma/${ship.shipment_no}`);

    // bufferPages: true → watermark'ı tüm içerik yazıldıktan sonra overlay edebileceğiz
    // bottom margin 0 → footer y=810'a basıldığında yeni sayfa açmasın
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, left: 40, right: 40, bottom: 0 },
      bufferPages: true,
      autoFirstPage: true,
    });
    doc.pipe(res);

    const W = 595.28;
    const cur = ship.currency_code || 'EUR';
    const symbol = CURRENCY_SYMBOL[cur] || cur;

    // === Başlık ===
    doc.fontSize(28).font('Helvetica-Bold').fillColor(COLORS.primary)
       .text('PROFORMA FATURA', 40, 50);
    doc.fontSize(10).font('Helvetica').fillColor(COLORS.textMuted)
       .text('Bu belge bilgilendirme amaçlıdır. Resmi fatura niteliği taşımaz.', 40, 86);

    // === Üst bilgi kartı (gri arka plan, 2x3 grid) ===
    const cardY = 120;
    const cardH = 110;
    doc.roundedRect(40, cardY, W - 80, cardH, 8)
       .lineWidth(0.8)
       .strokeColor(COLORS.borderLight)
       .fillColor('#f8fafc')
       .fillAndStroke();

    const infoLabel = (text, x, y) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.textLight)
         .text(text.toUpperCase(), x, y, { characterSpacing: 0.5 });
    };
    const infoValue = (text, x, y) => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.text)
         .text(text || '—', x, y + 12);
    };

    const colL = 60, colR = W / 2 + 20;
    let infoY = cardY + 15;
    // Row 1
    infoLabel('FATURA NO', colL, infoY);
    infoValue(ship.shipment_no, colL, infoY);
    infoLabel('TARİH', colR, infoY);
    infoValue(formatDateTr(new Date()), colR, infoY);
    infoY += 30;
    // Row 2
    infoLabel('MÜŞTERİ', colL, infoY);
    infoValue(ship.client_billing, colL, infoY);
    infoLabel('SEVKİYAT NO', colR, infoY);
    infoValue(ship.shipment_no, colR, infoY);
    infoY += 30;
    // Row 3
    infoLabel('GÜZERGAH', colL, infoY);
    infoValue(`${ship.departure_country || '?'}  →  ${ship.arrival_country || '?'}`, colL, infoY);
    infoLabel('ÖDEME TİPİ', colR, infoY);
    infoValue(ship.payment_type || '—', colR, infoY);

    // Watermark en sona taşındı (bufferPages + switchToPage ile overlay)

    // === Kalemler tablosu başlık ===
    let tableY = cardY + cardH + 30;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.textLight);
    doc.text('HİZMET / KALEM', 50, tableY);
    doc.text(`TUTAR (${cur})`, 350, tableY, { width: 80, align: 'right' });
    doc.text('KDV %', 440, tableY, { width: 40, align: 'right' });
    doc.text('KDV TUTARI', 490, tableY, { width: 70, align: 'right' });
    tableY += 14;
    doc.moveTo(40, tableY).lineTo(W - 40, tableY).strokeColor(COLORS.borderLight).lineWidth(1).stroke();
    tableY += 6;

    // === Kalemler ===
    let totalIncome = 0, totalIncomeVat = 0;
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
    let lineCount = 0;

    for (const [key, entry] of Object.entries(financial)) {
      if (!entry || typeof entry !== 'object') continue;
      const income = parseFloat(entry.income || 0);
      if (!income) continue;
      const vatStr = String(entry.income_vat || '0');
      let vatRate;
      if (vatStr.startsWith('custom:')) vatRate = parseFloat(vatStr.slice(7)) || 0;
      else if (vatStr === 'custom') vatRate = parseFloat(entry.income_vat_custom || 0) || 0;
      else vatRate = parseFloat(vatStr) || 0;
      const vat = income * (vatRate / 100);
      totalIncome += income;
      totalIncomeVat += vat;

      const label = entry.label || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(10);
      doc.text(label, 50, tableY, { width: 290, ellipsis: true });
      doc.text(formatTr(income), 350, tableY, { width: 80, align: 'right' });
      doc.text(`${vatRate.toFixed(0)}%`, 440, tableY, { width: 40, align: 'right' });
      doc.text(formatTr(vat), 490, tableY, { width: 70, align: 'right' });
      tableY += 22;
      lineCount++;

      if (tableY > 650) { doc.addPage(); tableY = 60; }
    }

    if (lineCount === 0) {
      doc.fontSize(10).font('Helvetica-Oblique').fillColor(COLORS.textLight);
      doc.text('Finansal kalem girilmemiş', 50, tableY, { width: 500, align: 'center' });
      tableY += 22;
    }

    // === Toplamlar (sağa hizalı kutu) ===
    tableY += 20;
    doc.moveTo(40, tableY).lineTo(W - 40, tableY).strokeColor(COLORS.borderLight).lineWidth(0.5).stroke();
    tableY += 14;

    const totalsX = 320;
    const totalsValueX = 480;
    const totalsValueW = 80;

    doc.fontSize(11).font('Helvetica').fillColor(COLORS.text);
    doc.text('Ara Toplam (KDV Hariç):', totalsX, tableY, { width: 150 });
    doc.font('Helvetica-Bold').fillColor(COLORS.text)
       .text(`${symbol}${formatTr(totalIncome)}`, totalsValueX, tableY, { width: totalsValueW, align: 'right' });
    tableY += 22;

    doc.font('Helvetica').fillColor(COLORS.text)
       .text('Toplam KDV:', totalsX, tableY, { width: 150 });
    doc.font('Helvetica-Bold').fillColor(COLORS.text)
       .text(`${symbol}${formatTr(totalIncomeVat)}`, totalsValueX, tableY, { width: totalsValueW, align: 'right' });
    tableY += 30;

    // === Genel Toplam (büyük, primary renkli) ===
    doc.fontSize(15).font('Helvetica-Bold').fillColor(COLORS.primary)
       .text('GENEL TOPLAM (KDV Dahil):', totalsX, tableY, { width: 200 });
    doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.primary)
       .text(`${symbol}${formatTr(totalIncome + totalIncomeVat)}`, totalsValueX - 30, tableY - 2, { width: totalsValueW + 30, align: 'right' });

    // === Footer ===
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.textLight)
       .text('CargoTrack Lojistik Yönetim Platformu  ·  webreta web teknolojileri',
             40, 810, { align: 'center', width: W - 80, lineBreak: false });

    // === Watermark — bufferedPages mode, ilk sayfaya geri dönüp diagonal overlay ===
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.opacity(0.06);
      doc.fontSize(110).font('Helvetica-Bold').fillColor(COLORS.primary);
      doc.rotate(-25, { origin: [W / 2, 421] });
      doc.text('PROFORMA', 0, 380, { width: W, align: 'center', lineBreak: false, height: 0 });
      doc.restore();
      doc.opacity(1);
    }

    doc.end();
  } catch (err) {
    console.error('[pdf/proforma]', err);
    if (!res.headersSent) sendError(res, 'PDF üretilemedi', 500);
  }
});

// ============================================================
// 3) Depo Raporu — değişmedi
// ============================================================
router.get('/storage-report/:shipmentId', verifyTokenFlexible, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id);
    if (!ship || ship.transport_type !== 'storage') {
      return sendError(res, 'Depolama sevkiyatı bulunamadı', 404);
    }

    const stockLog = parseJsonField(ship.depo_stock_log);
    const filename = `Depo_Raporu_${ship.shipment_no}.pdf`;
    setupPdfHeaders(res, filename);
    await logAudit(req, 'download', 'documents', id, `storage-report/${ship.shipment_no}`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    doc.fontSize(22).fillColor(COLORS.text).font('Helvetica-Bold')
       .text('DEPOLAMA RAPORU', { align: 'center' });
    doc.fontSize(10).fillColor(COLORS.primary).text(`Dosya: ${ship.shipment_no}`, { align: 'center' });
    doc.moveDown();

    let y = 120;
    doc.fontSize(9).fillColor(COLORS.text);
    doc.text(`Depo: ${ship.warehouse || '—'}`, 40, y);
    doc.text(`Müşteri: ${ship.depo_musteri || ship.client_billing || '—'}`, 300, y);
    y += 14;
    doc.text(`Giriş: ${ship.entry_date || '—'}`, 40, y);
    doc.text(`Çıkış: ${ship.exit_date || '—'}`, 300, y);
    y += 14;
    doc.text(`Kap Sayısı: ${ship.depo_kap_sayisi || 0}`, 40, y);

    const log = Array.isArray(stockLog) ? stockLog : [];
    const totalIn = log.reduce((s, r) => s + (parseInt(r.in, 10) || 0), 0);
    const totalOut = log.reduce((s, r) => s + (parseInt(r.out, 10) || 0), 0);
    const balance = totalIn - totalOut;

    y += 25;
    doc.rect(40, y, 515, 30).fillColor('#ede9fe').fill();
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(11);
    doc.text(`Mevcut Stok: ${balance} kap   |   Toplam Giriş: ${totalIn}   |   Toplam Çıkış: ${totalOut}`, 50, y + 10);
    y += 45;

    doc.fillColor('#fff');
    doc.rect(40, y, 515, 22).fill(COLORS.primary);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9);
    ['Giriş Tarihi', 'Çıkış Tarihi', 'Bekleme', 'Giriş', 'Çıkış', 'Bakiye', 'Not'].forEach((h, i) => {
      const widths = [80, 80, 70, 50, 50, 50, 135];
      const offsets = [50, 130, 210, 280, 330, 380, 430];
      doc.text(h, offsets[i], y + 7, { width: widths[i] });
    });
    y += 22;

    let bal = 0;
    const todayISO = new Date().toISOString().slice(0, 10);
    doc.font('Helvetica').fillColor(COLORS.text).fontSize(8);
    for (const r of log) {
      const i = parseInt(r.in, 10) || 0;
      const o = parseInt(r.out, 10) || 0;
      bal += i - o;
      let daysStr = '—';
      if (r.entry_date && r.exit_date) {
        const d = Math.round((new Date(r.exit_date) - new Date(r.entry_date)) / 86400000);
        daysStr = `${d} gün`;
      } else if (r.entry_date) {
        const d = Math.round((new Date(todayISO) - new Date(r.entry_date)) / 86400000);
        daysStr = `${d} gün (devam)`;
      }
      doc.text(r.entry_date || '-', 50, y + 4, { width: 80 });
      doc.text(r.exit_date || '-', 130, y + 4, { width: 80 });
      doc.text(daysStr, 210, y + 4, { width: 70 });
      doc.fillColor('#10b981').text(i ? `+${i}` : '-', 280, y + 4, { width: 50, align: 'center' });
      doc.fillColor('#ef4444').text(o ? `-${o}` : '-', 330, y + 4, { width: 50, align: 'center' });
      doc.fillColor(COLORS.primary).font('Helvetica-Bold').text(String(bal), 380, y + 4, { width: 50, align: 'center' });
      doc.fillColor(COLORS.textMuted).font('Helvetica').text(r.note || '', 430, y + 4, { width: 135, ellipsis: true });
      doc.moveTo(40, y + 22).lineTo(555, y + 22).strokeColor(COLORS.borderLight).stroke();
      y += 22;
      if (y > 750) { doc.addPage(); y = 50; }
    }

    if (!log.length) {
      doc.fillColor(COLORS.textLight).text('Henüz stok hareketi kayıtlı değil.', 40, y + 10);
    }

    doc.fontSize(7).fillColor(COLORS.textLight)
       .text(`Üretildi: ${new Date().toLocaleString('tr-TR')} · CargoTrack v3.0`, 40, 810, { align: 'center', width: 515 });

    doc.end();
  } catch (err) {
    console.error('[pdf/storage-report]', err);
    if (!res.headersSent) sendError(res, 'PDF üretilemedi', 500);
  }
});

// ============================================================
// 4) Barkod yazdırma — değişmedi
// ============================================================
router.get('/barcodes/:shipmentId', verifyTokenFlexible, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id);
    if (!ship) return sendError(res, 'Sevkiyat bulunamadı', 404);

    const count = Math.min(500, parseInt(ship.quantity, 10) || 1);
    const filename = `Barkodlar_${ship.shipment_no}.pdf`;
    setupPdfHeaders(res, filename);
    await logAudit(req, 'download', 'documents', id, `barcodes/${ship.shipment_no}/${count}`);

    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    doc.pipe(res);

    const COLS = 3;
    const ROWS = 8;
    const PAGE_W = 595 - 60;
    const PAGE_H = 842 - 60;
    const CELL_W = PAGE_W / COLS;
    const CELL_H = PAGE_H / ROWS;
    let i = 0;
    for (let n = 1; n <= count; n++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS) % ROWS;
      const x = 30 + col * CELL_W;
      const y = 30 + row * CELL_H;

      doc.rect(x + 4, y + 4, CELL_W - 8, CELL_H - 8).strokeColor(COLORS.border).stroke();
      doc.fontSize(9).fillColor(COLORS.text).font('Helvetica-Bold')
         .text(ship.shipment_no || '—', x + 8, y + 10, { width: CELL_W - 16, align: 'center' });
      doc.fontSize(7).fillColor(COLORS.primary)
         .text(`Kap ${n} / ${count}`, x + 8, y + 24, { width: CELL_W - 16, align: 'center' });

      const labelText = `${ship.shipment_no}-${String(n).padStart(3, '0')}`;
      const buf = await bwipjs.toBuffer({
        bcid: 'code128',
        text: labelText,
        scale: 2,
        height: 10,
        includetext: false,
      });
      doc.image(buf, x + 8, y + 38, { width: CELL_W - 16, height: CELL_H - 60, fit: [CELL_W - 16, CELL_H - 60] });
      doc.fontSize(7).fillColor(COLORS.textMuted).font('Helvetica')
         .text(labelText, x + 8, y + CELL_H - 14, { width: CELL_W - 16, align: 'center' });

      i++;
      if (i >= COLS * ROWS && n < count) {
        doc.addPage();
        i = 0;
      }
    }

    doc.end();
  } catch (err) {
    console.error('[pdf/barcodes]', err);
    if (!res.headersSent) sendError(res, 'PDF üretilemedi', 500);
  }
});

module.exports = router;
