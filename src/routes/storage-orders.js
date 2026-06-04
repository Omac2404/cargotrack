const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, hasRole } = require('../middleware/auth');
const { sendSuccess, sendError, sanitizeText, toInt } = require('../helpers/utils');

const router = express.Router();

/**
 * GET /api/storage-orders
 * Aktif depo sevkiyatları (storage tipinde, status !== closed).
 * Filtre: ?warehouse_id=X (storage_data JSON içinde aranır)
 *         ?status=active|closed|all
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const statusFilter = sanitizeText(req.query.status) || 'active';
    const warehouseId = toInt(req.query.warehouse_id);

    let where = "transport_type = 'storage'";
    const params = [];

    if (statusFilter === 'active') {
      where += " AND status != 'closed'";
    } else if (statusFilter === 'closed') {
      where += " AND status = 'closed'";
    }

    if (warehouseId > 0) {
      where += ` AND storage_data LIKE ?`;
      params.push(`%"warehouse_id":"${warehouseId}"%`);
    }

    // Ownership filter
    if (!hasRole(req.user, 'admin')) {
      where += ' AND created_by = ?';
      params.push(req.user.id);
    }

    const [rows] = await pool.execute(
      `SELECT id, shipment_no, status, created_date, client_billing, depo_musteri,
              warehouse, entry_date, exit_date, depo_kap_sayisi,
              depo_toplam_satis, currency_code, storage_data, depo_stock_log,
              created_at, updated_at
       FROM shipments
       WHERE ${where}
       ORDER BY entry_date DESC, created_at DESC`,
      params
    );

    sendSuccess(res, rows);
  } catch (err) {
    console.error('[storage-orders/list]', err);
    sendError(res, 'Depolama siparişleri alınamadı', 500);
  }
});

module.exports = router;
