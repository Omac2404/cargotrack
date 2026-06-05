const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, requirePermission, hasRole } = require('../middleware/auth');
const { toInt, sanitizeText, sendSuccess, sendError } = require('../helpers/utils');

const router = express.Router();

// Hepsi reports.view izni gerektirir
router.use(verifyToken, requirePermission('reports.view'));

const MODE_LABELS = {
  road: 'Karayolu', maritime: 'Denizyolu', sea: 'Denizyolu',
  air: 'Havayolu', storage: 'Depolama', import: 'İthalat', export: 'İhracat',
};

/**
 * GET /api/reports/monthly-revenue?year=2026&transport_type=road
 * Aylık ciro/maliyet/kâr — 12 aylık dizi
 */
router.get('/monthly-revenue', async (req, res) => {
  try {
    const year = toInt(req.query.year) || new Date().getFullYear();
    const transportType = sanitizeText(req.query.transport_type || '');

    const where = ['deleted_at IS NULL', 'YEAR(created_at) = ?'];
    const params = [year];
    if (transportType) {
      where.push('transport_type = ?');
      params.push(transportType);
    }
    if (!hasRole(req.user, 'admin')) {
      where.push('created_by = ?');
      params.push(req.user.id);
    }

    const [rows] = await pool.execute(
      `SELECT
         MONTH(created_at) AS month,
         COUNT(*) AS shipment_count,
         COALESCE(SUM(sale_price), 0) AS total_sale,
         COALESCE(SUM(purchase_price), 0) AS total_purchase,
         COALESCE(SUM(sale_price - purchase_price), 0) AS profit
       FROM shipments
       WHERE ${where.join(' AND ')}
       GROUP BY MONTH(created_at)
       ORDER BY MONTH(created_at)`,
      params
    );

    // 12 ay için doldur (eksik aylar 0)
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const byMonth = new Map(rows.map(r => [r.month, r]));
    const series = [];
    for (let m = 1; m <= 12; m++) {
      const r = byMonth.get(m) || {};
      series.push({
        month: m,
        month_name: monthNames[m - 1],
        shipment_count: parseInt(r.shipment_count || 0, 10),
        total_sale: parseFloat(r.total_sale || 0),
        total_purchase: parseFloat(r.total_purchase || 0),
        profit: parseFloat(r.profit || 0),
        margin: r.total_sale > 0 ? ((r.total_sale - r.total_purchase) / r.total_sale) * 100 : 0,
      });
    }

    // Toplamlar
    const totals = series.reduce((acc, m) => ({
      shipment_count: acc.shipment_count + m.shipment_count,
      total_sale: acc.total_sale + m.total_sale,
      total_purchase: acc.total_purchase + m.total_purchase,
      profit: acc.profit + m.profit,
    }), { shipment_count: 0, total_sale: 0, total_purchase: 0, profit: 0 });
    totals.margin = totals.total_sale > 0 ? ((totals.total_sale - totals.total_purchase) / totals.total_sale) * 100 : 0;

    sendSuccess(res, { year, transport_type: transportType || 'all', series, totals });
  } catch (err) {
    console.error('[reports/monthly-revenue]', err);
    sendError(res, 'Rapor üretilemedi', 500);
  }
});

/**
 * GET /api/reports/customer-ranking?year=2026&limit=20
 * En iyi müşteriler (ciro bazlı, top N)
 */
router.get('/customer-ranking', async (req, res) => {
  try {
    const year = toInt(req.query.year) || new Date().getFullYear();
    const limit = Math.min(100, Math.max(5, toInt(req.query.limit) || 20));

    const where = ['s.deleted_at IS NULL', 'YEAR(s.created_at) = ?', 's.client_billing IS NOT NULL', "s.client_billing != ''"];
    const params = [year];
    if (!hasRole(req.user, 'admin')) {
      where.push('s.created_by = ?');
      params.push(req.user.id);
    }

    const [rows] = await pool.execute(
      `SELECT
         s.client_billing AS company_name,
         COUNT(*) AS shipment_count,
         COALESCE(SUM(s.sale_price), 0) AS total_sale,
         COALESCE(SUM(s.purchase_price), 0) AS total_purchase,
         COALESCE(SUM(s.sale_price - s.purchase_price), 0) AS profit,
         COALESCE(SUM(CASE WHEN s.invoice_generated AND NOT s.payment_received THEN s.invoice_amount ELSE 0 END), 0) AS pending_payment
       FROM shipments s
       WHERE ${where.join(' AND ')}
       GROUP BY s.client_billing
       ORDER BY total_sale DESC
       LIMIT ${limit}`,
      params
    );

    const customers = rows.map(r => ({
      company_name: r.company_name,
      shipment_count: parseInt(r.shipment_count || 0, 10),
      total_sale: parseFloat(r.total_sale || 0),
      total_purchase: parseFloat(r.total_purchase || 0),
      profit: parseFloat(r.profit || 0),
      margin: r.total_sale > 0 ? ((r.total_sale - r.total_purchase) / r.total_sale) * 100 : 0,
      pending_payment: parseFloat(r.pending_payment || 0),
    }));

    sendSuccess(res, { year, limit, customers });
  } catch (err) {
    console.error('[reports/customer-ranking]', err);
    sendError(res, 'Rapor üretilemedi', 500);
  }
});

/**
 * GET /api/reports/aging
 * Yaşlanan alacak — faturalı ama ödenmemiş sevkiyatlar yaş gruplarına göre
 */
router.get('/aging', async (req, res) => {
  try {
    const where = ['s.deleted_at IS NULL', 's.invoice_generated = 1', 's.payment_received = 0', 's.invoice_date IS NOT NULL'];
    const params = [];
    if (!hasRole(req.user, 'admin')) {
      where.push('s.created_by = ?');
      params.push(req.user.id);
    }

    const [rows] = await pool.execute(
      `SELECT
         s.id, s.shipment_no, s.client_billing, s.invoice_no, s.invoice_date,
         s.invoice_amount, s.currency_code,
         DATEDIFF(CURDATE(), s.invoice_date) AS days_overdue
       FROM shipments s
       WHERE ${where.join(' AND ')}
       ORDER BY s.invoice_date ASC`,
      params
    );

    // Yaş gruplarına ayır
    const buckets = {
      current: { label: 'Güncel (0-30 gün)', items: [], total: 0 },
      d30_60: { label: '30-60 gün', items: [], total: 0 },
      d60_90: { label: '60-90 gün', items: [], total: 0 },
      d90_plus: { label: '90+ gün (kritik)', items: [], total: 0 },
    };

    for (const r of rows) {
      const amount = parseFloat(r.invoice_amount || 0);
      const days = parseInt(r.days_overdue || 0, 10);
      const item = {
        id: r.id,
        shipment_no: r.shipment_no,
        client: r.client_billing,
        invoice_no: r.invoice_no,
        invoice_date: r.invoice_date,
        amount,
        currency: r.currency_code || 'EUR',
        days_overdue: days,
      };
      let bucket;
      if (days <= 30) bucket = 'current';
      else if (days <= 60) bucket = 'd30_60';
      else if (days <= 90) bucket = 'd60_90';
      else bucket = 'd90_plus';
      buckets[bucket].items.push(item);
      buckets[bucket].total += amount;
    }

    const totalUnpaid = Object.values(buckets).reduce((sum, b) => sum + b.total, 0);

    sendSuccess(res, {
      buckets: Object.entries(buckets).map(([key, b]) => ({ key, ...b })),
      total_unpaid: totalUnpaid,
      total_count: rows.length,
    });
  } catch (err) {
    console.error('[reports/aging]', err);
    sendError(res, 'Rapor üretilemedi', 500);
  }
});

/**
 * GET /api/reports/vehicle-utilization?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Araç başına: atama sayısı, toplam taşınan kap/kg, ortalama doluluk %
 */
router.get('/vehicle-utilization', async (req, res) => {
  try {
    const today = new Date();
    const defStart = new Date(today);
    defStart.setDate(today.getDate() - 30);
    const start = sanitizeText(req.query.start) || defStart.toISOString().slice(0, 10);
    const end = sanitizeText(req.query.end) || today.toISOString().slice(0, 10);

    const [rows] = await pool.execute(
      `SELECT
         v.id, v.vehicle_code, v.plate, v.transport_type, v.capacity_kg,
         COUNT(a.id) AS assignment_count,
         COALESCE(SUM(a.assigned_quantity), 0) AS total_quantity,
         COALESCE(SUM(a.assigned_weight), 0) AS total_weight
       FROM vehicles v
       LEFT JOIN vehicle_assignments a ON a.vehicle_id = v.id
         AND a.deleted_at IS NULL
         AND a.loading_date BETWEEN ? AND ?
       WHERE v.status = 'active' AND v.deleted_at IS NULL
       GROUP BY v.id
       ORDER BY assignment_count DESC`,
      [start, end]
    );

    const vehicles = rows.map(r => {
      const cap = parseFloat(r.capacity_kg || 0);
      const wgt = parseFloat(r.total_weight || 0);
      // Doluluk: bu dönemde toplam ağırlık / (kapasite x atama sayısı) — basitleştirilmiş
      const utilization = cap > 0 && r.assignment_count > 0
        ? (wgt / (cap * r.assignment_count)) * 100
        : 0;
      return {
        id: r.id,
        vehicle_code: r.vehicle_code,
        plate: r.plate,
        transport_type: r.transport_type,
        capacity_kg: cap,
        assignment_count: parseInt(r.assignment_count || 0, 10),
        total_quantity: parseInt(r.total_quantity || 0, 10),
        total_weight: wgt,
        avg_utilization: Math.min(100, Math.round(utilization * 10) / 10),
      };
    });

    sendSuccess(res, { start, end, vehicles });
  } catch (err) {
    console.error('[reports/vehicle-utilization]', err);
    sendError(res, 'Rapor üretilemedi', 500);
  }
});

/**
 * GET /api/reports/user-performance?year=2026
 * Kullanıcı bazlı: kaç sevkiyat oluşturmuş, toplam ciro, kâr
 */
router.get('/user-performance', async (req, res) => {
  try {
    const year = toInt(req.query.year) || new Date().getFullYear();
    if (!hasRole(req.user, 'admin')) {
      return sendError(res, 'Bu rapor için admin yetkisi gerekir', 403);
    }

    const [rows] = await pool.execute(
      `SELECT
         u.id, u.username, u.full_name, u.role,
         COUNT(s.id) AS shipment_count,
         COALESCE(SUM(s.sale_price), 0) AS total_sale,
         COALESCE(SUM(s.sale_price - s.purchase_price), 0) AS profit
       FROM users u
       LEFT JOIN shipments s ON s.created_by = u.id AND YEAR(s.created_at) = ?
       WHERE u.status = 'active'
       GROUP BY u.id
       ORDER BY shipment_count DESC`,
      [year]
    );

    const users = rows.map(r => ({
      id: r.id,
      username: r.username,
      full_name: r.full_name,
      role: r.role,
      shipment_count: parseInt(r.shipment_count || 0, 10),
      total_sale: parseFloat(r.total_sale || 0),
      profit: parseFloat(r.profit || 0),
    }));

    sendSuccess(res, { year, users });
  } catch (err) {
    console.error('[reports/user-performance]', err);
    sendError(res, 'Rapor üretilemedi', 500);
  }
});

module.exports = router;
