const express = require('express');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../helpers/utils');

const router = express.Router();

/**
 * GET /api/lookup/vehicle-summary
 * Her aracın doluluk özeti (toplam atama ağırlığı, kapasite kullanım %).
 */
router.get('/vehicle-summary', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        v.id, v.vehicle_code, v.plate, v.transport_type, v.status,
        v.capacity_kg, v.volume_m3, v.driver_name,
        COUNT(va.id) AS assignment_count,
        COALESCE(SUM(va.assigned_quantity), 0) AS total_quantity,
        COALESCE(SUM(va.assigned_weight), 0) AS total_weight,
        CASE WHEN v.capacity_kg > 0
          THEN ROUND((COALESCE(SUM(va.assigned_weight),0) / v.capacity_kg) * 100, 1)
          ELSE 0 END AS load_percent
      FROM vehicles v
      LEFT JOIN vehicle_assignments va ON va.vehicle_id = v.id AND va.deleted_at IS NULL
      WHERE v.deleted_at IS NULL
      GROUP BY v.id, v.vehicle_code, v.plate, v.transport_type, v.status, v.capacity_kg, v.volume_m3, v.driver_name
      ORDER BY load_percent DESC, v.vehicle_code
    `);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[lookup/vehicle-summary]', err);
    sendError(res, 'Hata', 500);
  }
});

/**
 * GET /api/lookup/warehouse-summary
 * Her deponun aktif sevkiyat sayısı + son hareket tarihi.
 */
router.get('/warehouse-summary', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        w.id, w.warehouse_code, w.name, w.type_code, w.status, w.city, w.country,
        COUNT(s.id) AS active_count,
        MAX(s.created_at) AS last_activity
      FROM warehouses w
      LEFT JOIN shipments s ON
        s.transport_type = 'storage'
        AND s.status != 'closed'
        AND s.deleted_at IS NULL
        AND (s.warehouse = w.name OR s.storage_data LIKE CONCAT('%"warehouse_id":"', w.id, '"%'))
      WHERE w.deleted_at IS NULL
      GROUP BY w.id, w.warehouse_code, w.name, w.type_code, w.status, w.city, w.country
      ORDER BY active_count DESC, w.warehouse_code
    `);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[lookup/warehouse-summary]', err);
    sendError(res, 'Hata', 500);
  }
});

/**
 * GET /api/lookup/sidebar-alerts
 * Aktif uyarılar — eksik belge, gecikmiş ödeme, transit süresi.
 */
router.get('/sidebar-alerts', verifyToken, async (req, res) => {
  try {
    // Eksik belgesi olan sevkiyatlar
    const [docMissing] = await pool.execute(`
      SELECT COUNT(*) AS c FROM shipments
      WHERE deleted_at IS NULL
      AND status != 'closed'
      AND documents_data IS NOT NULL AND documents_data != ''
      AND documents_data LIKE '%"status":"missing"%'
    `);

    // Gecikmiş ödemeler (faturalı, ödenmemiş, 30+ gün)
    const [overdue] = await pool.execute(`
      SELECT COUNT(*) AS c FROM shipments
      WHERE deleted_at IS NULL
      AND invoice_generated = 1
      AND (payment_received = 0 OR payment_received IS NULL)
      AND invoice_date IS NOT NULL
      AND invoice_date < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Transit süresi yaklaşan storage sevkiyatları (basit: storage tipinde 30+ gün)
    const [transitWarn] = await pool.execute(`
      SELECT COUNT(*) AS c FROM shipments
      WHERE deleted_at IS NULL
      AND transport_type = 'storage'
      AND status != 'closed'
      AND entry_date IS NOT NULL
      AND DATEDIFF(NOW(), entry_date) > 30
    `);

    sendSuccess(res, {
      docs_missing_shipments: docMissing[0].c,
      overdue_payments: overdue[0].c,
      transit_warnings: transitWarn[0].c,
    });
  } catch (err) {
    console.error('[lookup/sidebar-alerts]', err);
    sendError(res, 'Hata', 500);
  }
});

module.exports = router;
