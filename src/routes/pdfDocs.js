/**
 * Taşıma belgeleri PDF üreticileri — müşteri isteği: girilen her yükte,
 * moduna göre taşıma belgesi panelden oluşturulabilsin.
 *
 *   Karayolu  → CMR (lettre de voiture internationale, 24 kutulu standart form)
 *   Denizyolu → Bill of Lading / Sea Waybill (müşterinin Yusen örneği baz alındı)
 *   Havayolu  → Air Waybill (IATA düzeni)
 *
 * Ortak yardımcılar (font, başlık, yükleme) pdf.js'ten paylaşılır.
 */
const express = require('express');
const PDFDocument = require('pdfkit');
const { pool } = require('../config/database');
const { COMPANY, addressLines } = require('../config/company');
const { logAudit } = require('../helpers/audit');
const { sendError, toInt } = require('../helpers/utils');
const fs = require('fs');
const path = require('path');
const pdfShared = require('./pdf').shared;

// Genis Inter Trans logosu (695x163) — CMR ve B/L basliklarinda kullanilir
const LOGO_WIDE = path.join(__dirname, '..', '..', 'assets', 'logo-wide.png');
const hasLogo = () => { try { return fs.existsSync(LOGO_WIDE); } catch (e) { return false; } };

const {
  verifyTokenFlexible, setupFonts, setupPdfHeaders,
  parseJsonField, parseGoodsItems, loadShipment,
} = pdfShared;

const router = express.Router();

const INK = '#1a1a1a';
const MUTED = '#666666';
const CMR_RED = '#a93226';
const NAVY = '#1f3a5f';

/** pdfkit lineBreak:false genisligi asan metinde yine sarabiliyor — elle kirp. */
function clip(v, n) {
  const t = String(v == null ? '' : v);
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

/** Taraf (gönderici/alıcı) için ad + adres satırları üretir. */
function partyLines(name, extra, partner) {
  const lines = [];
  if (name) lines.push(name);
  const addr = (extra && (extra.address || extra.delivery_address_2)) || '';
  if (addr) {
    addr.split(/\n|,\s*(?=\d{4,5}\s)/).forEach((l) => { if (l.trim()) lines.push(l.trim()); });
  } else if (partner) {
    if (partner.physical_address) lines.push(partner.physical_address);
    const cityLine = [partner.postal_code, partner.city].filter(Boolean).join(' ');
    if (cityLine) lines.push(cityLine);
    if (partner.country) lines.push(partner.country);
  }
  if (extra && extra.contact) lines.push(`Att: ${extra.contact}`);
  if (extra && extra.phone) lines.push(`Tel: ${extra.phone}`);
  return lines;
}

/** Sevkiyatın taraf ek bilgileri + partner kayıtlarından adresleri toplar. */
async function loadParties(ship) {
  const parties = parseJsonField(ship.parties_data) || {};
  const names = [ship.sender, ship.receiver, ship.client_billing, ship.agent].filter(Boolean);
  let partnersByName = {};
  if (names.length) {
    const ph = names.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT company_name, physical_address, postal_code, city, country, contact_phone, contact_email
       FROM partners WHERE company_name IN (${ph}) AND deleted_at IS NULL`, names);
    for (const r of rows) partnersByName[r.company_name] = r;
  }
  return {
    sender: partyLines(ship.sender, parties.sender, partnersByName[ship.sender]),
    receiver: partyLines(ship.receiver, parties.receiver, partnersByName[ship.receiver]),
    client: partyLines(ship.client_billing, parties.client, partnersByName[ship.client_billing]),
    agent: partyLines(ship.agent, parties.agent, partnersByName[ship.agent]),
    receiverRow: partnersByName[ship.receiver] || null,
  };
}

/** Son (aktif) araç ataması — plaka/dorse/şoför/nakliyeci. */
async function loadVehicle(shipId) {
  const [rows] = await pool.execute(
    `SELECT a.loading_date, v.plate, v.trailer_plate, v.driver_name, v.carrier_name
     FROM vehicle_assignments a
     JOIN vehicles v ON v.id = a.vehicle_id AND v.deleted_at IS NULL
     WHERE a.shipment_id = ? AND a.deleted_at IS NULL
     ORDER BY a.created_at DESC LIMIT 1`, [shipId]);
  return rows[0] || null;
}

/** Tüm atanmış araçlar (denizde konteyner listesi olarak kullanılır). */
async function loadVehicles(shipId) {
  const [rows] = await pool.execute(
    `SELECT v.plate, v.trailer_plate, v.equipment_type, v.container_numbers, v.container_count, v.bl_number,
            a.assigned_quantity, a.assigned_weight
     FROM vehicle_assignments a
     JOIN vehicles v ON v.id = a.vehicle_id AND v.deleted_at IS NULL
     WHERE a.shipment_id = ? AND a.deleted_at IS NULL
     ORDER BY a.created_at ASC`, [shipId]);
  return rows;
}

/** Mal kalemleri — kalem listesi boşsa üst seviye alanlardan tek satır. */
function goodsRows(ship) {
  const items = parseGoodsItems(ship.goods_items);
  if (items.length > 0) return items;
  return [{
    description: ship.goods_description || '',
    hs_code: ship.hs_code || '',
    quantity: ship.quantity || 0,
    package_type: ship.package_type || '',
    gross_weight: ship.gross_weight || 0,
    net_weight: ship.net_weight || 0,
    volume_cbm: ship.volume_cbm || 0,
    value: ship.goods_value || 0,
  }];
}

function totalsOf(rows) {
  return rows.reduce((a, r) => ({
    qty: a.qty + (Number(r.quantity) || 0),
    gross: a.gross + (Number(r.gross_weight) || 0),
    vol: a.vol + (Number(r.volume_cbm) || 0),
  }), { qty: 0, gross: 0, vol: 0 });
}

// ============================================================
// CMR — Lettre de voiture internationale (karayolu)
// ============================================================
router.get('/cmr/:shipmentId', verifyTokenFlexible, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id, req.user);
    if (!ship) return sendError(res, 'Sevkiyat bulunamadı', 404);

    const parties = await loadParties(ship);
    const veh = await loadVehicle(id);
    const rows = goodsRows(ship);
    const tot = totalsOf(rows);

    setupPdfHeaders(res, `CMR_${ship.shipment_no}.pdf`);
    await logAudit(req, 'download', 'documents', id, `cmr/${ship.shipment_no}`);

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    doc.pipe(res);
    const F = setupFonts(doc);

    const X0 = 24, W = 547, MID = 308;
    const LW = MID - X0;            // sol kolon genişliği
    const RW = X0 + W - MID;        // sağ kolon genişliği

    const box = (x, y, w, h) => doc.rect(x, y, w, h).lineWidth(0.7).strokeColor(CMR_RED).stroke();
    // Kutu başlığı: numara + FR + EN
    const label = (x, y, num, fr, en, w) => {
      doc.font(F.bold).fontSize(6.5).fillColor(CMR_RED).text(String(num), x + 3, y + 3, { lineBreak: false });
      doc.font(F.regular).fontSize(6).fillColor(CMR_RED)
        .text(fr, x + 13, y + 3, { width: (w || LW) - 16, lineBreak: false, ellipsis: true });
      doc.fontSize(5.5).fillColor(MUTED)
        .text(en, x + 13, y + 10, { width: (w || LW) - 16, lineBreak: false, ellipsis: true });
    };
    const content = (x, y, lines, w, size) => {
      doc.font(F.regular).fontSize(size || 7.5).fillColor(INK);
      let cy = y;
      for (const l of lines) {
        doc.text(String(l), x + 5, cy, { width: (w || LW) - 10, lineBreak: false, ellipsis: true });
        cy += (size || 7.5) + 2.2;
      }
      return cy;
    };

    // ---- Üst blok: kutu 1 | başlık ----
    let y = 24;
    box(X0, y, LW, 78); label(X0, y, 1, "Expéditeur (nom, adresse, pays)", 'Sender (name, address, country)');
    content(X0, y + 18, parties.sender.slice(0, 6));

    box(MID, y, RW, 78);
    if (hasLogo()) {
      // 695x163 -> 110pt genislik = ~26pt yukseklik
      doc.image(LOGO_WIDE, MID + 8, y + 5, { width: 110 });
      doc.font(F.bold).fontSize(9.5).fillColor(INK)
        .text(`N° ${ship.shipment_no}`, MID + 124, y + 12, { width: RW - 130, align: 'right', lineBreak: false });
      doc.font(F.bold).fontSize(8).fillColor(CMR_RED)
        .text('CMR — LETTRE DE VOITURE INTERNATIONALE', MID + 8, y + 36, { width: RW - 16, lineBreak: false, ellipsis: true });
      doc.font(F.regular).fontSize(6).fillColor(MUTED)
        .text('INTERNATIONAL CONSIGNMENT NOTE', MID + 8, y + 46, { lineBreak: false });
    } else {
      doc.font(F.bold).fontSize(13).fillColor(CMR_RED).text('CMR', MID + 8, y + 6, { lineBreak: false });
      doc.font(F.bold).fontSize(8.5).fillColor(INK)
        .text('LETTRE DE VOITURE INTERNATIONALE', MID + 46, y + 6, { width: RW - 52 });
      doc.font(F.regular).fontSize(6.5).fillColor(MUTED)
        .text('INTERNATIONAL CONSIGNMENT NOTE', MID + 46, y + 17, { width: RW - 52 });
      doc.font(F.bold).fontSize(9).fillColor(INK).text(`N° ${ship.shipment_no}`, MID + 8, y + 30, { lineBreak: false });
    }
    doc.font(F.regular).fontSize(5.4).fillColor(MUTED).text(
      "Ce transport est soumis, nonobstant toute clause contraire, à la Convention relative au contrat de transport international de marchandises par route (CMR). / This carriage is subject to the Convention on the Contract for the International Carriage of Goods by Road (CMR).",
      MID + 8, hasLogo() ? y + 55 : y + 44, { width: RW - 16, lineGap: 0.2, height: hasLogo() ? 21 : 33, ellipsis: true });

    // ---- 2 | 16 ----
    y = 102;
    box(X0, y, LW, 56); label(X0, y, 2, 'Destinataire (nom, adresse, pays)', 'Consignee (name, address, country)');
    content(X0, y + 18, parties.receiver.slice(0, 4));
    box(MID, y, RW, 56); label(MID, y, 16, 'Transporteur (nom, adresse, pays)', 'Carrier (name, address, country)', RW);
    {
      const lines = [];
      if (veh && veh.carrier_name) lines.push(veh.carrier_name);
      if (veh) lines.push(`Véhicule: ${veh.plate || '—'}${veh.trailer_plate ? '  /  Remorque: ' + veh.trailer_plate : ''}`);
      if (veh && veh.driver_name) lines.push(`Chauffeur: ${veh.driver_name}`);
      content(MID, y + 18, lines.length ? lines : [''], RW);
    }

    // ---- 3 | 17 ----
    y = 158;
    box(X0, y, LW, 42); label(X0, y, 3, 'Lieu prévu pour la livraison de la marchandise', 'Place of delivery of the goods');
    content(X0, y + 16, [ship.client_delivery_address || '', ship.arrival_country || ''].filter(Boolean).slice(0, 3), LW, 7);
    box(MID, y, RW, 42); label(MID, y, 17, 'Transporteurs successifs (nom, adresse, pays)', 'Successive carriers', RW);

    // ---- 4 | 18 ----
    y = 200;
    box(X0, y, LW, 42); label(X0, y, 4, 'Lieu et date de la prise en charge de la marchandise', 'Place and date of taking over the goods');
    content(X0, y + 16, [
      ship.departure_country || '',
      `Date: ${fmtDate((veh && veh.loading_date) || ship.created_date)}`,
    ].filter(Boolean), LW, 7);
    box(MID, y, RW, 42); label(MID, y, 18, 'Réserves et observations des transporteurs', "Carrier's reservations and observations", RW);

    // ---- 5 | 19 ----
    y = 242;
    box(X0, y, LW, 30); label(X0, y, 5, 'Documents annexés', 'Documents attached');
    content(X0, y + 15, [ship.invoice_no ? `Facture N° ${ship.invoice_no}` : (ship.client_reference ? `Réf: ${ship.client_reference}` : '')], LW, 7);
    box(MID, y, RW, 30); label(MID, y, 19, 'Conventions particulières', 'Special agreements', RW);
    content(MID, y + 15, [[ship.incoterm, ship.incoterm_location].filter(Boolean).join(' ')], RW, 7);

    // ---- Mal tablosu 6-12 ----
    y = 272;
    const cols = [
      { n: 6, fr: 'Marques et numéros', en: 'Marks and Nos', w: 76 },
      { n: 7, fr: 'Nombre des colis', en: 'Number of packages', w: 44 },
      { n: 8, fr: "Mode d'emballage", en: 'Method of packing', w: 56 },
      { n: 9, fr: 'Nature de la marchandise', en: 'Nature of the goods', w: 173 },
      { n: 10, fr: 'N° statistique', en: 'Statistical number', w: 72 },
      { n: 11, fr: 'Poids brut, kg', en: 'Gross weight, kg', w: 64 },
      { n: 12, fr: 'Cubage m³', en: 'Volume m³', w: 62 },
    ];
    const HEAD_H = 22, TABLE_H = 158;
    let cx = X0;
    for (const c of cols) {
      box(cx, y, c.w, HEAD_H);
      doc.font(F.bold).fontSize(6).fillColor(CMR_RED).text(String(c.n), cx + 2, y + 2, { lineBreak: false });
      doc.font(F.regular).fontSize(5.6).fillColor(CMR_RED).text(c.fr, cx + 2, y + 8, { width: c.w - 4 });
      box(cx, y + HEAD_H, c.w, TABLE_H);
      c.x = cx; cx += c.w;
    }
    let ry = y + HEAD_H + 5;
    doc.font(F.regular).fontSize(7).fillColor(INK);
    for (const r of rows.slice(0, 9)) {
      const cell = (i, v, align) =>
        doc.text(String(v == null ? '' : v), cols[i].x + 3, ry, { width: cols[i].w - 6, align: align || 'left', lineBreak: false, ellipsis: true });
      cell(0, '—');
      cell(1, r.quantity || '', 'right');
      cell(2, r.package_type || ship.package_type || '');
      cell(3, r.description || '');
      cell(4, r.hs_code || '');
      cell(5, r.gross_weight ? Number(r.gross_weight).toFixed(1) : '', 'right');
      cell(6, r.volume_cbm ? Number(r.volume_cbm).toFixed(2) : '', 'right');
      ry += 13;
    }
    // Toplam satırı
    const ty = y + HEAD_H + TABLE_H - 14;
    doc.moveTo(X0, ty - 3).lineTo(X0 + W, ty - 3).lineWidth(0.5).strokeColor(CMR_RED).stroke();
    doc.font(F.bold).fontSize(7).fillColor(INK);
    doc.text('TOTAL', cols[0].x + 3, ty, { lineBreak: false });
    doc.text(String(tot.qty || ship.quantity || ''), cols[1].x + 3, ty, { width: cols[1].w - 6, align: 'right', lineBreak: false });
    doc.text((tot.gross || ship.gross_weight) ? Number(tot.gross || ship.gross_weight).toFixed(1) : '', cols[5].x + 3, ty, { width: cols[5].w - 6, align: 'right', lineBreak: false });
    doc.text((tot.vol || ship.volume_cbm) ? Number(tot.vol || ship.volume_cbm).toFixed(2) : '', cols[6].x + 3, ty, { width: cols[6].w - 6, align: 'right', lineBreak: false });

    // ADR satırı
    y = y + HEAD_H + TABLE_H;
    box(X0, y, W, 18);
    doc.font(F.regular).fontSize(6).fillColor(MUTED).text(
      `UN No: ${ship.dangerous_goods ? (ship.adr_code || '') : '—'}    Classe: ___    Chiffre: ___    Lettre: ___    (ADR)${ship.dangerous_goods ? '   MARCHANDISES DANGEREUSES' : ''}`,
      X0 + 5, y + 5, { lineBreak: false });

    // ---- 13 | 20 ----
    y += 18;
    box(X0, y, LW, 46); label(X0, y, 13, "Instructions de l'expéditeur (formalités douanières et autres)", "Sender's instructions");
    box(MID, y, RW, 46); label(MID, y, 20, 'À payer par', 'To be paid by', RW);
    doc.font(F.regular).fontSize(6).fillColor(MUTED);
    doc.text("Expéditeur  /  Destinataire", MID + 6, y + 18, { lineBreak: false });
    doc.text('Prix de transport : ______________', MID + 6, y + 28, { lineBreak: false });

    // ---- 14/15 | 21 ----
    y += 46;
    box(X0, y, LW, 26); label(X0, y, 14, "Prescription d'affranchissement", 'Instruction as to payment for carriage');
    doc.font(F.regular).fontSize(7).fillColor(INK).text('Franco  [  ]        Non franco  [  ]', X0 + 6, y + 15, { lineBreak: false });
    box(X0, y + 26, LW, 26); label(X0, y + 26, 15, 'Remboursement', 'Cash on delivery');
    box(MID, y, RW, 52); label(MID, y, 21, 'Établie à', 'Established in', RW);
    content(MID, y + 16, [
      `${COMPANY.city || 'LOUVRES'}, ${COMPANY.country || 'France'}`,
      `le ${fmtDate(new Date())}`,
    ], RW, 7.5);

    // ---- 22 / 23 / 24 imza kutuları ----
    y += 52;
    const SW = Math.round(W / 3);
    const sigH = 84;
    const sig = (i, x, w, num, fr, en) => {
      box(x, y, w, sigH);
      doc.font(F.bold).fontSize(6.5).fillColor(CMR_RED).text(String(num), x + 3, y + 3, { lineBreak: false });
      doc.font(F.regular).fontSize(5.6).fillColor(MUTED)
        .text(`${fr}\n${en}`, x + 4, y + sigH - 18, { width: w - 8, align: 'center', lineGap: 0.5 });
    };
    sig(0, X0, SW, 22, "Signature et timbre de l'expéditeur", 'Signature and stamp of the sender');
    sig(1, X0 + SW, SW, 23, 'Signature et timbre du transporteur', 'Signature and stamp of the carrier');
    sig(2, X0 + 2 * SW, W - 2 * SW, 24, 'Réception des marchandises — Signature et timbre du destinataire', 'Goods received — signature and stamp of the consignee');
    doc.font(F.regular).fontSize(6).fillColor(MUTED)
      .text(`Date: ____ / ____ / ______`, X0 + 2 * SW + 6, y + 16, { lineBreak: false });

    // ---- Alt şerit: plakalar ----
    y += sigH;
    box(X0, y, W, 22);
    doc.font(F.regular).fontSize(7).fillColor(INK).text(
      `Véhicule / Kfz: ${veh ? veh.plate || '—' : '—'}      Remorque / Anhänger: ${veh && veh.trailer_plate ? veh.trailer_plate : '—'}      Transporteur: ${veh && veh.carrier_name ? veh.carrier_name : (COMPANY.name || '')}`,
      X0 + 6, y + 7, { lineBreak: false, width: W - 12, ellipsis: true });

    // Footer
    doc.font(F.regular).fontSize(6).fillColor(MUTED).text(
      `${COMPANY.name} — ${addressLines().join(' · ')}   |   Dossier: ${ship.shipment_no}`,
      X0, 812, { width: W, align: 'center', lineBreak: false });

    doc.end();
  } catch (err) {
    console.error('[pdf/cmr]', err);
    if (!res.headersSent) sendError(res, 'CMR oluşturulamadı', 500);
  }
});

// ============================================================
// Bill of Lading / Sea Waybill (denizyolu) — Yusen örneği baz
// ============================================================
router.get('/bill-of-lading/:shipmentId', verifyTokenFlexible, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id, req.user);
    if (!ship) return sendError(res, 'Sevkiyat bulunamadı', 404);

    const md = parseJsonField(ship.mode_data) || {};
    const parties = await loadParties(ship);
    const containers = await loadVehicles(id);
    const rows = goodsRows(ship);
    const tot = totalsOf(rows);
    // Musteri istegi: B/L numarasi dosya numarasiyla ayni olsun.
    // Girilmis MBL/HBL kaybolmasin diye referans kutusunda gosterilir.
    const blNo = ship.shipment_no;

    setupPdfHeaders(res, `BL_${ship.shipment_no}.pdf`);
    await logAudit(req, 'download', 'documents', id, `bill-of-lading/${ship.shipment_no}`);

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    doc.pipe(res);
    const F = setupFonts(doc);

    const X0 = 24, W = 547, MID = 318;
    const LW = MID - X0, RW = X0 + W - MID;
    const box = (x, y, w, h) => doc.rect(x, y, w, h).lineWidth(0.7).strokeColor(INK).stroke();
    const lab = (x, y, txt, w) => doc.font(F.bold).fontSize(6.5).fillColor(INK)
      .text(txt, x + 4, y + 3, { width: (w || LW) - 8, lineBreak: false, ellipsis: true });
    const content = (x, y, lines, w, size) => {
      doc.font(F.regular).fontSize(size || 7.5).fillColor(INK);
      let cy = y;
      for (const l of lines) {
        doc.text(String(l), x + 5, cy, { width: (w || LW) - 10, lineBreak: false, ellipsis: true });
        cy += (size || 7.5) + 2.2;
      }
    };

    // ---- Shipper | başlık ----
    let y = 24;
    box(X0, y, LW, 84); lab(X0, y, 'Shipper / Expéditeur');
    content(X0, y + 14, parties.sender.slice(0, 6));

    if (hasLogo()) {
      // 695x163 -> 110pt genislik = ~26pt yukseklik (B/L No. kutusuna degmesin)
      doc.image(LOGO_WIDE, MID + 6, y + 5, { width: 110 });
    } else {
      doc.font(F.bold).fontSize(12).fillColor(NAVY).text(COMPANY.name, MID + 6, y + 2, { width: RW - 10 });
      if (COMPANY.tagline) doc.font(F.regular).fontSize(6.5).fillColor(MUTED)
        .text(COMPANY.tagline, MID + 6, y + 17, { width: RW - 10, characterSpacing: 1 });
    }
    box(MID + RW - 130, y, 130, 26); lab(MID + RW - 130, y, 'B/L No.', 130);
    doc.font(F.bold).fontSize(9).fillColor(INK).text(blNo, MID + RW - 126, y + 12, { lineBreak: false });
    doc.font(F.bold).fontSize(10).fillColor(INK)
      .text('SEA WAYBILL / BILL OF LADING', MID + 6, y + 40, { width: RW - 10 });
    doc.font(F.regular).fontSize(7).fillColor(MUTED)
      .text('for Multimodal Transport or Ocean Transport', MID + 6, y + 54, { width: RW - 10 });
    doc.font(F.bold).fontSize(8).fillColor(CMR_RED).text('NON-NEGOTIABLE — COPY', MID + 6, y + 66, { lineBreak: false });

    // ---- Consignee | referanslar ----
    y = 108;
    box(X0, y, LW, 70); lab(X0, y, 'Consignee / Destinataire');
    content(X0, y + 14, parties.receiver.slice(0, 5));
    box(MID, y, RW, 35); lab(MID, y, "Export/Import Reference (for the Merchant's reference only)", RW);
    content(MID, y + 14, [ship.client_reference || ''], RW);
    box(MID, y + 35, RW, 35); lab(MID, y + 35, "Forwarding Agent Reference", RW);
    content(MID, y + 49, [parties.agent[0], md.mbl_no ? `MBL: ${md.mbl_no}` : (md.hbl_no ? `HBL: ${md.hbl_no}` : '')].filter(Boolean).slice(0, 2), RW, 7);

    // ---- Notify | menşe ----
    y = 178;
    box(X0, y, LW, 62); lab(X0, y, 'Notify Party');
    content(X0, y + 14, (parties.client.length ? parties.client : [COMPANY.name]).slice(0, 4));
    box(MID, y, RW, 62); lab(MID, y, 'Point and Country of Origin of the Goods', RW);
    content(MID, y + 14, [ship.departure_country || ''], RW);

    // ---- Rota bandı ----
    y = 240;
    const half = Math.round(LW / 2);
    box(X0, y, half, 26); lab(X0, y, 'Pre-carriage by', half);
    box(X0 + half, y, LW - half, 26); lab(X0 + half, y, 'Place of Receipt', LW - half);
    content(X0 + half, y + 12, [md.pol || ship.departure_country || ''], LW - half, 7);
    box(MID, y, RW, 26); lab(MID, y, 'Final Destination (for the Merchant\'s reference only)', RW);
    content(MID, y + 12, [ship.arrival_country || ''], RW, 7);

    y += 26;
    box(X0, y, half, 26); lab(X0, y, 'Port of Loading', half);
    content(X0, y + 12, [md.pol || ''], half, 7.5);
    box(X0 + half, y, LW - half, 26); lab(X0 + half, y, 'Port of Discharge', LW - half);
    content(X0 + half, y + 12, [md.pod || ''], LW - half, 7.5);
    box(MID, y, RW, 26); lab(MID, y, 'Place of Delivery', RW);
    content(MID, y + 12, [ship.client_delivery_address || ship.arrival_country || ''], RW, 7);

    y += 26;
    box(X0, y, half, 26); lab(X0, y, 'Ocean Vessel', half);
    content(X0, y + 12, [md.vessel_name || ''], half, 7.5);
    box(X0 + half, y, LW - half, 26); lab(X0 + half, y, 'Voy. No.', LW - half);
    content(X0 + half, y + 12, [md.voyage_no || ''], LW - half, 7.5);
    box(MID, y, RW, 26); lab(MID, y, 'Carrier / Operator', RW);
    content(MID, y + 12, [md.operator || ''], RW, 7);

    // ---- Mal tablosu ----
    y += 32;
    const cols = [
      { t: 'Container No. / Seal No.\nMarks & Nos.', w: 118 },
      { t: 'No. & Kind of Pkgs.', w: 72 },
      { t: 'Description of Goods', w: 197 },
      { t: 'Gross Weight (KGS)', w: 84 },
      { t: 'Measurement (CBM)', w: 76 },
    ];
    const TH = 20, TB = 226;
    let cx = X0;
    for (const c of cols) {
      box(cx, y, c.w, TH);
      doc.font(F.bold).fontSize(6.2).fillColor(INK).text(c.t, cx + 3, y + 3, { width: c.w - 6, lineGap: 0.5 });
      box(cx, y + TH, c.w, TB);
      c.x = cx; cx += c.w;
    }
    let ry = y + TH + 6;
    doc.font(F.regular).fontSize(7).fillColor(INK);
    // Konteyner numaralari: gemi kaydindaki "Konteyner Numaralari" alanindan
    // (virgul/satir ayrimli coklu numara). Alan bossa eski davranis: plaka.
    const containerNos = [];
    for (const c of containers) {
      const nos = String(c.container_numbers || '').split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
      if (nos.length) {
        for (const n of nos) containerNos.push(n);
      } else if (c.plate) {
        containerNos.push(`${c.plate}${c.trailer_plate ? ' / ' + c.trailer_plate : ''}`);
      }
    }
    for (const n of containerNos.slice(0, 14)) {
      doc.text(clip(n, 26), cols[0].x + 3, ry, { lineBreak: false });
      ry += 11;
    }
    if (containerNos.length === 0) ry += 2;
    const containerTotal = containers.reduce((sum, c) => {
      const parsed = String(c.container_numbers || '').split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean).length;
      return sum + (parseInt(c.container_count, 10) || parsed || 1);
    }, 0);
    // Kalemler
    let gy = y + TH + 6;
    for (const r of rows.slice(0, 12)) {
      const line = `${r.description || ''}${r.quantity ? '  ' + r.quantity + ' ' + (r.package_type || 'PKG') : ''}${r.gross_weight ? '  ' + Number(r.gross_weight).toFixed(0) + ' KG' : ''}`;
      doc.text(line, cols[2].x + 3, gy, { width: cols[2].w - 6, lineBreak: false, ellipsis: true });
      if (r.hs_code) { gy += 10; doc.fillColor(MUTED).fontSize(6.5).text(`HS CODE: ${r.hs_code}`, cols[2].x + 3, gy, { lineBreak: false }); doc.fillColor(INK).fontSize(7); }
      gy += 13;
    }
    doc.text(String(tot.qty ? `${tot.qty} ${ship.package_type || 'PKG'}` : ''), cols[1].x + 3, y + TH + 6, { width: cols[1].w - 6, align: 'right', lineBreak: false });
    doc.text(tot.gross ? Number(tot.gross).toFixed(2) : '', cols[3].x + 3, y + TH + 6, { width: cols[3].w - 6, align: 'right', lineBreak: false });
    doc.text(tot.vol ? Number(tot.vol).toFixed(3) : '', cols[4].x + 3, y + TH + 6, { width: cols[4].w - 6, align: 'right', lineBreak: false });
    // Toplam satırı
    const tly = y + TH + TB - 14;
    doc.moveTo(X0, tly - 3).lineTo(X0 + W, tly - 3).lineWidth(0.5).strokeColor(INK).stroke();
    doc.font(F.bold).fontSize(7.5);
    doc.text(`${tot.qty || ship.quantity || 0} ${ship.package_type || 'PACKAGE(S)'}`, cols[1].x - 40, tly, { width: cols[1].w + 40, align: 'right', lineBreak: false });
    doc.text(Number(tot.gross || ship.gross_weight || 0).toFixed(2), cols[3].x + 3, tly, { width: cols[3].w - 6, align: 'right', lineBreak: false });
    doc.text(Number(tot.vol || ship.volume_cbm || 0).toFixed(3), cols[4].x + 3, tly, { width: cols[4].w - 6, align: 'right', lineBreak: false });

    // ---- Toplam yazıyla + freight ----
    y = y + TH + TB;
    box(X0, y, W, 20);
    lab(X0, y, 'Total Number of Containers or Packages received by the Carrier', W);
    doc.font(F.regular).fontSize(7.5).fillColor(INK).text(
      `${containerTotal ? containerTotal + ' CONTAINER(S) — ' : ''}${tot.qty || ship.quantity || 0} ${ship.package_type || 'PACKAGE(S)'}`,
      X0 + 280, y + 7, { lineBreak: false });

    y += 20;
    const fh = 78;
    box(X0, y, 260, fh); lab(X0, y, 'Freight & Charges', 260);
    box(X0 + 260, y, 145, 26); lab(X0 + 260, y, 'Prepaid at', 145);
    box(X0 + 260, y + 26, 145, 26); lab(X0 + 260, y + 26, 'Payable at', 145);
    box(X0 + 260, y + 52, 145, 26); lab(X0 + 260, y + 52, 'Number of Original B/L(s)', 145);
    box(X0 + 405, y, W - 405, 26); lab(X0 + 405, y, 'Place and Date of Issue', W - 405);
    content(X0 + 405, y + 12, [`${COMPANY.city || 'LOUVRES'}, ${fmtDate(new Date())}`], W - 405, 7);
    box(X0 + 405, y + 26, W - 405, 52); lab(X0 + 405, y + 26, 'As Carrier / Agent', W - 405);
    content(X0 + 405, y + 40, [COMPANY.name, 'By: ____________________'], W - 405, 7);

    // ---- Laden on board ----
    y += fh;
    box(X0, y, 260, 44); lab(X0, y, 'For Delivery of Goods Please Apply to', 260);
    content(X0, y + 14, (parties.agent.length ? parties.agent : [COMPANY.name, COMPANY.phone ? 'Tel: ' + COMPANY.phone : '']).slice(0, 3), 260, 7);
    box(X0 + 260, y, W - 260, 44); lab(X0 + 260, y, 'Laden on Board the Vessel', W - 260);
    content(X0 + 260, y + 14, [
      [md.vessel_name, md.voyage_no].filter(Boolean).join(' / '),
      `Date: ${fmtDate(md.atd || md.etd) || '—'}`,
    ], W - 260, 7);

    doc.font(F.regular).fontSize(6).fillColor(MUTED).text(
      `${COMPANY.name} — ${addressLines().join(' · ')}   |   Dossier: ${ship.shipment_no}`,
      X0, 812, { width: W, align: 'center', lineBreak: false });

    doc.end();
  } catch (err) {
    console.error('[pdf/bill-of-lading]', err);
    if (!res.headersSent) sendError(res, 'B/L oluşturulamadı', 500);
  }
});

// ============================================================
// Air Waybill (havayolu) — IATA düzeni
// ============================================================
router.get('/air-waybill/:shipmentId', verifyTokenFlexible, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id, req.user);
    if (!ship) return sendError(res, 'Sevkiyat bulunamadı', 404);

    const md = parseJsonField(ship.mode_data) || {};
    const parties = await loadParties(ship);
    const rows = goodsRows(ship);
    const tot = totalsOf(rows);
    const awbNo = md.mawb_no || md.hawb_no || ship.shipment_no;

    setupPdfHeaders(res, `AWB_${ship.shipment_no}.pdf`);
    await logAudit(req, 'download', 'documents', id, `air-waybill/${ship.shipment_no}`);

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    doc.pipe(res);
    const F = setupFonts(doc);

    const X0 = 24, W = 547, MID = 318;
    const LW = MID - X0, RW = X0 + W - MID;
    const box = (x, y, w, h) => doc.rect(x, y, w, h).lineWidth(0.7).strokeColor(INK).stroke();
    const lab = (x, y, txt, w) => doc.font(F.bold).fontSize(6.2).fillColor(INK)
      .text(txt, x + 4, y + 3, { width: (w || LW) - 8, lineBreak: false, ellipsis: true });
    const content = (x, y, lines, w, size) => {
      doc.font(F.regular).fontSize(size || 7.5).fillColor(INK);
      let cy = y;
      for (const l of lines) {
        doc.text(String(l), x + 5, cy, { width: (w || LW) - 10, lineBreak: false, ellipsis: true });
        cy += (size || 7.5) + 2.2;
      }
    };

    // ---- Üst: AWB no + başlık ----
    let y = 24;
    box(X0, y, 120, 24);
    doc.font(F.bold).fontSize(10).fillColor(INK).text(awbNo, X0 + 6, y + 7, { lineBreak: false });
    doc.font(F.bold).fontSize(13).fillColor(NAVY).text('AIR WAYBILL', MID + 6, y + 2, { lineBreak: false });
    doc.font(F.regular).fontSize(6.5).fillColor(MUTED)
      .text(clip(`Issued by: ${COMPANY.name} — ${addressLines()[0] || ''}`, 70), MID + 6, y + 17, { lineBreak: false });
    doc.font(F.regular).fontSize(5.6).fillColor(MUTED)
      .text('Copies 1, 2 and 3 of this Air Waybill are originals and have the same validity.', X0, y + 26, { lineBreak: false });

    // ---- Shipper / Consignee ----
    y = 58;
    box(X0, y, LW, 66); lab(X0, y, "Shipper's Name and Address");
    content(X0, y + 13, parties.sender.slice(0, 5));
    box(MID, y, RW, 66); lab(MID, y, "Shipper's Account Number", RW);

    y = 124;
    box(X0, y, LW, 66); lab(X0, y, "Consignee's Name and Address");
    content(X0, y + 13, parties.receiver.slice(0, 5));
    box(MID, y, RW, 66); lab(MID, y, 'Notify / Also Notify', RW);
    content(MID, y + 13, parties.client.slice(0, 4), RW, 7);

    // ---- Agent / routing ----
    y = 190;
    box(X0, y, LW, 34); lab(X0, y, "Issuing Carrier's Agent, Name and City");
    content(X0, y + 13, [COMPANY.name, COMPANY.city || ''], LW, 7);
    box(MID, y, RW, 34); lab(MID, y, 'Accounting Information', RW);
    content(MID, y + 13, [ship.client_reference ? `Ref: ${ship.client_reference}` : ''], RW, 7);

    y = 224;
    const q = Math.round(W / 4);
    box(X0, y, q, 26); lab(X0, y, 'Airport of Departure', q);
    content(X0, y + 12, [md.origin_airport || ''], q, 8);
    box(X0 + q, y, q, 26); lab(X0 + q, y, 'Airport of Destination', q);
    content(X0 + q, y + 12, [md.dest_airport || ''], q, 8);
    box(X0 + 2 * q, y, q, 26); lab(X0 + 2 * q, y, 'Flight / Date', q);
    content(X0 + 2 * q, y + 12, [[[md.airline_code, md.flight_no].filter(Boolean).join(' '), fmtDate(md.flight_date)].filter(Boolean).join(' — ')], q, 7.5);
    box(X0 + 3 * q, y, W - 3 * q, 26); lab(X0 + 3 * q, y, 'Currency / Declared Value', W - 3 * q);
    content(X0 + 3 * q, y + 12, [`${ship.currency_code || 'EUR'}   Carriage: NVD   Customs: NCV`], W - 3 * q, 6.5);

    y = 250;
    box(X0, y, W, 24); lab(X0, y, 'Handling Information', W);
    content(X0, y + 11, [ship.goods_description || ''], W, 7);

    // ---- Mal tablosu ----
    y = 282;
    const cols = [
      { t: 'No. of\nPieces RCP', w: 52 },
      { t: 'Gross\nWeight (kg)', w: 62 },
      { t: 'Rate Class', w: 46 },
      { t: 'Chargeable\nWeight (kg)', w: 66 },
      { t: 'Rate / Charge', w: 62 },
      { t: 'Total', w: 62 },
      { t: 'Nature and Quantity of Goods (incl. Dimensions or Volume)', w: 197 },
    ];
    const TH = 22, TB = 170;
    let cx = X0;
    for (const c of cols) {
      box(cx, y, c.w, TH);
      doc.font(F.bold).fontSize(6).fillColor(INK).text(c.t, cx + 3, y + 3, { width: c.w - 6, lineGap: 0.5 });
      box(cx, y + TH, c.w, TB);
      c.x = cx; cx += c.w;
    }
    let ry = y + TH + 6;
    doc.font(F.regular).fontSize(7).fillColor(INK);
    for (const r of rows.slice(0, 10)) {
      doc.text(String(r.quantity || ''), cols[0].x + 3, ry, { width: cols[0].w - 6, align: 'right', lineBreak: false });
      doc.text(r.gross_weight ? Number(r.gross_weight).toFixed(1) : '', cols[1].x + 3, ry, { width: cols[1].w - 6, align: 'right', lineBreak: false });
      doc.text(clip(`${r.description || ''}${r.hs_code ? '  (HS ' + r.hs_code + ')' : ''}${r.volume_cbm ? '  ' + Number(r.volume_cbm).toFixed(2) + ' m3' : ''}`, 54),
        cols[6].x + 3, ry, { lineBreak: false });
      ry += 13;
    }
    const tly = y + TH + TB - 14;
    doc.moveTo(X0, tly - 3).lineTo(X0 + W, tly - 3).lineWidth(0.5).strokeColor(INK).stroke();
    doc.font(F.bold).fontSize(7.5);
    doc.text(String(tot.qty || ship.quantity || 0), cols[0].x + 3, tly, { width: cols[0].w - 6, align: 'right', lineBreak: false });
    doc.text(Number(tot.gross || ship.gross_weight || 0).toFixed(1), cols[1].x + 3, tly, { width: cols[1].w - 6, align: 'right', lineBreak: false });
    doc.text(md.chargeable_weight ? Number(md.chargeable_weight).toFixed(1) : '', cols[3].x + 3, tly, { width: cols[3].w - 6, align: 'right', lineBreak: false });
    doc.text('TOTAL', cols[6].x + 3, tly, { lineBreak: false });

    // ---- Alt: beyan + imzalar ----
    y = y + TH + TB + 6;
    box(X0, y, W, 34);
    doc.font(F.regular).fontSize(6.2).fillColor(INK).text(
      'Shipper certifies that the particulars on the face hereof are correct and that insofar as any part of the consignment contains dangerous goods, such part is properly described by name and is in proper condition for carriage by air according to the applicable Dangerous Goods Regulations.',
      X0 + 5, y + 4, { width: W - 10, lineGap: 0.6 });
    doc.font(F.regular).fontSize(6.5).fillColor(MUTED)
      .text('Signature of Shipper or his Agent: ________________________________', X0 + 5, y + 24, { lineBreak: false });

    y += 40;
    box(X0, y, W, 30);
    doc.font(F.regular).fontSize(7).fillColor(INK).text(
      `Executed on ${fmtDate(new Date())} at ${COMPANY.city || 'LOUVRES'}`, X0 + 5, y + 5, { lineBreak: false });
    doc.font(F.regular).fontSize(6.5).fillColor(MUTED)
      .text('Signature of Issuing Carrier or its Agent: ________________________________', X0 + 5, y + 17, { lineBreak: false });

    doc.font(F.regular).fontSize(6).fillColor(MUTED).text(
      `${COMPANY.name} — ${addressLines().join(' · ')}   |   Dossier: ${ship.shipment_no}   |   AWB: ${awbNo}`,
      X0, 812, { width: W, align: 'center', lineBreak: false });

    doc.end();
  } catch (err) {
    console.error('[pdf/air-waybill]', err);
    if (!res.headersSent) sendError(res, 'AWB oluşturulamadı', 500);
  }
});

module.exports = router;
