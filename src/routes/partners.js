const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, hasRole } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const {
  sanitizeText, sanitizeEmail, toInt, whitelist, sendSuccess, sendError
} = require('../helpers/utils');

const router = express.Router();

const VALID_TYPES = ['customer', 'receiver', 'sender', 'agent'];

// ============ GET /api/partners?type=customer ============
router.get('/', verifyToken, async (req, res) => {
  try {
    const type = sanitizeText(req.query.type || '');
    let rows;
    if (type && VALID_TYPES.includes(type)) {
      [rows] = await pool.execute(
        'SELECT * FROM partners WHERE type = ? AND deleted_at IS NULL ORDER BY company_name ASC',
        [type]
      );
    } else {
      [rows] = await pool.execute('SELECT * FROM partners WHERE deleted_at IS NULL ORDER BY type, company_name ASC');
    }

    // extra_roles CSV → array
    const out = rows.map(p => ({
      ...p,
      extra_roles: p.extra_roles ? String(p.extra_roles).split(',').filter(Boolean) : []
    }));
    sendSuccess(res, out);
  } catch (err) {
    console.error('[partners/list]', err);
    sendError(res, 'Partnerlar alınamadı', 500);
  }
});

// ============ POST /api/partners ============
router.post('/', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    const partnerId = toInt(body.partner_id);
    const type = whitelist(sanitizeText(body.type), VALID_TYPES, 'customer');
    const companyName = sanitizeText(body.company_name);
    if (!companyName) return sendError(res, 'Şirket adı zorunludur');

    // extra_roles: ana rolden farklı, geçerli rollerden olanlar
    const rawExtras = Array.isArray(body.extra_roles) ? body.extra_roles : [];
    const extraRoles = rawExtras
      .map(r => sanitizeText(r))
      .filter(r => VALID_TYPES.includes(r) && r !== type);

    const data = {
      type,
      extra_roles: extraRoles.join(','),
      company_name: companyName,
      physical_address: sanitizeText(body.physical_address),
      postal_code: sanitizeText(body.postal_code),
      city: sanitizeText(body.city),
      country: sanitizeText(body.country),
      contact_person: sanitizeText(body.contact_person),
      contact_email: sanitizeEmail(body.contact_email),
      contact_phone: sanitizeText(body.contact_phone),
      tax_number: sanitizeText(body.tax_number),
      mersis_number: sanitizeText(body.mersis_number),
      eori_number: sanitizeText(body.eori_number),
      billing_address: sanitizeText(body.billing_address),
      billing_email: sanitizeEmail(body.billing_email)
    };

    if (partnerId) {
      const cols = Object.keys(data);
      const setClause = cols.map(c => `\`${c}\` = ?`).join(', ');
      const values = [...cols.map(c => data[c]), partnerId];
      await pool.execute(`UPDATE partners SET ${setClause} WHERE id = ?`, values);
      await logAudit(req, 'update', 'partners', partnerId, data.company_name);
      return sendSuccess(res, { id: partnerId, message: 'Partner güncellendi' });
    }

    data.created_by = req.user.id;
    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(', ');
    const colList = cols.map(c => `\`${c}\``).join(', ');
    const [result] = await pool.execute(
      `INSERT INTO partners (${colList}) VALUES (${placeholders})`,
      cols.map(c => data[c])
    );
    const newId = result.insertId;
    const code = String(newId).padStart(5, '0');
    await pool.execute('UPDATE partners SET partner_code = ? WHERE id = ?', [code, newId]);
    await logAudit(req, 'create', 'partners', newId, data.company_name);

    sendSuccess(res, { id: newId, partner_code: code, message: 'Partner oluşturuldu' });
  } catch (err) {
    console.error('[partners/save]', err);
    sendError(res, 'Kayıt sırasında hata: ' + err.message, 500);
  }
});

// ============ GET /api/partners/:id ============
// Tek partner detayı
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');
    const [rows] = await pool.execute('SELECT * FROM partners WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    if (rows.length === 0) return sendError(res, 'Kayıt bulunamadı', 404);
    sendSuccess(res, rows[0]);
  } catch (err) {
    console.error('[partners/get]', err);
    sendError(res, 'Hata', 500);
  }
});

// ============ GET /api/partners/:id/shipments ============
// Bu partner'ın yer aldığı tüm sevkiyatlar (müşteri/gönderici/alıcı/acente olarak)
// + finansal özet (toplam ciro, kar, ödenmiş/bekleyen)
router.get('/:id/shipments', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    // Partner adını al
    const [pRows] = await pool.execute('SELECT id, company_name FROM partners WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    if (pRows.length === 0) return sendError(res, 'Kayıt bulunamadı', 404);
    const company = pRows[0].company_name;

    // Bu şirket adının geçtiği sevkiyatlar (4 farklı rolde, arşivde değil)
    const sql = `
      SELECT s.*, u.username AS created_by_username
      FROM shipments s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.deleted_at IS NULL
        AND (s.client_billing = ? OR s.sender = ? OR s.receiver = ? OR s.agent = ?)
      ORDER BY s.created_at DESC
    `;
    const [shipments] = await pool.execute(sql, [company, company, company, company]);

    // Özet: toplam ciro, alış, kar, ödenmiş/bekleyen
    let totalSale = 0, totalPurchase = 0, totalInvoiced = 0, paidCount = 0, unpaidCount = 0;
    const byMode = {};
    const byStatus = {};
    for (const s of shipments) {
      const sale = parseFloat(s.sale_price || 0);
      const purchase = parseFloat(s.purchase_price || 0);
      totalSale += sale;
      totalPurchase += purchase;
      if (s.invoice_generated) totalInvoiced += parseFloat(s.invoice_amount || 0);
      if (s.payment_received) paidCount++;
      else if (s.invoice_generated) unpaidCount++;

      const mode = s.transport_type;
      byMode[mode] = (byMode[mode] || 0) + 1;
      const status = s.status;
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    sendSuccess(res, {
      partner: pRows[0],
      shipments,
      summary: {
        count: shipments.length,
        total_sale: totalSale,
        total_purchase: totalPurchase,
        total_profit: totalSale - totalPurchase,
        margin: totalSale > 0 ? ((totalSale - totalPurchase) / totalSale) * 100 : 0,
        total_invoiced: totalInvoiced,
        paid_count: paidCount,
        unpaid_count: unpaidCount,
        by_mode: byMode,
        by_status: byStatus,
      },
    });
  } catch (err) {
    console.error('[partners/shipments]', err);
    sendError(res, 'Hata', 500);
  }
});

// ============ DELETE /api/partners/:id ============
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    // Mevcut mu? (arşivde değil)
    const [rows] = await pool.execute('SELECT id, company_name FROM partners WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    if (rows.length === 0) return sendError(res, 'Kayıt bulunamadı', 404);
    const partner = rows[0];

    // RESTRICT: bu partner aktif sevkiyatlarda kullanılıyor mu?
    const [refs] = await pool.execute(
      `SELECT COUNT(*) AS c FROM shipments
       WHERE deleted_at IS NULL
         AND (client_billing = ? OR sender = ? OR receiver = ? OR agent = ? OR depo_musteri = ?)`,
      [partner.company_name, partner.company_name, partner.company_name, partner.company_name, partner.company_name]
    );
    if (refs[0].c > 0) {
      return sendError(
        res,
        `Bu partner ${refs[0].c} aktif sevkiyatta kullanılıyor. Önce bu sevkiyatları güncelleyin ya da arşivleyin.`
      );
    }

    // Soft-delete (arşive taşı)
    await pool.execute('UPDATE partners SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [req.user.id, id]);
    await logAudit(req, 'delete', 'partners', id, partner.company_name);
    sendSuccess(res, { message: 'Arşive taşındı' });
  } catch (err) {
    console.error('[partners/delete]', err);
    sendError(res, 'Silme sırasında hata: ' + err.message, 500);
  }
});

module.exports = router;
