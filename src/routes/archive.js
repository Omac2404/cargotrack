/**
 * /api/archive — Arşivlenen (soft-delete) kayıtları listele, geri yükle, kalıcı sil.
 *
 * Yetkiler:
 *   - archive.view    → herkes (user dahil) görüntüleyebilir
 *   - archive.restore → admin+
 *   - archive.purge   → sadece super_admin (kalıcı silme)
 *
 * Entity'ler:
 *   - shipments
 *   - partners
 *   - vehicles
 *   - warehouses
 *   - assignments (vehicle_assignments)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const { verifyToken, requirePermission, requireRole, hasRole } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const { toInt, sanitizeText, sendSuccess, sendError } = require('../helpers/utils');

const router = express.Router();

// Entity → DB tablo + görsel etiket alan + display label
const ENTITY_MAP = {
  shipments: {
    table: 'shipments',
    labelCol: 'shipment_no',
    listCols: 'id, shipment_no, transport_type, status, client_billing, departure_country, arrival_country, sale_price, currency_code, created_at, deleted_at, deleted_by',
    label: 'Sevkiyat',
  },
  partners: {
    table: 'partners',
    labelCol: 'company_name',
    listCols: 'id, partner_code, type, company_name, city, country, contact_email, created_at, deleted_at, deleted_by',
    label: 'Partner',
  },
  vehicles: {
    table: 'vehicles',
    labelCol: 'plate',
    listCols: 'id, vehicle_code, transport_type, plate, trailer_plate, driver_name, status, created_at, deleted_at, deleted_by',
    label: 'Araç',
  },
  warehouses: {
    table: 'warehouses',
    labelCol: 'name',
    listCols: 'id, warehouse_code, name, type_code, city, country, status, created_at, deleted_at, deleted_by',
    label: 'Depo',
  },
  assignments: {
    table: 'vehicle_assignments',
    labelCol: null, // id ile gösterilir
    listCols: 'id, vehicle_id, shipment_id, assigned_quantity, assigned_weight, loading_date, created_at, deleted_at, deleted_by',
    label: 'Atama',
  },
};

function getEntity(name) {
  const k = String(name || '').toLowerCase();
  return ENTITY_MAP[k] || null;
}

// === Audit hook: silme/restore'u audit_log'a yaz ===
async function auditAction(req, action, entityKey, id, label) {
  try {
    await logAudit(req, action, entityKey, id, label);
  } catch (e) {
    console.warn('[archive/audit]', e.message);
  }
}

// ============ GET /api/archive/counts ============
// Sidebar badge için: her entity'nin arşivdeki kayıt sayısı
router.get('/counts', verifyToken, requirePermission('archive.view'), async (req, res) => {
  try {
    const counts = {};
    for (const [key, cfg] of Object.entries(ENTITY_MAP)) {
      const [rows] = await pool.execute(
        `SELECT COUNT(*) AS c FROM \`${cfg.table}\` WHERE deleted_at IS NOT NULL`
      );
      counts[key] = rows[0].c;
    }
    sendSuccess(res, counts);
  } catch (err) {
    console.error('[archive/counts]', err);
    sendError(res, 'Sayım alınamadı', 500);
  }
});

// ============ GET /api/archive/:entity ============
// Arşivdeki kayıtları listele (kim silmiş + ne zaman bilgisi ile)
router.get('/:entity', verifyToken, requirePermission('archive.view'), async (req, res) => {
  try {
    const cfg = getEntity(req.params.entity);
    if (!cfg) return sendError(res, 'Geçersiz entity');

    const q = sanitizeText(req.query.q || '');
    const params = [];
    let searchWhere = '';
    if (q && cfg.labelCol) {
      searchWhere = ` AND \`${cfg.labelCol}\` LIKE ?`;
      params.push(`%${q}%`);
    }

    const [rows] = await pool.execute(
      `SELECT ${cfg.listCols},
              (SELECT username FROM users WHERE id = t.deleted_by) AS deleted_by_username,
              (SELECT full_name FROM users WHERE id = t.deleted_by) AS deleted_by_fullname
       FROM \`${cfg.table}\` t
       WHERE deleted_at IS NOT NULL ${searchWhere}
       ORDER BY deleted_at DESC
       LIMIT 500`,
      params
    );

    sendSuccess(res, { items: rows, total: rows.length, entity: req.params.entity });
  } catch (err) {
    console.error('[archive/list]', err);
    sendError(res, 'Arşiv listelenemedi: ' + err.message, 500);
  }
});

// ============ POST /api/archive/:entity/:id/restore ============
// Tek bir kaydı arşivden geri al
router.post('/:entity/:id/restore', verifyToken, requirePermission('archive.restore'), async (req, res) => {
  try {
    const cfg = getEntity(req.params.entity);
    if (!cfg) return sendError(res, 'Geçersiz entity');
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    const labelExpr = cfg.labelCol ? `\`${cfg.labelCol}\`` : 'id';
    const [rows] = await pool.execute(
      `SELECT id, ${labelExpr} AS label FROM \`${cfg.table}\` WHERE id = ? AND deleted_at IS NOT NULL LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return sendError(res, 'Kayıt arşivde bulunamadı', 404);

    await pool.execute(
      `UPDATE \`${cfg.table}\` SET deleted_at = NULL, deleted_by = NULL WHERE id = ?`,
      [id]
    );
    await auditAction(req, 'update', req.params.entity, id, `[geri yüklendi] ${rows[0].label || `#${id}`}`);
    sendSuccess(res, { message: `${cfg.label} geri yüklendi` });
  } catch (err) {
    console.error('[archive/restore]', err);
    sendError(res, 'Geri yükleme sırasında hata: ' + err.message, 500);
  }
});

// ============ DELETE /api/archive/:entity/:id ============
// Kalıcı silme — sadece super_admin
router.delete('/:entity/:id', verifyToken, requirePermission('archive.purge'), async (req, res) => {
  try {
    const cfg = getEntity(req.params.entity);
    if (!cfg) return sendError(res, 'Geçersiz entity');
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    const labelExpr = cfg.labelCol ? `\`${cfg.labelCol}\`` : 'id';
    const [rows] = await pool.execute(
      `SELECT id, ${labelExpr} AS label FROM \`${cfg.table}\` WHERE id = ? AND deleted_at IS NOT NULL LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return sendError(res, 'Kayıt arşivde bulunamadı', 404);

    // Shipment ise upload klasörünü de temizle
    if (req.params.entity === 'shipments') {
      const uploadBase = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));
      const uploadDir = path.join(uploadBase, String(id));
      if (fs.existsSync(uploadDir)) {
        try { fs.rmSync(uploadDir, { recursive: true, force: true }); }
        catch (e) { console.warn('[archive/purge] uploads cleanup:', e.message); }
      }
    }

    await pool.execute(`DELETE FROM \`${cfg.table}\` WHERE id = ?`, [id]);
    await auditAction(req, 'delete', req.params.entity, id, `[kalıcı silindi] ${rows[0].label || `#${id}`}`);
    sendSuccess(res, { message: `${cfg.label} kalıcı silindi` });
  } catch (err) {
    console.error('[archive/purge]', err);
    sendError(res, 'Kalıcı silme sırasında hata: ' + err.message, 500);
  }
});

// ============ POST /api/archive/:entity/bulk-restore ============
// body: { ids: [1, 2, 3] }
router.post('/:entity/bulk-restore', verifyToken, requirePermission('archive.restore'), async (req, res) => {
  try {
    const cfg = getEntity(req.params.entity);
    if (!cfg) return sendError(res, 'Geçersiz entity');

    const body = req.body || {};
    const ids = Array.isArray(body.ids) ? body.ids.map(toInt).filter(n => n > 0) : [];
    if (ids.length === 0) return sendError(res, 'Hiç kayıt seçilmedi');

    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT id FROM \`${cfg.table}\` WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`,
      ids
    );
    if (rows.length === 0) return sendError(res, 'Arşivde uygun kayıt bulunamadı', 404);

    const validIds = rows.map(r => r.id);
    const validPlaceholders = validIds.map(() => '?').join(',');
    await pool.execute(
      `UPDATE \`${cfg.table}\` SET deleted_at = NULL, deleted_by = NULL WHERE id IN (${validPlaceholders})`,
      validIds
    );
    for (const r of rows) {
      await auditAction(req, 'update', req.params.entity, r.id, `[toplu geri yüklendi] #${r.id}`);
    }
    sendSuccess(res, { restored: rows.length, message: `${rows.length} kayıt geri yüklendi` });
  } catch (err) {
    console.error('[archive/bulk-restore]', err);
    sendError(res, 'Toplu geri yükleme hatası: ' + err.message, 500);
  }
});

// ============ POST /api/archive/:entity/bulk-purge ============
// body: { ids: [1, 2, 3] } — sadece super_admin
router.post('/:entity/bulk-purge', verifyToken, requirePermission('archive.purge'), async (req, res) => {
  try {
    const cfg = getEntity(req.params.entity);
    if (!cfg) return sendError(res, 'Geçersiz entity');

    const body = req.body || {};
    const ids = Array.isArray(body.ids) ? body.ids.map(toInt).filter(n => n > 0) : [];
    if (ids.length === 0) return sendError(res, 'Hiç kayıt seçilmedi');

    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT id FROM \`${cfg.table}\` WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`,
      ids
    );
    if (rows.length === 0) return sendError(res, 'Arşivde uygun kayıt bulunamadı', 404);

    const validIds = rows.map(r => r.id);

    // Shipment ise upload klasörlerini temizle
    if (req.params.entity === 'shipments') {
      const uploadBase = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));
      for (const sid of validIds) {
        const uploadDir = path.join(uploadBase, String(sid));
        if (fs.existsSync(uploadDir)) {
          try { fs.rmSync(uploadDir, { recursive: true, force: true }); } catch (_) { /* sessiz */ }
        }
      }
    }

    const validPlaceholders = validIds.map(() => '?').join(',');
    await pool.execute(
      `DELETE FROM \`${cfg.table}\` WHERE id IN (${validPlaceholders})`,
      validIds
    );
    for (const r of rows) {
      await auditAction(req, 'delete', req.params.entity, r.id, `[toplu kalıcı silindi] #${r.id}`);
    }
    sendSuccess(res, { purged: rows.length, message: `${rows.length} kayıt kalıcı silindi` });
  } catch (err) {
    console.error('[archive/bulk-purge]', err);
    sendError(res, 'Toplu kalıcı silme hatası: ' + err.message, 500);
  }
});

module.exports = router;
