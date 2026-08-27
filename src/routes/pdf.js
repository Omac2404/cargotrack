const express = require('express');
const PDFDocument = require('pdfkit');
const bwipjs = require('bwip-js');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { verifyToken, hasRole } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const { toInt, sendError } = require('../helpers/utils');
const { COMPANY, addressLines, identityLines, bankLines, legalFooterLines } = require('../config/company');

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

// ============================================================
// Font yönetimi — Türkçe/Fransızca karakterler
// ============================================================
// PDFKit'in yerleşik Helvetica'sı WinAnsi kodlamasındadır; ş, ğ, ı, İ, Ş, Ğ ve →
// gibi karakterleri sessizce bozar ("HİZMET / KALEM" → "H ¤ÔUB ò ´ÄTÐ").
// Çözüm: tam Unicode kapsayan bir TTF gömmek. Docker imajında ttf-dejavu kurulu;
// yerel geliştirmede Windows/macOS/Linux'taki yaygın yollar da denenir.
const FONT_CANDIDATES = {
  regular: [
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/TTF/DejaVuSans.ttf',
    '/Library/Fonts/Arial Unicode.ttf',
    'C:/Windows/Fonts/arial.ttf',
  ],
  bold: [
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
  ],
};

function firstExisting(paths) {
  for (const p of paths) {
    try { if (fs.existsSync(p)) return p; } catch { /* yoksay */ }
  }
  return null;
}

const UNICODE_FONT = {
  regular: firstExisting(FONT_CANDIDATES.regular),
  bold: firstExisting(FONT_CANDIDATES.bold),
};

if (!UNICODE_FONT.regular) {
  console.warn('[pdf] Unicode font bulunamadı — PDF metinleri ASCII\'ye çevrilerek basılacak. ' +
    'Docker imajında `ttf-dejavu` paketi kurulu olmalı.');
}

/** Türkçe/Fransızca harfleri WinAnsi'de okunabilir karşılıklarına indirger. */
const ASCII_MAP = {
  'ş': 's', 'Ş': 'S', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
  '→': '->', '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '€': 'EUR',
};
function toAscii(s) {
  return String(s).replace(/[şŞğĞıİ→’“”–—€]/g, (c) => ASCII_MAP[c] ?? c);
}

/**
 * Belge için font adlarını hazırlar. Unicode font varsa gömer; yoksa yerleşik
 * Helvetica'ya düşer ve metinleri ASCII'ye indirger (bozuk sembol basmaktansa
 * "HIZMET" yazmak yeğdir).
 */
function setupFonts(doc) {
  if (UNICODE_FONT.regular) {
    doc.registerFont('Body', UNICODE_FONT.regular);
    doc.registerFont('BodyBold', UNICODE_FONT.bold || UNICODE_FONT.regular);
    return { regular: 'Body', bold: 'BodyBold', italic: 'Body' };
  }
  const originalText = doc.text.bind(doc);
  doc.text = (txt, ...rest) => originalText(typeof txt === 'string' ? toAscii(txt) : txt, ...rest);
  return { regular: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique' };
}

// ============================================================
// Proforma fatura — Fransızca sözlükler
// ============================================================
// Fatura Fransız müşteriye/gümrüğe gittiği için proforma tamamen Fransızca
// basılır. Diğer PDF'ler (dosya kapağı, depo raporu) mevcut dilinde kalır.

/** Finansal kalem anahtarı → Fransızca ad. Anahtarlar FIN_SCHEMAS ile aynı. */
const FIN_LABELS_FR = {
  navlun: 'Fret',
  thc_origin: 'THC départ (manutention terminal)',
  thc_dest: 'THC destination (manutention terminal)',
  bl_fee: 'Frais de B/L',
  awb_fee: 'Frais de LTA (AWB)',
  baf: 'BAF (ajustement carburant)',
  caf: 'CAF (ajustement devise)',
  fuel_surcharge: 'Surcharge carburant',
  security_surcharge: 'Surcharge sûreté',
  xray_fee: 'Scanner / rayons X',
  handling_origin: 'Manutention départ',
  handling_dest: 'Manutention destination',

  ihracat_gumruk: 'Douane export',
  cikis_tasima: 'Transport / manutention (départ)',
  cikis_ic_nakliye: 'Transport intérieur (départ)',
  cikis_nakliye: 'Transport intérieur (vers le port)',
  cikis_depolama: 'Stockage (départ)',
  cikis_sigorta: 'Assurance (départ)',
  demurrage_origin: 'Surestaries (départ)',

  ithalat_gumruk: 'Douane import',
  varis_depo: 'Entrepôt / manutention (destination)',
  varis_depolama: 'Stockage / manutention (destination)',
  varis_ic_nakliye: 'Transport intérieur (destination)',
  varis_liman: 'Frais portuaires',
  varis_sigorta: 'Assurance (destination)',
  demurrage_dest: 'Surestaries / détention (destination)',

  ith_tva: 'TVA',
  ith_droit_douane: 'Droit de douane',
  ith_taxe_parafiscal: 'Taxe parafiscale',
  ith_anti_dumping: 'Droit anti-dumping',
  ith_droit_porte: 'Droit de port',
  ith_frais_t1: 'Frais de T1',
  ith_forfait_dedouanement: 'Forfait dédouanement',
  ith_frais_bad: 'Frais de BAD',
  ith_stop_douane: 'Stop douane',

  sigorta: 'Assurance',
  diger: 'Divers',
};

/** Ödeme tipi → Fransızca. */
const PAYMENT_FR = {
  havale: 'Virement bancaire',
  cek: 'Chèque',
  nakit: 'Espèces',
  kredi_karti: 'Carte bancaire',
  akreditif: 'Crédit documentaire',
  vesaik: 'Remise documentaire',
  diger: 'Autre',
};

/** Ülke adları veritabanında Türkçe saklanıyor; faturada Fransızca gösterilir. */
const COUNTRY_FR = {
  'Türkiye': 'Turquie', 'Almanya': 'Allemagne', 'Fransa': 'France', 'İtalya': 'Italie',
  'İspanya': 'Espagne', 'Hollanda': 'Pays-Bas', 'Belçika': 'Belgique', 'Polonya': 'Pologne',
  'Romanya': 'Roumanie', 'Bulgaristan': 'Bulgarie', 'Yunanistan': 'Grèce', 'Avusturya': 'Autriche',
  'Çekya': 'Tchéquie', 'Macaristan': 'Hongrie', 'Slovakya': 'Slovaquie', 'Hırvatistan': 'Croatie',
  'Sırbistan': 'Serbie', 'İsviçre': 'Suisse', 'Norveç': 'Norvège', 'İsveç': 'Suède',
  'Danimarka': 'Danemark', 'Finlandiya': 'Finlande', 'Portekiz': 'Portugal', 'İrlanda': 'Irlande',
  'İngiltere': 'Royaume-Uni', 'Rusya': 'Russie', 'Ukrayna': 'Ukraine', 'Belarus': 'Biélorussie',
  'Gürcistan': 'Géorgie', 'Azerbaycan': 'Azerbaïdjan', 'İran': 'Iran', 'Irak': 'Irak',
  'Suriye': 'Syrie', 'Lübnan': 'Liban', 'İsrail': 'Israël', 'Mısır': 'Égypte',
  'Libya': 'Libye', 'Fas': 'Maroc', 'Tunus': 'Tunisie', 'Cezayir': 'Algérie',
  'S. Arabistan': 'Arabie saoudite', 'BAE': 'Émirats arabes unis', 'Katar': 'Qatar',
  'Kuveyt': 'Koweït', 'ABD': 'États-Unis', 'Kanada': 'Canada', 'Meksika': 'Mexique',
  'Brezilya': 'Brésil', 'Arjantin': 'Argentine', 'Çin': 'Chine', 'Japonya': 'Japon',
  'Güney Kore': 'Corée du Sud', 'Hindistan': 'Inde', 'Pakistan': 'Pakistan',
  'Kazakistan': 'Kazakhstan', 'Özbekistan': 'Ouzbékistan', 'Türkmenistan': 'Turkménistan',
};
const countryFr = (name) => COUNTRY_FR[String(name || '').trim()] || name || '—';

/**
 * Antet görseli — bir kez çözümlenir. Dosya yoksa metin antede düşülür.
 * PNG başlığından oran okunur ki yükseklik sabit varsayılmasın.
 */
const letterheadFile = (() => {
  try {
    return fs.existsSync(COMPANY.letterheadPath) ? COMPANY.letterheadPath : null;
  } catch { return null; }
})();

const letterheadRatio = (() => {
  if (!letterheadFile) return 1;
  try {
    const head = fs.readFileSync(letterheadFile).subarray(0, 33);
    if (head.subarray(1, 4).toString() !== 'PNG') return 1;
    const w = head.readUInt32BE(16), h = head.readUInt32BE(20);
    return w > 0 ? h / w : 1;
  } catch { return 1; }
})();

if (!letterheadFile) {
  console.warn(`[pdf] Antet görseli bulunamadı (${COMPANY.letterheadPath}) — metin antet kullanılacak.`);
}

/** Fransız biçiminde sayı: 1 895,00 */
function formatFr(n, decimals = 2) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(Number(n) || 0);
}

/** Fransız biçiminde tarih: 18/08/2026 */
function formatDateFr(d) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Finansal kalem anahtarı → insan-okunabilir ad (Türkçe).
 * Dosya kapağı gibi Türkçe kalan belgeler için.
 */
const FIN_LABELS = {
  navlun: 'Navlun',
  thc_origin: 'THC Çıkış (Terminal Handling)',
  thc_dest: 'THC Varış (Terminal Handling)',
  bl_fee: 'B/L Fee (Konşimento Ücreti)',
  awb_fee: 'AWB Fee (Konşimento Ücreti)',
  baf: 'BAF (Yakıt Düzeltme)',
  caf: 'CAF (Para Birimi Düzeltme)',
  fuel_surcharge: 'Fuel Surcharge (Yakıt Eki)',
  security_surcharge: 'Security Surcharge (Güvenlik Eki)',
  xray_fee: 'X-Ray / Tarama',
  handling_origin: 'Handling Çıkış',
  handling_dest: 'Handling Varış',

  ihracat_gumruk: 'İhracat Gümrük',
  cikis_tasima: 'Taşıma / Elleçleme',
  cikis_ic_nakliye: 'İç Nakliye',
  cikis_nakliye: 'İç Nakliye (Limana)',
  cikis_depolama: 'Depolama',
  cikis_sigorta: 'Sigorta',
  demurrage_origin: 'Demuraj (Çıkış)',

  ithalat_gumruk: 'İthalat Gümrük',
  varis_depo: 'Depo / Elleçleme',
  varis_depolama: 'Depolama / Elleçleme',
  varis_ic_nakliye: 'İç Nakliye',
  varis_liman: 'Liman Masrafları',
  varis_sigorta: 'Sigorta',
  demurrage_dest: 'Demuraj / Detention (Varış)',

  ith_tva: 'TVA (KDV)',
  ith_droit_douane: 'Droit Douane (Gümrük Vergisi)',
  ith_taxe_parafiscal: 'Taxe Parafiscal',
  ith_anti_dumping: 'Anti-Dumping',
  ith_droit_porte: 'Droit Porte / Liman Vergisi',
  ith_frais_t1: 'Frais de T1 (T1 Transit Masrafı)',
  ith_forfait_dedouanement: 'Forfait Dédouanement (Gümrükleme Ücreti)',
  ith_frais_bad: 'Frais de BAD (Teslim Emri Masrafı)',
  ith_stop_douane: 'Stop Douane (Gümrük Durdurma)',

  sigorta: 'Sigorta',
  diger: 'Diğer',
};

/** KDV'siz hesaplanan kalemler — kendisi zaten vergi olduğu için üstüne KDV binmez. */
const NO_VAT_KEYS = new Set(['ith_tva']);

/**
 * "Débours" — müşteri adına ödenen gerçek vergiler.
 *
 * Faturada AYRI blokta, KDV matrahı dışında gösterilir. Eskiden tüm kalemler
 * tek listede toplanıp "Total HT" (= vergiler hariç toplam) deniyordu; vergiler
 * bu toplamın içine giriyor, sonra üstüne TVA ekleniyordu — kullanıcı haklı
 * olarak "KDV iki kere işleme giriyor" diyordu.
 *
 * Dikkat: ith_frais_t1 / ith_forfait_dedouanement / ith_frais_bad /
 * ith_stop_douane birer HİZMET bedelidir, burada YER ALMAZ; normal KDV'ye tabidir.
 * Liste frontend'deki finSchemas.DEBOURS_KEYS ile aynı tutulmalı.
 */
const DEBOURS_KEYS = new Set([
  'ith_tva',
  'ith_droit_douane',
  'ith_taxe_parafiscal',
  'ith_anti_dumping',
  'ith_droit_porte',
]);

/** Varsayılan KDV oranı — frontend finSchemas.DEFAULT_VAT_RATE ile aynı olmalı. */
const DEFAULT_VAT_RATE = 20;

/**
 * Kalemde saklı KDV oranını sayıya çevirir.
 * Oran hiç girilmemişse arayüzde %20 gösterildiği için burada da %20 kabul edilir;
 * eskiden 0 sayılıyor ve fatura KDV'siz çıkıyordu.
 */
function resolveVatRate(raw, noVat) {
  if (noVat) return 0;
  if (raw === undefined || raw === null || raw === '') return DEFAULT_VAT_RATE;
  const s = String(raw);
  if (s.startsWith('custom:')) return parseFloat(s.slice(7)) || 0;
  if (s === 'custom') return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** goods_items (çoklu ürün listesi) → dizi. Bozuk/boş veride boş dizi döner. */
function parseGoodsItems(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/**
 * Sevkiyatin toplam satis tutari.
 *
 * Kullanicilar tutari Finansal sekmesindeki kalemlere giriyor (financial_data);
 * eski `sale_price` kolonu genelde bos kaliyor. Kapakta yalnizca o kolona
 * bakildigi icin "PRIX DE VENTE 0,00" gorunuyordu. Once kalemlerin toplami,
 * yoksa eski ozet alan kullanilir.
 */
function totalSaleAmount(ship) {
  const fin = parseJsonField(ship.financial_data);
  let total = 0;
  for (const [key, entry] of Object.entries(fin)) {
    if (!entry || typeof entry !== 'object') continue;
    const income = parseFloat(entry.income || 0);
    if (!income) continue;
    const vatRate = resolveVatRate(entry.income_vat, NO_VAT_KEYS.has(key) || DEBOURS_KEYS.has(key));
    total += income + income * (vatRate / 100);
  }
  if (total > 0) return total;
  return parseFloat(ship.sale_price || 0) || 0;
}

// ============================================================
// Dosya kapağı alanları
// ============================================================
/**
 * Kapak alanlarının anahtar/etiket tanımı. Frontend'deki düzenleme formu da
 * bu sırayı ve etiketleri kullanır — tek kaynak.
 */
const COVER_FIELDS = {
  left: [
    { key: 'expediteur', label: 'EXPÉDITEUR' },
    { key: 'destinataire', label: 'DESTINATAIRE' },
    { key: 'facture_client', label: 'FACTURE N° CLIENT' },
    { key: 'facture_fournisseur', label: 'FACTURE N° FOURNISSEUR' },
    { key: 'reference', label: 'RÉFÉRENCE' },
    { key: 'prix_vente', label: 'PRIX DE VENTE' },
    { key: 'douane_export', label: 'DOUANE EXPORT' },
  ],
  right: [
    { key: 'date', label: 'DATE' },
    { key: 'poids', label: 'POIDS' },
    { key: 'colisage', label: 'COLISAGE' },
    { key: 'dimensions', label: 'DIMENSIONS' },
    { key: 'transporteur', label: 'TRANSPORTEUR' },
    { key: 'plaque', label: 'PLAQUE N°' },
    { key: 'douane_import', label: 'DOUANE IMPORT' },
  ],
};

/**
 * Sevkiyattan kapak alanlarını otomatik doldurur.
 *
 * Karayolunda taşıyıcı ve plaka sevkiyatın araç atamasından gelir; atama yoksa
 * boş bırakılır ve kullanıcı formdan elle yazar.
 */
async function buildCoverFields(ship) {
  const modeData = parseJsonField(ship.mode_data);
  const isSea = ship.transport_type === 'maritime' || ship.transport_type === 'sea';
  const isAir = ship.transport_type === 'air';

  let transporteur = '';
  let plaque = '';
  if (isSea) {
    transporteur = modeData.vessel_name || '';
    plaque = modeData.mbl_no || modeData.hbl_no || '';
  } else if (isAir) {
    transporteur = modeData.airline_code ? `${modeData.airline_code} ${modeData.flight_no || ''}`.trim() : '';
    plaque = modeData.mawb_no || modeData.hawb_no || '';
  } else {
    // Karayolu: atanmış araçların plakaları + sürücü
    const [rows] = await pool.execute(
      `SELECT v.plate, v.trailer_plate, v.driver_name, v.carrier_name
       FROM vehicle_assignments a
       JOIN vehicles v ON v.id = a.vehicle_id
       WHERE a.shipment_id = ? AND a.deleted_at IS NULL AND v.deleted_at IS NULL
       ORDER BY a.created_at ASC`,
      [ship.id]
    );
    plaque = rows
      .map((r) => [r.plate, r.trailer_plate].filter(Boolean).join(' / '))
      .filter(Boolean).join(' · ');
    // Oncelik: aracin nakliyeci firmasi > sofor adi > sevkiyattaki acente
    const carriers = [...new Set(rows.map((r) => (r.carrier_name || '').trim()).filter(Boolean))];
    transporteur = carriers.join(' · ')
      || rows.map((r) => r.driver_name).filter(Boolean).join(' · ')
      || ship.agent || '';
  }

  const grossKg = parseFloat(ship.gross_weight) || 0;
  const qty = parseInt(ship.quantity, 10) || 0;
  return {
    expediteur: ship.sender || '',
    destinataire: ship.receiver || '',
    facture_client: ship.invoice_no || '',
    facture_fournisseur: '',
    reference: ship.client_reference || ship.shipment_no || '',
    prix_vente: (() => { const v = totalSaleAmount(ship); return v ? `${formatTr(v)} ${ship.currency_code || 'EUR'}` : ''; })(),
    douane_export: ship.departure_country || '',
    date: formatDateTr(ship.created_date || ship.created_at),
    // DECIMAL kolonlar "0.00" (truthy string) doner; kapakta "0 kg" basiliyordu
    poids: grossKg > 0 ? `${formatTr(grossKg, 0)} kg` : '',
    colisage: qty > 0 ? `${qty} kap` : '',
    // Boyut + (varsa) MP / mètre plancher — kapakta ayrı satır yok, birleştirilir
    dimensions: [ship.dimensions, modeData.ldm ? `${modeData.ldm} MP` : '']
      .filter(Boolean).join(' · '),
    transporteur,
    plaque,
    douane_import: ship.arrival_country || '',
    observation: ship.goods_description || '',
  };
}

/** shipments.cover_data içindeki kayıtlı düzenlemeleri güvenle ayrıştırır. */
function parseSavedCover(raw) {
  if (!raw) return {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

/** İstekten gelen düzenlenmiş değerleri temizleyip otomatik değerlerin üstüne yazar. */
function mergeCoverOverrides(auto, body) {
  const out = { ...auto };
  if (!body || typeof body !== 'object') return out;
  const allKeys = [...COVER_FIELDS.left, ...COVER_FIELDS.right].map((f) => f.key).concat('observation');
  for (const key of allKeys) {
    if (body[key] !== undefined && body[key] !== null) {
      out[key] = String(body[key]).slice(0, key === 'observation' ? 2000 : 200);
    }
  }
  return out;
}

/**
 * Sevkiyatı PDF üretimi için getirir.
 *
 * Sahiplik kontrolü zorunlu: PDF endpoint'leri token'ı query string'den de kabul
 * ettiği için (yeni sekmede açma), kontrolsüz bırakılırsa herhangi bir oturum
 * sahibi sadece ID deneyerek başkasının dosya kapağını/proformasını çekebilir.
 * Yetkisiz erişimde null döner — varlık bilgisi de sızmaz.
 */
async function loadShipment(id, user) {
  const [rows] = await pool.execute('SELECT * FROM shipments WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
  const ship = rows[0] || null;
  if (!ship) return null;
  if (!hasRole(user, 'admin') && ship.created_by !== user.id) return null;
  return ship;
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
// GET  → alanlar otomatik doldurulmuş kapak (eski davranış, tek tıkla çıktı)
// POST → kullanıcının formda düzenlediği değerlerle kapak
//        (gövde: { expediteur, destinataire, ..., observation })
router.get('/file-cover/:shipmentId', verifyTokenFlexible, (req, res) => renderFileCover(req, res));
router.post('/file-cover/:shipmentId', verifyTokenFlexible, (req, res) => renderFileCover(req, res));

/** Kapak alanlarının otomatik doldurulmuş hâli — düzenleme formunu beslemek için. */
router.get('/file-cover/:shipmentId/fields', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id, req.user);
    if (!ship) return sendError(res, 'Sevkiyat bulunamadı', 404);
    const auto = await buildCoverFields(ship);
    // Kullanıcının daha önce kaydettiği düzenlemeler otomatiklerin üstüne biner;
    // `auto` ayrıca döner ki "otomatik değerlere dön" butonu çalışabilsin.
    const values = mergeCoverOverrides(auto, parseSavedCover(ship.cover_data));
    res.json({ success: true, data: { shipment_no: ship.shipment_no, fields: COVER_FIELDS, values, auto } });
  } catch (err) {
    console.error('[pdf/file-cover-fields]', err);
    sendError(res, 'Kapak alanları alınamadı', 500);
  }
});

/**
 * Kapak duzenlemelerini PDF uretmeden kaydeder.
 * Diyalogdaki "Kaydet" butonu; "Olustur" zaten kaydedip PDF uretir.
 */
router.post('/file-cover/:shipmentId/save', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id, req.user);
    if (!ship) return sendError(res, 'Sevkiyat bulunamadı', 404);
    const auto = await buildCoverFields(ship);
    const cover = mergeCoverOverrides(mergeCoverOverrides(auto, parseSavedCover(ship.cover_data)), req.body);
    const overrides = {};
    for (const [k, v] of Object.entries(cover)) {
      if ((auto[k] ?? '') !== (v ?? '')) overrides[k] = v;
    }
    await pool.execute(
      'UPDATE shipments SET cover_data = ? WHERE id = ?',
      [Object.keys(overrides).length ? JSON.stringify(overrides) : null, id]
    );
    res.json({ success: true, data: { saved: Object.keys(overrides).length } });
  } catch (err) {
    console.error('[pdf/file-cover-save]', err);
    sendError(res, 'Kapak kaydedilemedi', 500);
  }
});

async function renderFileCover(req, res) {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id, req.user);
    if (!ship) return sendError(res, 'Sevkiyat bulunamadı', 404);

    // Otomatik değerler + kayıtlı düzenlemeler + (POST ise) bu istekteki düzenlemeler
    const auto = await buildCoverFields(ship);
    const saved = parseSavedCover(ship.cover_data);
    const cover = mergeCoverOverrides(mergeCoverOverrides(auto, saved), req.body);

    // Düzenlemeler kalıcı olsun: yalnızca otomatikten FARKLI olan alanlar saklanır.
    // Böylece sevkiyat verisi sonradan değişirse (örn. ağırlık güncellenir) elle
    // ezilmemiş alanlar yeni otomatik değeri göstermeye devam eder.
    if (req.method === 'POST') {
      const overrides = {};
      for (const [k, v] of Object.entries(cover)) {
        if ((auto[k] ?? '') !== (v ?? '')) overrides[k] = v;
      }
      await pool.execute(
        'UPDATE shipments SET cover_data = ? WHERE id = ?',
        [Object.keys(overrides).length ? JSON.stringify(overrides) : null, id]
      );
    }

    const modeData = parseJsonField(ship.mode_data);
    const financial = parseJsonField(ship.financial_data);
    const filename = `Dosya_Kapagi_${ship.shipment_no}.pdf`;
    setupPdfHeaders(res, filename);
    await logAudit(req, 'download', 'documents', id, `file-cover/${ship.shipment_no}`);

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(res);
    const F = setupFonts(doc);

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
       .font(F.bold)
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
       .font(F.bold)
       .fillColor(COLORS.text)
       .text(ship.shipment_no || '—', titleBoxX, y + 8, { width: titleBoxW, align: 'center' });
    y += titleBoxH + 25;

    // === Antet — şirket logosu (varsa) ortada ===
    // Eskiden jenerik "CARGO TRACK" yazıyordu; kapak müşteriye/gümrüğe gittiği
    // için firmanın kendi anteti basılıyor.
    if (letterheadFile) {
      const LH_W = 170;
      doc.image(letterheadFile, (W - LH_W) / 2, y, { width: LH_W });
      y += Math.round(LH_W * letterheadRatio) + 10;
    } else {
      doc.fontSize(20).font(F.bold).fillColor(COLORS.text)
         .text(COMPANY.name, PAD, y, { width: innerW, align: 'center', lineBreak: false });
      y += 22;
      doc.fontSize(8).font(F.regular).fillColor(COLORS.textMuted)
         .text(COMPANY.tagline, PAD, y, { width: innerW, align: 'center', characterSpacing: 3 });
      y += 20;
    }

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
    // Kolon geometrisi — dis cerceve icinde SIMETRIK: iki yanda 12pt ic bosluk.
    // Onceden genislik ic bosluk dusulmeden hesaplaniyordu; sag kolon cerceveyi
    // 12pt asiyordu.
    const colInset = 12;                                   // iki yanda ic bosluk
    const colGap = 40;                                     // ortadaki dikey text alani
    const colW = (innerW - colInset * 2 - colGap) / 2;     // her kolon genisligi
    const colLeftX = PAD + colInset;
    const colRightX = colLeftX + colW + colGap;
    const fieldH = 38;                    // alan başına yükseklik (label + box)
    const fieldGap = 12;                  // alan arası boşluk

    // Field çizen yardımcı
    const drawField = (x, fy, label, value) => {
      // Label
      doc.fontSize(8)
         .font(F.bold)
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
         .font(F.regular)
         .fillColor(COLORS.text)
         .text(value || '', x + 10, boxY + 7, { width: colW - 20, height: 12, ellipsis: true });
    };

    // Alan degerleri TEK KAYNAKTAN: `cover` = otomatik + kayitli duzenlemeler + bu
    // istekteki duzenlemeler (yukarida birlestirildi). Onceden burada alanlar
    // dogrudan sevkiyat verisinden yeniden hesaplaniyordu; kullanicinin diyalogda
    // girdigi degerler kaydediliyor ama PDF'e HIC BASILMIYORDU.
    const leftFields = COVER_FIELDS.left.map((f) => [f.label, cover[f.key] || '']);
    const rightFields = COVER_FIELDS.right.map((f) => [f.label, cover[f.key] || '']);

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
    doc.font(F.regular).fontSize(9).fillColor(COLORS.textLight);
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
    doc.fontSize(11).font(F.bold).fillColor(COLORS.text)
       .text('OBSERVATION', obsX, y + 7, { width: obsBoxW, align: 'center', characterSpacing: 2 });
    y += obsBoxH + 8;

    // Observation alanı (büyük input box)
    const obsContentH = H - PAD - 20 - y;
    doc.roundedRect(colLeftX, y, innerW - 24, obsContentH, 14)
       .lineWidth(0.6)
       .strokeColor(COLORS.fieldBorder)
       .fillColor(COLORS.white)
       .fillAndStroke();
    // Observation: mal tanımı + varsa çoklu ürün listesinin kısa dökümü
    const coverItems = parseGoodsItems(ship.goods_items);
    const obsLines = [];
    if (cover.observation) obsLines.push(cover.observation);
    if (coverItems.length > 0) {
      obsLines.push('');
      obsLines.push(`MAL LİSTESİ (${coverItems.length} kalem):`);
      for (const it of coverItems) {
        const parts = [
          it.description || '—',
          it.hs_code ? `HS ${it.hs_code}` : null,
          it.origin_country || null,
          it.quantity ? `${it.quantity} kap` : null,
          it.gross_weight ? `${formatTr(it.gross_weight, 1)} kg` : null,
        ].filter(Boolean);
        obsLines.push(`• ${parts.join(' · ')}`);
      }
    }
    if (obsLines.length > 0) {
      doc.fontSize(9).font(F.regular).fillColor(COLORS.text)
         .text(obsLines.join('\n'), colLeftX + 10, y + 8, { width: innerW - 44, height: obsContentH - 16 });
    }

    doc.end();
  } catch (err) {
    console.error('[pdf/file-cover]', err);
    if (!res.headersSent) sendError(res, 'PDF üretilemedi', 500);
  }
}

// ============================================================
// 2) Proforma Fatura — Modern web stili
// ============================================================
router.get('/proforma/:shipmentId', verifyTokenFlexible, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id, req.user);
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
    const F = setupFonts(doc);

    const W = 595.28;
    const cur = ship.currency_code || 'EUR';
    const symbol = CURRENCY_SYMBOL[cur] || cur;

    // === ANTET (entête) — sol: şirket antedi, sağ: belge başlığı ===
    // Antet görseli (logo + ünvan + adres) varsa resim olarak basılır; görselin
    // içinde adres/telefon/e-posta zaten yazılı olduğu için metin bloğu tekrar
    // edilmez. Görsel yoksa aynı bilgiler metin olarak yazılır.
    const idLines = identityLines();
    let headY = 42;

    if (letterheadFile) {
      const LETTERHEAD_W = 150;
      doc.image(letterheadFile, 40, 36, { width: LETTERHEAD_W });
      headY = 36 + Math.round(LETTERHEAD_W * letterheadRatio) + 6;
    } else {
      doc.fontSize(16).font(F.bold).fillColor(COLORS.text)
         .text(COMPANY.name, 40, headY, { width: 300 });
      headY += 20;
      if (COMPANY.tagline) {
        doc.fontSize(7).font(F.regular).fillColor(COLORS.textMuted)
           .text(COMPANY.tagline, 40, headY, { width: 300, characterSpacing: 1.5 });
        headY += 12;
      }
      doc.fontSize(8).font(F.regular).fillColor(COLORS.textMuted);
      for (const line of addressLines()) {
        doc.text(line, 40, headY, { width: 300, ellipsis: true, lineBreak: false });
        headY += 10;
      }
    }

    // Sağ üst: belge başlığı + (varsa) vergi kimlik satırları
    // Tek satir garanti (lineBreak: false) — onceden 24pt baslik dar alanda iki
    // satira sariyor ve alttaki aciklama/TVA satirlarinin ustune biniyordu.
    doc.fontSize(19).font(F.bold).fillColor(COLORS.primary)
       .text('FACTURE PROFORMA', 260, 46, { width: W - 300, align: 'right', lineBreak: false });
    doc.fontSize(7.5).font(F.regular).fillColor(COLORS.textMuted)
       .text('Ce document est fourni à titre informatif et ne constitue pas une facture officielle.',
             260, 68, { width: W - 300, align: 'right' });
    let rightY = 82;
    if (idLines.length > 0) {
      doc.fontSize(7.5).fillColor(COLORS.textLight);
      for (const line of idLines) {
        doc.text(line, 260, rightY, { width: W - 300, align: 'right', lineBreak: false });
        rightY += 10;
      }
    }

    // Antet ayırıcı çizgisi — iki bloktan uzun olanın altına
    const ruleY = Math.max(headY + 6, rightY + 6, 100);
    doc.moveTo(40, ruleY).lineTo(W - 40, ruleY)
       .lineWidth(1.5).strokeColor(COLORS.primary).stroke();

    // === Üst bilgi kartı (gri arka plan, 2x3 grid) ===
    const cardY = ruleY + 14;
    const cardH = 110;
    doc.roundedRect(40, cardY, W - 80, cardH, 8)
       .lineWidth(0.8)
       .strokeColor(COLORS.borderLight)
       .fillColor('#f8fafc')
       .fillAndStroke();

    const infoLabel = (text, x, y) => {
      doc.fontSize(8).font(F.bold).fillColor(COLORS.textLight)
         .text(text.toUpperCase(), x, y, { characterSpacing: 0.5 });
    };
    const infoValue = (text, x, y) => {
      doc.fontSize(12).font(F.bold).fillColor(COLORS.text)
         .text(text || '—', x, y + 12);
    };

    const colL = 60, colR = W / 2 + 20;
    let infoY = cardY + 15;
    // Row 1
    infoLabel('N° DE FACTURE', colL, infoY);
    infoValue(ship.shipment_no, colL, infoY);
    infoLabel('DATE', colR, infoY);
    infoValue(formatDateFr(new Date()), colR, infoY);
    infoY += 30;
    // Row 2
    infoLabel('CLIENT', colL, infoY);
    infoValue(ship.client_billing, colL, infoY);
    infoLabel('N° DE DOSSIER', colR, infoY);
    infoValue(ship.shipment_no, colR, infoY);
    infoY += 30;
    // Row 3
    infoLabel('ITINÉRAIRE', colL, infoY);
    infoValue(`${countryFr(ship.departure_country)}  →  ${countryFr(ship.arrival_country)}`, colL, infoY);
    infoLabel('MODE DE PAIEMENT', colR, infoY);
    infoValue(PAYMENT_FR[ship.payment_type] || ship.payment_type || '—', colR, infoY);

    // Watermark en sona taşındı (bufferPages + switchToPage ile overlay)

    // === Mal listesi (çoklu ürün) ===
    // goods_items doluysa gümrük için kalem kalem HS kodu / menşe / kıymet dökümü
    // basılır. Boşsa üst seviye tek ürün bilgisi eski davranışla korunur.
    let tableY = cardY + cardH + 22;
    const goodsItems = parseGoodsItems(ship.goods_items);
    if (goodsItems.length > 0) {
      doc.fontSize(9).font(F.bold).fillColor(COLORS.textLight);
      doc.text('LISTE DES MARCHANDISES', 50, tableY);
      tableY += 14;
      doc.fontSize(7.5).font(F.bold).fillColor(COLORS.textLight);
      doc.text('DÉSIGNATION', 50, tableY, { width: 180, ellipsis: true });
      doc.text('CODE SH', 235, tableY, { width: 70 });
      doc.text('ORIGINE', 310, tableY, { width: 60, ellipsis: true });
      doc.text('COLIS', 375, tableY, { width: 30, align: 'right' });
      doc.text('BRUT', 410, tableY, { width: 50, align: 'right' });
      doc.text('NET', 465, tableY, { width: 45, align: 'right' });
      doc.text(`VALEUR`, 515, tableY, { width: 45, align: 'right' });
      tableY += 11;
      doc.moveTo(40, tableY).lineTo(W - 40, tableY).strokeColor(COLORS.borderLight).lineWidth(0.8).stroke();
      tableY += 5;

      doc.font(F.regular).fontSize(8).fillColor(COLORS.text);
      let gQty = 0, gGross = 0, gNet = 0, gValue = 0;
      for (const it of goodsItems) {
        if (tableY > 700) { doc.addPage(); tableY = 60; }
        gQty += Number(it.quantity) || 0;
        gGross += Number(it.gross_weight) || 0;
        gNet += Number(it.net_weight) || 0;
        gValue += Number(it.value) || 0;

        doc.fillColor(COLORS.text);
        doc.text(it.description || '—', 50, tableY, { width: 180, ellipsis: true, lineBreak: false });
        doc.font('Courier').text(it.hs_code || '—', 235, tableY, { width: 70, lineBreak: false });
        doc.font(F.regular).text(countryFr(it.origin_country), 310, tableY, { width: 60, ellipsis: true, lineBreak: false });
        doc.text(String(it.quantity || 0), 375, tableY, { width: 30, align: 'right' });
        doc.text(formatFr(it.gross_weight || 0, 1), 410, tableY, { width: 50, align: 'right' });
        doc.text(formatFr(it.net_weight || 0, 1), 465, tableY, { width: 45, align: 'right' });
        doc.text(formatFr(it.value || 0), 515, tableY, { width: 45, align: 'right' });
        tableY += 13;

        if (it.note) {
          doc.fontSize(7).fillColor(COLORS.textMuted)
             .text(it.note, 56, tableY - 2, { width: 490, ellipsis: true, lineBreak: false });
          doc.fontSize(8);
          tableY += 10;
        }
      }

      // Mal listesi toplam satırı
      doc.moveTo(40, tableY).lineTo(W - 40, tableY).strokeColor(COLORS.borderLight).lineWidth(0.5).stroke();
      tableY += 5;
      doc.font(F.bold).fontSize(8).fillColor(COLORS.text);
      doc.text(`TOTAL (${goodsItems.length} poste(s))`, 50, tableY, { width: 320 });
      doc.text(String(gQty), 375, tableY, { width: 30, align: 'right' });
      doc.text(formatFr(gGross, 1), 410, tableY, { width: 50, align: 'right' });
      doc.text(formatFr(gNet, 1), 465, tableY, { width: 45, align: 'right' });
      doc.text(`${symbol}${formatFr(gValue)}`, 505, tableY, { width: 55, align: 'right' });
      tableY += 20;
    }

    // === Kalemleri ikiye ayır ===
    // Prestations : hizmet bedelleri → KDV matrahı
    // Débours     : müşteri adına ödenen vergiler → matrah DIŞI, üzerine KDV binmez
    // Eskiden hepsi tek listede toplanıp "Total HT" deniyordu; vergiler
    // "vergiler hariç toplam"ın içine girip üstlerine bir kez daha TVA
    // hesaplanmış gibi görünüyordu.
    const prestations = [];
    const debours = [];
    for (const [key, entry] of Object.entries(financial)) {
      if (!entry || typeof entry !== 'object') continue;
      const income = parseFloat(entry.income || 0);
      if (!income) continue;
      const label = entry.label
        || FIN_LABELS_FR[key]
        || key.replace(/^custom_[a-z_]*?_\d+$/, 'Poste personnalisé').replace(/_/g, ' ');
      if (DEBOURS_KEYS.has(key)) {
        debours.push({ label, income });
      } else {
        const vatRate = resolveVatRate(entry.income_vat, NO_VAT_KEYS.has(key));
        prestations.push({ label, income, vatRate, vat: income * (vatRate / 100) });
      }
    }

    const totalIncome = prestations.reduce((s, l) => s + l.income, 0);
    const totalIncomeVat = prestations.reduce((s, l) => s + l.vat, 0);
    const totalDebours = debours.reduce((s, l) => s + l.income, 0);

    const pageBreak = () => { if (tableY > 705) { doc.addPage(); tableY = 60; } };

    // === Prestations tablosu ===
    doc.fontSize(9).font(F.bold).fillColor(COLORS.textLight);
    doc.text('PRESTATIONS', 50, tableY);
    doc.text(`MONTANT HT (${cur})`, 330, tableY, { width: 100, align: 'right' });
    doc.text('TVA %', 440, tableY, { width: 40, align: 'right' });
    doc.text('MONTANT TVA', 490, tableY, { width: 70, align: 'right' });
    tableY += 14;
    doc.moveTo(40, tableY).lineTo(W - 40, tableY).strokeColor(COLORS.borderLight).lineWidth(1).stroke();
    tableY += 6;

    doc.font(F.regular).fontSize(10).fillColor(COLORS.text);
    for (const l of prestations) {
      doc.fillColor(COLORS.text).font(F.regular).fontSize(10);
      doc.text(l.label, 50, tableY, { width: 270, ellipsis: true });
      doc.text(formatFr(l.income), 330, tableY, { width: 100, align: 'right' });
      doc.text(`${l.vatRate.toFixed(0)}%`, 440, tableY, { width: 40, align: 'right' });
      doc.text(formatFr(l.vat), 490, tableY, { width: 70, align: 'right' });
      tableY += 16;
      pageBreak();
    }
    if (prestations.length === 0) {
      doc.fontSize(10).font(F.italic).fillColor(COLORS.textLight);
      doc.text('Aucune prestation saisie', 50, tableY, { width: 500, align: 'center' });
      tableY += 16;
    }

    // Prestations alt toplamı
    tableY += 6;
    doc.moveTo(320, tableY).lineTo(W - 40, tableY).strokeColor(COLORS.borderLight).lineWidth(0.5).stroke();
    tableY += 8;
    const totalsX = 320, totalsValueX = 480, totalsValueW = 80;
    doc.fontSize(10).font(F.regular).fillColor(COLORS.text)
       .text('Total HT :', totalsX, tableY, { width: 150 });
    doc.font(F.bold).text(`${symbol}${formatFr(totalIncome)}`, totalsValueX, tableY, { width: totalsValueW, align: 'right' });
    tableY += 15;
    doc.font(F.regular).text('Total TVA :', totalsX, tableY, { width: 150 });
    doc.font(F.bold).text(`${symbol}${formatFr(totalIncomeVat)}`, totalsValueX, tableY, { width: totalsValueW, align: 'right' });
    tableY += 15;
    doc.font(F.regular).text('Total TTC :', totalsX, tableY, { width: 150 });
    doc.font(F.bold).text(`${symbol}${formatFr(totalIncome + totalIncomeVat)}`, totalsValueX, tableY, { width: totalsValueW, align: 'right' });
    tableY += 20;
    pageBreak();

    // === Débours tablosu (varsa) ===
    if (debours.length > 0) {
      doc.fontSize(9).font(F.bold).fillColor(COLORS.textLight);
      doc.text('DÉBOURS ET TAXES', 50, tableY);
      doc.fontSize(7).font(F.regular)
         .text('(avancés pour le compte du client — non soumis à TVA)', 155, tableY + 1.5);
      doc.fontSize(9).font(F.bold)
         .text(`MONTANT (${cur})`, 460, tableY, { width: 100, align: 'right' });
      tableY += 14;
      doc.moveTo(40, tableY).lineTo(W - 40, tableY).strokeColor(COLORS.borderLight).lineWidth(1).stroke();
      tableY += 6;

      for (const l of debours) {
        doc.font(F.regular).fontSize(10).fillColor(COLORS.text);
        doc.text(l.label, 50, tableY, { width: 400, ellipsis: true });
        doc.text(formatFr(l.income), 460, tableY, { width: 100, align: 'right' });
        tableY += 16;
        pageBreak();
      }

      tableY += 6;
      doc.moveTo(320, tableY).lineTo(W - 40, tableY).strokeColor(COLORS.borderLight).lineWidth(0.5).stroke();
      tableY += 8;
      doc.fontSize(10).font(F.regular).fillColor(COLORS.text)
         .text('Total débours :', totalsX, tableY, { width: 150 });
      doc.font(F.bold).text(`${symbol}${formatFr(totalDebours)}`, totalsValueX, tableY, { width: totalsValueW, align: 'right' });
      tableY += 20;
      pageBreak();
    }

    // === Net à payer (büyük, primary renkli) ===
    doc.moveTo(320, tableY).lineTo(W - 40, tableY).strokeColor(COLORS.primary).lineWidth(1.2).stroke();
    tableY += 10;
    doc.fontSize(13).font(F.bold).fillColor(COLORS.primary)
       .text('NET À PAYER :', totalsX, tableY, { width: 200 });
    doc.fontSize(16).font(F.bold).fillColor(COLORS.primary)
       .text(`${symbol}${formatFr(totalIncome + totalIncomeVat + totalDebours)}`,
             totalsValueX - 30, tableY - 2, { width: totalsValueW + 30, align: 'right' });

    // === Banka bilgileri (env'de tanımlıysa) ===
    const bank = bankLines();
    if (bank.length > 0) {
      let bankY = Math.min(tableY + 28, 735);
      doc.fontSize(8).font(F.bold).fillColor(COLORS.textLight)
         .text('COORDONNÉES BANCAIRES', 40, bankY, { characterSpacing: 0.5 });
      bankY += 12;
      doc.fontSize(8.5).font(F.regular).fillColor(COLORS.text);
      for (const line of bank) {
        doc.text(line, 40, bankY, { width: 320, ellipsis: true, lineBreak: false });
        bankY += 11;
      }
    }

    // === Footer + filigran — HER sayfaya basılır ===
    // Önceden yasal künye içerik akışının sonunda bir kez çiziliyordu; belge iki
    // sayfaya taşarsa ilk sayfanın altı boş kalıyordu. bufferedPages ile tüm
    // sayfalar gezilip künye + filigran her sayfaya ayrı ayrı basılır.
    const legal = legalFooterLines();
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      let legalY = 842 - 24 - legal.length * 10;
      doc.moveTo(40, legalY - 8).lineTo(W - 40, legalY - 8)
         .lineWidth(0.5).strokeColor(COLORS.borderLight).stroke();
      doc.fontSize(7.5).font(F.bold).fillColor(COLORS.primary);
      for (const line of legal) {
        doc.text(line, 40, legalY, { align: 'center', width: W - 80, lineBreak: false });
        legalY += 10;
      }
      doc.save();
      doc.opacity(0.06);
      doc.fontSize(110).font(F.bold).fillColor(COLORS.primary);
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
    const ship = await loadShipment(id, req.user);
    if (!ship || ship.transport_type !== 'storage') {
      return sendError(res, 'Depolama sevkiyatı bulunamadı', 404);
    }

    const stockLog = parseJsonField(ship.depo_stock_log);
    const filename = `Depo_Raporu_${ship.shipment_no}.pdf`;
    setupPdfHeaders(res, filename);
    await logAudit(req, 'download', 'documents', id, `storage-report/${ship.shipment_no}`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);
    const F = setupFonts(doc);

    doc.fontSize(22).fillColor(COLORS.text).font(F.bold)
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
    doc.fillColor(COLORS.primary).font(F.bold).fontSize(11);
    doc.text(`Mevcut Stok: ${balance} kap   |   Toplam Giriş: ${totalIn}   |   Toplam Çıkış: ${totalOut}`, 50, y + 10);
    y += 45;

    doc.fillColor('#fff');
    doc.rect(40, y, 515, 22).fill(COLORS.primary);
    doc.fillColor('#fff').font(F.bold).fontSize(9);
    ['Giriş Tarihi', 'Çıkış Tarihi', 'Bekleme', 'Giriş', 'Çıkış', 'Bakiye', 'Not'].forEach((h, i) => {
      const widths = [80, 80, 70, 50, 50, 50, 135];
      const offsets = [50, 130, 210, 280, 330, 380, 430];
      doc.text(h, offsets[i], y + 7, { width: widths[i] });
    });
    y += 22;

    let bal = 0;
    const todayISO = new Date().toISOString().slice(0, 10);
    doc.font(F.regular).fillColor(COLORS.text).fontSize(8);
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
      doc.fillColor(COLORS.primary).font(F.bold).text(String(bal), 380, y + 4, { width: 50, align: 'center' });
      doc.fillColor(COLORS.textMuted).font(F.regular).text(r.note || '', 430, y + 4, { width: 135, ellipsis: true });
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
// 5) Feuille de chargement — araç yükleme listesi
// ============================================================
// Müşterinin elle tuttuğu kağıt listenin (araç plakası + tarih başlıklı,
// gönderici/alıcı/kap/kg/posta kodu/tarih/fatura kolonlu) dijital karşılığı.
// Araçtaki tüm aktif yükleri tek sayfada listeler.
router.get('/vehicle-manifest/:vehicleId', verifyTokenFlexible, async (req, res) => {
  try {
    const id = toInt(req.params.vehicleId);
    const [vrows] = await pool.execute(
      'SELECT id, plate, trailer_plate, driver_name, carrier_name, capacity_kg FROM vehicles WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (vrows.length === 0) return sendError(res, 'Araç bulunamadı', 404);
    const vehicle = vrows[0];

    // Aktif yükler: atama silinmemiş + sevkiyat arşivde değil.
    // Alıcının posta kodu partner kartından gelir (sevkiyatta tutulmuyor).
    const [rows] = await pool.execute(
      `SELECT a.assigned_quantity, a.assigned_weight, a.loading_date,
              s.shipment_no, s.sender, s.receiver, s.invoice_no, s.package_type, s.pallet_count,
              MAX(p.postal_code) AS receiver_postal, MAX(p.city) AS receiver_city
       FROM vehicle_assignments a
       JOIN shipments s ON s.id = a.shipment_id AND s.deleted_at IS NULL
       LEFT JOIN partners p ON p.company_name = s.receiver AND p.deleted_at IS NULL
       WHERE a.vehicle_id = ? AND a.deleted_at IS NULL
       GROUP BY a.id, s.id
       ORDER BY a.created_at ASC`,
      [id]
    );

    const filename = `Feuille_Chargement_${String(vehicle.plate || id).replace(/\s+/g, '_')}.pdf`;
    setupPdfHeaders(res, filename);
    await logAudit(req, 'download', 'documents', id, `vehicle-manifest/${vehicle.plate}`);

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 36, left: 36, right: 36, bottom: 0 },
      bufferPages: true,
    });
    doc.pipe(res);
    const F = setupFonts(doc);
    const W = 595.28;

    // === Antet + baslik kutusu ===
    // Kagit ornekteki gibi: solda antet, ortada iki satirli cerceveli baslik
    // tablosu (ust satir belge adi, alt satir plaka + tarih).
    let y = 34;
    let headBottom = y;
    if (letterheadFile) {
      const LH_W = 110;
      doc.image(letterheadFile, 36, y, { width: LH_W });
      headBottom = y + Math.round(LH_W * letterheadRatio);
    } else {
      doc.fontSize(14).font(F.bold).fillColor(COLORS.text).text(COMPANY.name, 36, y);
      headBottom = y + 20;
    }

    const TITLE_W = 320;
    const TITLE_X = 36 + 130 + ((W - 36) - (36 + 130) - TITLE_W) / 2; // antetin sagindaki alanda ortala
    const ROW_H = 26;
    // Ust satir (gri dolgu): kagit ornekteki gibi NAKLIYECI FIRMA adi; araca
    // nakliyeci girilmemisse belge adi basilir.
    const titleTop = (vehicle.carrier_name || '').trim() || 'FEUILLE DE CHARGEMENT';
    if ((vehicle.carrier_name || '').trim()) {
      doc.fontSize(8).font(F.bold).fillColor(COLORS.textMuted)
         .text('FEUILLE DE CHARGEMENT', TITLE_X, y - 12, { width: TITLE_W, align: 'center', lineBreak: false });
    }
    doc.rect(TITLE_X, y, TITLE_W, ROW_H).fillColor('#d6d6d6').fill();
    doc.rect(TITLE_X, y, TITLE_W, ROW_H).lineWidth(1).strokeColor('#444444').stroke();
    doc.fontSize(13).font(F.bold).fillColor('#111111')
       .text(titleTop, TITLE_X + 4, y + 7, { width: TITLE_W - 8, align: 'center', lineBreak: false, ellipsis: true });
    // Alt satir: plaka + tarih
    doc.rect(TITLE_X, y + ROW_H, TITLE_W, ROW_H).lineWidth(1).strokeColor('#444444').stroke();
    doc.fontSize(12).font(F.bold).fillColor(COLORS.text)
       .text(`${vehicle.plate}${vehicle.trailer_plate && vehicle.trailer_plate !== vehicle.plate ? ' / ' + vehicle.trailer_plate : ''}  -  ${formatDateFr(new Date())}`,
             TITLE_X, y + ROW_H + 7, { width: TITLE_W, align: 'center', lineBreak: false });
    if (vehicle.driver_name) {
      doc.fontSize(9).font(F.regular).fillColor(COLORS.textMuted)
         .text(`Chauffeur : ${vehicle.driver_name}`, TITLE_X, y + ROW_H * 2 + 6, { width: TITLE_W, align: 'center', lineBreak: false });
    }
    y = Math.max(headBottom, y + ROW_H * 2 + 20) + 14;

    // === Sevkiyat bloklari ===
    // Musterinin kagit listesiyle birebir: HER SEVKIYAT AYRI CERCEVELI TABLO.
    // Baslik satiri gri dolgulu, deger satiri beyaz; bloklar arasinda bosluk.
    // Onceki tek-tablo tasarimda uzun firma adlari alt satirlara tasip
    // ic ice geciyordu; burada deger satiri iki satir metne yer verir ve
    // her hucre kendi cercevesi icinde kalir.
    const TABLE_X = 36;
    const TABLE_W = W - 72;
    const cols = [
      { key: 'sender',    label: 'EXPÉDITEUR',        w: 100, align: 'left'   },
      { key: 'receiver',  label: 'DESTINATAIRE',      w: 100, align: 'left'   },
      { key: 'nb',        label: 'NB',                w: 46,  align: 'right'  },
      { key: 'kg',        label: 'KG',                w: 52,  align: 'right'  },
      { key: 'cp',        label: 'CODE\nPOSTAL',      w: 50,  align: 'center' },
      { key: 'entree',    label: "DATE\nD'ENTRÉE",    w: 54,  align: 'center' },
      { key: 'livraison', label: 'DATE DE\nLIVRAISON', w: 57, align: 'center' },
      { key: 'facture',   label: 'FACTURE N°',        w: 64,  align: 'center' },
    ];
    // Kolon x konumlari
    { let cx = TABLE_X; for (const c of cols) { c.x = cx; cx += c.w; } }

    const HEAD_H = 22;  // iki satirli basliklara ("DATE DE / LIVRAISON") yer birakir
    const VAL_H = 30;   // iki satir firma adina yer birakir
    const GAP = 10;     // bloklar arasi bosluk

    const drawBlock = (r) => {
      // Blok sayfaya sigmiyorsa yeni sayfa (yasal kunyeye 60pt pay birak)
      if (y + HEAD_H + VAL_H > 842 - 70) { doc.addPage(); y = 40; }

      // --- Baslik satiri: gri dolgu + hucre cerceveleri ---
      doc.rect(TABLE_X, y, TABLE_W, HEAD_H).fillColor('#d6d6d6').fill();
      doc.fontSize(6.6).font(F.bold).fillColor('#111111');
      for (const c of cols) {
        doc.rect(c.x, y, c.w, HEAD_H).lineWidth(0.8).strokeColor('#555555').stroke();
        // Basliklar acikca satir kirilarak tanimli; asla kesilmez
        const lines = c.label.split('\n');
        const ty = lines.length > 1 ? y + 3.5 : y + 7.5;
        doc.text(c.label, c.x + 3, ty, { width: c.w - 6, align: c.align === 'left' ? 'left' : c.align, lineGap: 0.5 });
      }
      y += HEAD_H;

      // --- Deger satiri: beyaz zemin + hucre cerceveleri ---
      const qty = parseInt(r.assigned_quantity, 10) || 0;
      const kg = parseFloat(r.assigned_weight) || 0;
      const pallets = parseInt(r.pallet_count, 10) || 0;
      const vals = {
        sender: r.sender || '—',
        receiver: r.receiver || '—',
        // "528 PX" ve altinda palet sayisi (musteri istegi)
        nb: `${qty}${r.package_type ? ' ' + r.package_type : ''}${pallets ? `\n${pallets} pal.` : ''}`,
        kg: `${formatFr(kg, 0)} KGS`,
        cp: r.receiver_postal || '',
        entree: r.loading_date ? formatDateFr(r.loading_date) : '',
        livraison: '',            // sofor elle doldurur
        facture: r.invoice_no || '',
      };
      doc.font(F.regular).fontSize(7.6).fillColor(COLORS.text);
      for (const c of cols) {
        doc.rect(c.x, y, c.w, VAL_H).lineWidth(0.8).strokeColor('#555555').stroke();
        // height sinirli sarma: en fazla iki satir, tasani uc nokta ile kes
        const twoLine = c.key === 'sender' || c.key === 'receiver' || (c.key === 'nb' && pallets > 0);
        doc.text(String(vals[c.key]), c.x + 3, y + (twoLine ? 5 : 10), {
          width: c.w - 6,
          height: VAL_H - 8,
          align: c.align,
          ellipsis: true,
        });
      }
      y += VAL_H + GAP;
      return { qty, kg, pallets };
    };

    let totQty = 0, totKg = 0, totPallets = 0;
    for (const r of rows) {
      const { qty, kg, pallets } = drawBlock(r);
      totQty += qty; totKg += kg; totPallets += pallets;
    }

    if (rows.length === 0) {
      doc.fontSize(9).font(F.italic).fillColor(COLORS.textLight)
         .text('Aucune marchandise affectée à ce véhicule.', TABLE_X, y + 14, { width: TABLE_W, align: 'center' });
      y += 36;
    } else {
      // Toplam satiri — bloklarin altinda, cerceveli
      if (y + 24 > 842 - 70) { doc.addPage(); y = 40; }
      doc.rect(TABLE_X, y, TABLE_W, 22).fillColor('#eef2ff').fill();
      doc.rect(TABLE_X, y, TABLE_W, 22).lineWidth(0.8).strokeColor('#555555').stroke();
      doc.font(F.bold).fontSize(8.4).fillColor(COLORS.text);
      doc.text(`TOTAL — ${rows.length} expédition(s)`, TABLE_X + 6, y + 7, { width: 200, lineBreak: false });
      // Isaretlenen bos alana toplam palet
      if (totPallets > 0) {
        doc.text(`${totPallets} palettes`, TABLE_X + 150, y + 7, { width: 90, align: 'left', lineBreak: false });
      }
      doc.text(`${totQty} colis`, cols[2].x, y + 7, { width: cols[2].w + 10, align: 'right', lineBreak: false });
      doc.text(`${formatFr(totKg, 0)} KGS`, cols[3].x + 10, y + 7, { width: cols[3].w + 20, align: 'right', lineBreak: false });
      if (vehicle.capacity_kg > 0) {
        doc.font(F.regular).fontSize(7.4).fillColor(COLORS.textMuted)
           .text(`Capacité : ${formatFr(vehicle.capacity_kg, 0)} kg  ·  Utilisation : ${formatFr((totKg / vehicle.capacity_kg) * 100, 1)} %`,
                 cols[4].x + 20, y + 8, { width: TABLE_X + TABLE_W - cols[4].x - 26, align: 'right', lineBreak: false });
      }
      y += 30;
    }

    // === Yasal künye ===
    const mLegal = legalFooterLines();
    let mLegalY = 842 - 20 - mLegal.length * 9;
    doc.moveTo(36, mLegalY - 6).lineTo(W - 36, mLegalY - 6).lineWidth(0.5).strokeColor(COLORS.borderLight).stroke();
    doc.fontSize(6.8).font(F.bold).fillColor(COLORS.primary);
    for (const line of mLegal) {
      doc.text(line, 36, mLegalY, { align: 'center', width: W - 72, lineBreak: false });
      mLegalY += 9;
    }

    doc.end();
  } catch (err) {
    console.error('[pdf/vehicle-manifest]', err);
    if (!res.headersSent) sendError(res, 'PDF üretilemedi', 500);
  }
});

// ============================================================
// 4) Barkod yazdırma — değişmedi
// ============================================================
router.get('/barcodes/:shipmentId', verifyTokenFlexible, async (req, res) => {
  try {
    const id = toInt(req.params.shipmentId);
    const ship = await loadShipment(id, req.user);
    if (!ship) return sendError(res, 'Sevkiyat bulunamadı', 404);

    const count = Math.min(500, parseInt(ship.quantity, 10) || 1);
    const filename = `Barkodlar_${ship.shipment_no}.pdf`;
    setupPdfHeaders(res, filename);
    await logAudit(req, 'download', 'documents', id, `barcodes/${ship.shipment_no}/${count}`);

    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    doc.pipe(res);
    const F = setupFonts(doc);

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
      doc.fontSize(9).fillColor(COLORS.text).font(F.bold)
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
      doc.fontSize(7).fillColor(COLORS.textMuted).font(F.regular)
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
