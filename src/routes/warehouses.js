const express = require('express');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const {
  sanitizeText, sanitizeEmail, toInt, whitelist, sendSuccess, sendError
} = require('../helpers/utils');

const router = express.Router();

const VALID_TYPES = ['R', 'S', 'T', 'U', 'V', 'Y', 'Z'];
const VALID_STATUS = ['active', 'inactive'];

// ============ GET /api/warehouses ============
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM warehouses ORDER BY warehouse_code ASC'
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[warehouses/list]', err);
    sendError(res, 'Depolar alınamadı', 500);
  }
});

// ============ POST /api/warehouses ============
router.post('/', verifyToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const body = req.body || {};
    const id = toInt(body.warehouse_id);
    const name = sanitizeText(body.name);
    if (!name) {
      await conn.rollback();
      return sendError(res, 'Depo adı zorunludur');
    }

    const data = {
      name,
      type_code: whitelist(sanitizeText(body.type_code).toUpperCase(), VALID_TYPES, 'U'),
      address: sanitizeText(body.address),
      postal_code: sanitizeText(body.postal_code),
      city: sanitizeText(body.city),
      country: sanitizeText(body.country),
      capacity_info: sanitizeText(body.capacity_info),
      responsible_person: sanitizeText(body.responsible_person),
      contact_phone: sanitizeText(body.contact_phone),
      contact_email: sanitizeEmail(body.contact_email),
      notes: sanitizeText(body.notes),
      status: whitelist(sanitizeText(body.status), VALID_STATUS, 'active')
    };

    if (id) {
      const cols = Object.keys(data);
      const setClause = cols.map(c => `\`${c}\` = ?`).join(', ');
      await conn.execute(
        `UPDATE warehouses SET ${setClause} WHERE id = ?`,
        [...cols.map(c => data[c]), id]
      );
      await conn.commit();
      await logAudit(req, 'update', 'warehouses', id, data.name);
      return sendSuccess(res, { id, message: 'Depo güncellendi' });
    }

    data.created_by = req.user.id;
    // warehouse_code geçici (insert sonrası id'ye göre düzeltilir — race-free)
    data.warehouse_code = 'WTMP_' + Date.now();
    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(', ');
    const colList = cols.map(c => `\`${c}\``).join(', ');
    const [result] = await conn.execute(
      `INSERT INTO warehouses (${colList}) VALUES (${placeholders})`,
      cols.map(c => data[c])
    );
    const newId = result.insertId;
    const code = 'W' + String(newId).padStart(3, '0');
    await conn.execute('UPDATE warehouses SET warehouse_code = ? WHERE id = ?', [code, newId]);
    await conn.commit();
    await logAudit(req, 'create', 'warehouses', newId, data.name);

    sendSuccess(res, { id: newId, warehouse_code: code, message: 'Depo eklendi' });
  } catch (err) {
    await conn.rollback();
    console.error('[warehouses/save]', err);
    sendError(res, 'Kayıt sırasında hata: ' + err.message, 500);
  } finally {
    conn.release();
  }
});

// ============ DELETE /api/warehouses/:id ============
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    const [rows] = await pool.execute('SELECT name FROM warehouses WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return sendError(res, 'Kayıt bulunamadı', 404);

    // RESTRICT: bu depo sevkiyatlarda kullanılıyor mu?
    const [refs] = await pool.execute(
      'SELECT COUNT(*) AS c FROM shipments WHERE warehouse = ?',
      [rows[0].name]
    );
    if (refs[0].c > 0) {
      return sendError(
        res,
        `Bu depo ${refs[0].c} sevkiyatta kullanılıyor. Önce bu sevkiyatları güncelleyin ya da silin.`
      );
    }

    await pool.execute('DELETE FROM warehouses WHERE id = ?', [id]);
    await logAudit(req, 'delete', 'warehouses', id, rows[0].name);
    sendSuccess(res, { message: 'Depo silindi' });
  } catch (err) {
    console.error('[warehouses/delete]', err);
    sendError(res, 'Silme sırasında hata: ' + err.message, 500);
  }
});

module.exports = router;
