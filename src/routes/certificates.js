/**
 * ATR / EUR.1 dolaşım belgeleri (Certificat de circulation des marchandises).
 *
 * Müşteri bu belgeleri matbu (önceden basılı) formlara dolduruyor. Burada
 * belgenin ALANLARI saklanır; yazdırma işini pdfCertificates.js yapar ve
 * sadece metinleri matbu formun kutularına denk gelen koordinatlara basar.
 *
 *   GET    /api/certificates            liste (tip + arama)
 *   GET    /api/certificates/:id        tek kayıt
 *   POST   /api/certificates            oluştur / güncelle (id gövdede)
 *   POST   /api/certificates/:id/copy   aynı bilgilerle yeni belge
 *   DELETE /api/certificates/:id        soft delete
 */
const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, requirePermission, can } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const {
  sanitizeText, toInt, toNullableInt, toNullableDate, whitelist, sendSuccess, sendError,
} = require('../helpers/utils');

const router = express.Router();

const VALID_TYPE = ['atr', 'eur1'];

// Form alanları — hepsi serbest metin; matbu formdaki kutu sırasına göre
const TEXT_FIELDS = [
  'cert_no', 'exporter', 'consignee', 'transport_doc_no', 'export_country',
  'destination_country', 'origin_country', 'pref_from', 'pref_to', 'transport_info', 'observations',
  'order_no', 'goods_description', 'gross_weight', 'invoice_ref',
  'customs_doc_model', 'customs_doc_no', 'customs_office', 'issue_country',
  'issue_place', 'declaration_place', 'notes',
];
const DATE_FIELDS = ['transport_doc_date', 'customs_doc_date', 'issue_date', 'declaration_date'];

async function loadCertificate(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM certificates WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]
  );
  return rows[0] || null;
}

// ============ GET /api/certificates ============
router.get('/', verifyToken, requirePermission('certificates.read'), async (req, res) => {
  try {
    const type = sanitizeText(req.query.cert_type || '');
    const q = sanitizeText(req.query.q || '');
    const where = ['c.deleted_at IS NULL'];
    const params = [];
    if (VALID_TYPE.includes(type)) { where.push('c.cert_type = ?'); params.push(type); }
    if (q) {
      where.push(`(c.cert_no LIKE ? OR c.exporter LIKE ? OR c.consignee LIKE ?
                   OR c.goods_description LIKE ? OR s.shipment_no LIKE ?)`);
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }
    const [rows] = await pool.execute(
      `SELECT c.*, s.shipment_no
         FROM certificates c
         LEFT JOIN shipments s ON s.id = c.shipment_id
        WHERE ${where.join(' AND ')}
        ORDER BY c.issue_date DESC, c.id DESC
        LIMIT 500`,
      params
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[certificates/list]', err);
    sendError(res, 'Belgeler alınamadı', 500);
  }
});

// ============ GET /api/certificates/:id ============
router.get('/:id', verifyToken, requirePermission('certificates.read'), async (req, res) => {
  try {
    const row = await loadCertificate(toInt(req.params.id));
    if (!row) return sendError(res, 'Belge bulunamadı', 404);
    if (row.shipment_id) {
      const [s] = await pool.execute('SELECT shipment_no FROM shipments WHERE id = ? LIMIT 1', [row.shipment_id]);
      row.shipment_no = s[0] ? s[0].shipment_no : null;
    }
    sendSuccess(res, row);
  } catch (err) {
    console.error('[certificates/get]', err);
    sendError(res, 'Belge alınamadı', 500);
  }
});

// ============ POST /api/certificates (oluştur / güncelle) ============
router.post('/', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    const id = toInt(body.id);
    const needed = id ? 'certificates.update' : 'certificates.create';
    if (!can(req.user, needed)) return sendError(res, `Bu işlem için yetkiniz yok (${needed})`, 403);

    if (id) {
      const existing = await loadCertificate(id);
      if (!existing) return sendError(res, 'Belge bulunamadı', 404);
    }

    const data = {
      cert_type: whitelist(sanitizeText(body.cert_type), VALID_TYPE, 'atr'),
      shipment_id: toNullableInt(body.shipment_id),
    };
    for (const f of TEXT_FIELDS) data[f] = sanitizeText(body[f]);
    for (const f of DATE_FIELDS) data[f] = toNullableDate(body[f]);

    const cols = Object.keys(data);
    let certId = id;
    if (id) {
      await pool.execute(
        `UPDATE certificates SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`,
        [...cols.map((c) => data[c]), id]
      );
    } else {
      data.created_by = req.user.id;
      cols.push('created_by');
      const [r] = await pool.execute(
        `INSERT INTO certificates (${cols.map((c) => `\`${c}\``).join(', ')})
         VALUES (${cols.map(() => '?').join(', ')})`,
        cols.map((c) => data[c])
      );
      certId = r.insertId;
    }

    await logAudit(req, id ? 'update' : 'create', 'certificates', certId,
      `${data.cert_type.toUpperCase()} ${data.cert_no || ''}`.trim());
    sendSuccess(res, { id: certId, message: id ? 'Belge güncellendi' : 'Belge oluşturuldu' });
  } catch (err) {
    console.error('[certificates/save]', err);
    sendError(res, 'Belge kaydedilemedi', 500);
  }
});

// ============ POST /api/certificates/:id/copy ============
// Aynı gönderici/alıcı ile yeni belge — sadece numara ve tarihler boş gelir.
router.post('/:id/copy', verifyToken, requirePermission('certificates.create'), async (req, res) => {
  try {
    const src = await loadCertificate(toInt(req.params.id));
    if (!src) return sendError(res, 'Belge bulunamadı', 404);

    const data = { cert_type: src.cert_type, shipment_id: src.shipment_id };
    for (const f of TEXT_FIELDS) data[f] = f === 'cert_no' ? '' : (src[f] || '');
    for (const f of DATE_FIELDS) data[f] = null;
    data.created_by = req.user.id;

    const cols = Object.keys(data);
    const [r] = await pool.execute(
      `INSERT INTO certificates (${cols.map((c) => `\`${c}\``).join(', ')})
       VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => data[c])
    );
    await logAudit(req, 'create', 'certificates', r.insertId, `kopya: ${src.cert_no || src.id}`);
    sendSuccess(res, { id: r.insertId, message: 'Belge kopyalandı' });
  } catch (err) {
    console.error('[certificates/copy]', err);
    sendError(res, 'Belge kopyalanamadı', 500);
  }
});

// ============ DELETE /api/certificates/:id ============
router.delete('/:id', verifyToken, requirePermission('certificates.delete'), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const row = await loadCertificate(id);
    if (!row) return sendError(res, 'Belge bulunamadı', 404);
    await pool.execute('UPDATE certificates SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [req.user.id, id]);
    await logAudit(req, 'delete', 'certificates', id, `${row.cert_type.toUpperCase()} ${row.cert_no || ''}`.trim());
    sendSuccess(res, { id, message: 'Belge silindi' });
  } catch (err) {
    console.error('[certificates/delete]', err);
    sendError(res, 'Belge silinemedi', 500);
  }
});

module.exports = router;
module.exports.loadCertificate = loadCertificate;
