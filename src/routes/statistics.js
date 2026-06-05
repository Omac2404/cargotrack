const express = require('express');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { sanitizeText, toInt, sendSuccess, sendError } = require('../helpers/utils');

const router = express.Router();

const VALID_TT_FILTERS = ['road', 'maritime', 'air', 'storage'];

function validDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Filtre parametrelerini topla
function parseFilters(src) {
  let dateFrom = sanitizeText(src.date_from);
  let dateTo = sanitizeText(src.date_to);
  let ttFilter = sanitizeText(src.transport_type);
  const customerId = toInt(src.customer_id);
  const currency = sanitizeText(src.currency) || 'EUR';

  if (!validDate(dateFrom)) dateFrom = daysAgoStr(30);
  if (!validDate(dateTo)) dateTo = todayStr();
  if (ttFilter === 'sea') ttFilter = 'maritime';
  if (ttFilter && !VALID_TT_FILTERS.includes(ttFilter)) ttFilter = '';

  return { dateFrom, dateTo, ttFilter, customerId, currency };
}

// ============ POST /api/statistics ============
router.post('/', verifyToken, async (req, res) => {
  try {
    const f = parseFilters(req.body || {});

    // WHERE inşa et (arşivde olanlar istatistiklerden hariç)
    const whereParts = ['deleted_at IS NULL', 'DATE(created_at) BETWEEN ? AND ?'];
    const params = [f.dateFrom, f.dateTo];
    if (f.ttFilter) { whereParts.push('transport_type = ?'); params.push(f.ttFilter); }

    if (f.customerId > 0) {
      // PHP'de partners.name kullanıyordu — burada doğru kolon: company_name
      const [pRows] = await pool.execute(
        'SELECT company_name FROM partners WHERE id = ?',
        [f.customerId]
      );
      if (pRows[0]) {
        whereParts.push('client_billing = ?');
        params.push(pRows[0].company_name);
      }
    }
    if (f.currency) { whereParts.push('currency_code = ?'); params.push(f.currency); }
    const whereSql = whereParts.join(' AND ');

    // === Genel Bakış ===
    const overviewSql = `SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) AS closed_count,
      SUM(CASE WHEN status IN ('draft','in_progress','to_invoice') THEN 1 ELSE 0 END) AS open_count,
      SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) AS draft_count,
      SUM(CASE WHEN status='to_invoice' THEN 1 ELSE 0 END) AS toinvoice_count,
      SUM(sale_price) AS total_sales,
      SUM(purchase_price) AS total_cost,
      SUM(sale_price - purchase_price) AS total_profit,
      AVG(CASE WHEN sale_price > 0 THEN ((sale_price - purchase_price) / sale_price) * 100 ELSE NULL END) AS avg_margin,
      SUM(gross_weight) AS total_weight,
      SUM(quantity) AS total_quantity
      FROM shipments WHERE ${whereSql}`;
    const [[overview]] = await pool.execute(overviewSql, params);

    // Önceki dönem karşılaştırma
    const periodDays = Math.max(1, Math.round((new Date(f.dateTo) - new Date(f.dateFrom)) / 86400000) + 1);
    const prevFrom = daysAgoStr(periodDays).split('T')[0];
    // prev: dateFrom - periodDays .. dateFrom - 1
    const pf = new Date(f.dateFrom);
    pf.setDate(pf.getDate() - periodDays);
    const pt = new Date(f.dateFrom);
    pt.setDate(pt.getDate() - 1);
    const prevParams = [pf.toISOString().slice(0, 10), pt.toISOString().slice(0, 10), ...params.slice(2)];
    const [[prev]] = await pool.execute(overviewSql, prevParams);

    // Belge eksikliği
    const [docRows] = await pool.execute(
      `SELECT documents_data FROM shipments WHERE ${whereSql} AND documents_data IS NOT NULL AND documents_data != ''`,
      params
    );
    let missingDocShipments = 0;
    const docMissingTypes = {};
    for (const r of docRows) {
      let docs = {};
      try { docs = JSON.parse(r.documents_data) || {}; } catch (e) { docs = {}; }
      let hasMissing = false;
      for (const k of Object.keys(docs)) {
        if (docs[k] && docs[k].status === 'missing') {
          hasMissing = true;
          docMissingTypes[k] = (docMissingTypes[k] || 0) + 1;
        }
      }
      if (hasMissing) missingDocShipments++;
    }
    const docMissingTop = Object.fromEntries(
      Object.entries(docMissingTypes).sort((a, b) => b[1] - a[1]).slice(0, 10)
    );

    // Aylık trend (son 12 ay)
    let monthlySql = `SELECT
      DATE_FORMAT(created_at, '%Y-%m') AS month,
      SUM(sale_price) AS revenue, SUM(purchase_price) AS cost,
      SUM(sale_price - purchase_price) AS profit, COUNT(*) AS count
      FROM shipments WHERE deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`;
    const monthlyParams = [];
    if (f.ttFilter) { monthlySql += ' AND transport_type = ?'; monthlyParams.push(f.ttFilter); }
    if (f.currency) { monthlySql += ' AND currency_code = ?'; monthlyParams.push(f.currency); }
    monthlySql += ' GROUP BY month ORDER BY month ASC';
    const [monthlyTrend] = await pool.execute(monthlySql, monthlyParams);

    // Para birimi dağılımı (tarih aralığı)
    const [currencyBreakdown] = await pool.execute(
      `SELECT currency_code, SUM(sale_price) AS revenue, COUNT(*) AS count
       FROM shipments WHERE deleted_at IS NULL AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY currency_code ORDER BY revenue DESC`,
      [f.dateFrom, f.dateTo]
    );

    // Ödenmemiş faturalar
    const [unpaidInvoices] = await pool.execute(
      `SELECT id, shipment_no, client_billing, sale_price, currency_code, invoice_date, invoice_no, status
       FROM shipments WHERE ${whereSql}
       AND invoice_generated = 1 AND (payment_received = 0 OR payment_received IS NULL)
       ORDER BY invoice_date ASC LIMIT 50`,
      params
    );
    let unpaidTotal = 0, overdueCount = 0;
    const now = Date.now();
    for (const inv of unpaidInvoices) {
      unpaidTotal += parseFloat(inv.sale_price || 0);
      if (inv.invoice_date) {
        const days = Math.floor((now - new Date(inv.invoice_date).getTime()) / 86400000);
        inv.days_old = days;
        inv.overdue = days > 30;
        if (inv.overdue) overdueCount++;
      } else {
        inv.days_old = 0; inv.overdue = false;
      }
    }

    // Top kar / düşük marj
    const [topProfit] = await pool.execute(
      `SELECT shipment_no, client_billing, sale_price, purchase_price, currency_code, transport_type,
       (sale_price - purchase_price) AS profit,
       CASE WHEN sale_price > 0 THEN ((sale_price - purchase_price) / sale_price) * 100 ELSE 0 END AS margin
       FROM shipments WHERE ${whereSql} AND sale_price > 0
       ORDER BY profit DESC LIMIT 5`,
      params
    );
    const [lowMargin] = await pool.execute(
      `SELECT shipment_no, client_billing, sale_price, purchase_price, currency_code, transport_type,
       (sale_price - purchase_price) AS profit,
       CASE WHEN sale_price > 0 THEN ((sale_price - purchase_price) / sale_price) * 100 ELSE 0 END AS margin
       FROM shipments WHERE ${whereSql} AND sale_price > 0
       ORDER BY margin ASC LIMIT 5`,
      params
    );

    // Mod dağılımı
    let modeSql = `SELECT transport_type, COUNT(*) AS count, SUM(sale_price) AS revenue,
      SUM(sale_price - purchase_price) AS profit,
      AVG(CASE WHEN sale_price > 0 THEN ((sale_price - purchase_price) / sale_price) * 100 ELSE NULL END) AS avg_margin
      FROM shipments WHERE deleted_at IS NULL AND DATE(created_at) BETWEEN ? AND ?`;
    const modeParams = [f.dateFrom, f.dateTo];
    if (f.currency) { modeSql += ' AND currency_code = ?'; modeParams.push(f.currency); }
    modeSql += ' GROUP BY transport_type ORDER BY revenue DESC';
    const [modeBreakdown] = await pool.execute(modeSql, modeParams);

    // Araç yükü
    const [vehicleLoad] = await pool.execute(
      `SELECT v.transport_type,
       COUNT(DISTINCT v.id) AS vehicle_count,
       COUNT(DISTINCT va.id) AS assignment_count,
       SUM(va.assigned_weight) AS total_load,
       SUM(v.capacity_kg) AS total_capacity
       FROM vehicles v
       LEFT JOIN vehicle_assignments va ON va.vehicle_id = v.id AND va.deleted_at IS NULL
       WHERE v.status = 'active' AND v.deleted_at IS NULL
       GROUP BY v.transport_type`
    );

    // Top müşteriler (ciro / kar)
    const [topCustomersRev] = await pool.execute(
      `SELECT client_billing, COUNT(*) AS shipment_count,
       SUM(sale_price) AS revenue, SUM(sale_price - purchase_price) AS profit,
       AVG(CASE WHEN sale_price > 0 THEN ((sale_price - purchase_price) / sale_price) * 100 ELSE NULL END) AS avg_margin
       FROM shipments WHERE ${whereSql} AND client_billing != ''
       GROUP BY client_billing ORDER BY revenue DESC LIMIT 10`,
      params
    );
    const [topCustomersProfit] = await pool.execute(
      `SELECT client_billing, COUNT(*) AS shipment_count,
       SUM(sale_price) AS revenue, SUM(sale_price - purchase_price) AS profit
       FROM shipments WHERE ${whereSql} AND client_billing != ''
       GROUP BY client_billing ORDER BY profit DESC LIMIT 10`,
      params
    );

    // Yeni müşteri sayısı
    const [[newCustRow]] = await pool.execute(
      `SELECT COUNT(DISTINCT client_billing) AS new_count
       FROM shipments s1
       WHERE s1.deleted_at IS NULL
         AND DATE(s1.created_at) BETWEEN ? AND ? AND s1.client_billing != ''
       AND NOT EXISTS (
         SELECT 1 FROM shipments s2
         WHERE s2.deleted_at IS NULL AND s2.client_billing = s1.client_billing AND DATE(s2.created_at) < ?
       )`,
      [f.dateFrom, f.dateTo, f.dateFrom]
    );
    const newCustomers = parseInt(newCustRow.new_count || 0, 10);

    // İnaktif müşteriler (90 gün)
    const inactiveCutoff = daysAgoStr(90);
    const [inactiveCustomers] = await pool.execute(
      `SELECT client_billing, MAX(created_at) AS last_activity,
       COUNT(*) AS total_shipments, SUM(sale_price) AS lifetime_revenue
       FROM shipments WHERE deleted_at IS NULL AND client_billing != ''
       GROUP BY client_billing
       HAVING MAX(created_at) < ?
       ORDER BY last_activity DESC LIMIT 20`,
      [inactiveCutoff]
    );

    // Coğrafi
    const [geoDeparture] = await pool.execute(
      `SELECT departure_country AS country, COUNT(*) AS count, SUM(sale_price) AS revenue
       FROM shipments WHERE ${whereSql} AND departure_country != ''
       GROUP BY departure_country ORDER BY count DESC LIMIT 10`,
      params
    );
    const [geoArrival] = await pool.execute(
      `SELECT arrival_country AS country, COUNT(*) AS count, SUM(sale_price) AS revenue
       FROM shipments WHERE ${whereSql} AND arrival_country != ''
       GROUP BY arrival_country ORDER BY count DESC LIMIT 10`,
      params
    );

    // Top güzergahlar — MySQL 8 strict GROUP BY için kolonları açıkça grupla
    const [topRoutes] = await pool.execute(
      `SELECT
       CONCAT(IFNULL(departure_country, '?'), ' → ', IFNULL(arrival_country, '?')) AS route,
       departure_country, arrival_country, COUNT(*) AS count, SUM(sale_price) AS revenue,
       AVG(CASE WHEN sale_price > 0 THEN ((sale_price - purchase_price) / sale_price) * 100 ELSE NULL END) AS avg_margin
       FROM shipments WHERE ${whereSql} AND (departure_country != '' OR arrival_country != '')
       GROUP BY departure_country, arrival_country ORDER BY count DESC LIMIT 10`,
      params
    );

    // Araç performansı
    const [vehiclePerformance] = await pool.execute(
      `SELECT v.id, v.vehicle_code, v.plate, v.transport_type, v.driver_name,
       COUNT(va.id) AS assignment_count,
       SUM(va.assigned_quantity) AS total_quantity,
       SUM(va.assigned_weight) AS total_weight
       FROM vehicles v
       LEFT JOIN vehicle_assignments va ON va.vehicle_id = v.id
         AND va.deleted_at IS NULL
         AND DATE(va.created_at) BETWEEN ? AND ?
       WHERE v.deleted_at IS NULL AND v.status = 'active'
       GROUP BY v.id, v.vehicle_code, v.plate, v.transport_type, v.driver_name
       HAVING assignment_count > 0
       ORDER BY assignment_count DESC LIMIT 10`,
      [f.dateFrom, f.dateTo]
    );

    // Depo yükü (PHP'de w.warehouse_type kolon yanlıştı → type_code doğru)
    const [warehouseLoad] = await pool.execute(
      `SELECT w.id, w.warehouse_code, w.name, w.type_code AS warehouse_type,
       COUNT(s.id) AS active_shipments
       FROM warehouses w
       LEFT JOIN shipments s ON
         s.transport_type = 'storage' AND s.status != 'closed' AND s.deleted_at IS NULL
         AND s.storage_data IS NOT NULL
         AND s.storage_data LIKE CONCAT('%"warehouse_id":"', w.id, '"%')
       WHERE w.deleted_at IS NULL
       GROUP BY w.id, w.warehouse_code, w.name, w.type_code
       ORDER BY active_shipments DESC`
    );

    // Durum dağılımı
    const [statusDistribution] = await pool.execute(
      `SELECT status, COUNT(*) AS count FROM shipments WHERE ${whereSql} GROUP BY status`,
      params
    );

    // Ortalama süre
    const [[avgDurRow]] = await pool.execute(
      `SELECT AVG(TIMESTAMPDIFF(DAY, created_at, NOW())) AS avg_days
       FROM shipments WHERE ${whereSql} AND status = 'closed'`,
      params
    );

    sendSuccess(res, {
      filters: { date_from: f.dateFrom, date_to: f.dateTo, transport_type: f.ttFilter, currency: f.currency, period_days: periodDays },
      overview: {
        total_count: parseInt(overview.total_count || 0, 10),
        open_count: parseInt(overview.open_count || 0, 10),
        closed_count: parseInt(overview.closed_count || 0, 10),
        draft_count: parseInt(overview.draft_count || 0, 10),
        toinvoice_count: parseInt(overview.toinvoice_count || 0, 10),
        total_sales: parseFloat(overview.total_sales || 0),
        total_cost: parseFloat(overview.total_cost || 0),
        total_profit: parseFloat(overview.total_profit || 0),
        avg_margin: parseFloat(overview.avg_margin || 0),
        total_weight: parseFloat(overview.total_weight || 0),
        total_quantity: parseInt(overview.total_quantity || 0, 10),
        missing_doc_shipments: missingDocShipments,
        unpaid_total: unpaidTotal,
        unpaid_count: unpaidInvoices.length,
        overdue_count: overdueCount,
        new_customers: newCustomers
      },
      comparison: {
        prev_total_count: parseInt(prev.total_count || 0, 10),
        prev_total_sales: parseFloat(prev.total_sales || 0),
        prev_total_profit: parseFloat(prev.total_profit || 0),
        prev_avg_margin: parseFloat(prev.avg_margin || 0)
      },
      financial: {
        monthly_trend: monthlyTrend,
        currency_breakdown: currencyBreakdown,
        unpaid_invoices: unpaidInvoices,
        top_profit: topProfit,
        low_margin: lowMargin
      },
      modes: { breakdown: modeBreakdown, vehicle_load: vehicleLoad },
      customers: {
        top_revenue: topCustomersRev,
        top_profit: topCustomersProfit,
        inactive: inactiveCustomers,
        geo_departure: geoDeparture,
        geo_arrival: geoArrival
      },
      operations: {
        top_routes: topRoutes,
        vehicle_performance: vehiclePerformance,
        warehouse_load: warehouseLoad,
        doc_missing_top: docMissingTop,
        status_distribution: statusDistribution,
        avg_duration_days: parseFloat(avgDurRow.avg_days || 0)
      }
    });
  } catch (err) {
    console.error('[statistics]', err);
    sendError(res, 'İstatistik hesaplama hatası: ' + err.message, 500);
  }
});

// ============ POST /api/statistics/export-excel ============
router.post('/export-excel', verifyToken, async (req, res) => {
  try {
    const f = parseFilters(req.body || {});
    const whereParts = ['deleted_at IS NULL', 'DATE(created_at) BETWEEN ? AND ?'];
    const params = [f.dateFrom, f.dateTo];
    if (f.ttFilter) { whereParts.push('transport_type = ?'); params.push(f.ttFilter); }
    if (f.currency) { whereParts.push('currency_code = ?'); params.push(f.currency); }
    const where = whereParts.join(' AND ');

    const [shipments] = await pool.execute(
      `SELECT shipment_no, transport_type, status, client_billing, sender, receiver,
       departure_country, arrival_country, gross_weight, quantity,
       sale_price, purchase_price, currency_code, invoice_no, invoice_date,
       payment_received, created_at
       FROM shipments WHERE ${where} ORDER BY created_at DESC`,
      params
    );
    const [customers] = await pool.execute(
      `SELECT client_billing AS musteri, COUNT(*) AS adet,
       SUM(sale_price) AS ciro, SUM(purchase_price) AS maliyet,
       SUM(sale_price - purchase_price) AS kar
       FROM shipments WHERE ${where} AND client_billing != ''
       GROUP BY client_billing ORDER BY ciro DESC`,
      params
    );
    const [modes] = await pool.execute(
      `SELECT transport_type, COUNT(*) AS adet,
       SUM(sale_price) AS ciro, SUM(purchase_price) AS maliyet,
       SUM(sale_price - purchase_price) AS kar
       FROM shipments WHERE ${where} GROUP BY transport_type`,
      params
    );

    const modeLabels = { road: 'Karayolu', maritime: 'Denizyolu', air: 'Havayolu', storage: 'Depolama', import: 'İthalat', export: 'İhracat' };
    const statusLabels = { draft: 'Taslak', in_progress: 'Devam Ediyor', to_invoice: 'Faturalanacak', closed: 'Kapalı' };

    let totalSales = 0, totalCost = 0;
    for (const s of shipments) {
      totalSales += parseFloat(s.sale_price || 0);
      totalCost += parseFloat(s.purchase_price || 0);
    }
    const totalProfit = totalSales - totalCost;
    const avgMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    const filename = `CargoTrack_Istatistikler_${f.dateFrom}_${f.dateTo}.xls`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=UTF-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'max-age=0');

    let html = '<?xml version="1.0" encoding="UTF-8"?>\n';
    html += '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><meta charset="UTF-8"><style>';
    html += 'table { border-collapse: collapse; } ';
    html += 'th { background:#6366f1; color:#fff; font-weight:bold; padding:8px; border:1px solid #4338ca; text-align:left; } ';
    html += 'td { padding:6px 8px; border:1px solid #e2e8f0; } ';
    html += '.num { text-align:right; mso-number-format:"#,##0.00"; } ';
    html += '.int { text-align:right; mso-number-format:"#,##0"; } ';
    html += '.header-row { background:#eef2ff; font-weight:bold; font-size:14pt; } ';
    html += '.filter-row { background:#f8fafc; font-style:italic; }';
    html += '</style>';
    html += '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>';
    html += '<x:ExcelWorksheet><x:Name>Ozet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
    html += '<x:ExcelWorksheet><x:Name>Sevkiyat_Detay</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
    html += '<x:ExcelWorksheet><x:Name>Musteriler</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
    html += '<x:ExcelWorksheet><x:Name>Mod_Analizi</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
    html += '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
    html += '</head><body>';

    // Sheet 1: Özet
    html += '<table>';
    html += '<tr class="header-row"><td colspan="2">CARGOTRACK İSTATİSTİK RAPORU</td></tr>';
    html += `<tr class="filter-row"><td>Tarih Aralığı:</td><td>${f.dateFrom} — ${f.dateTo}</td></tr>`;
    html += `<tr class="filter-row"><td>Mod:</td><td>${f.ttFilter ? (modeLabels[f.ttFilter] || f.ttFilter) : 'Tümü'}</td></tr>`;
    html += `<tr class="filter-row"><td>Para Birimi:</td><td>${escapeHtml(f.currency)}</td></tr>`;
    html += '<tr><td colspan="2">&nbsp;</td></tr>';
    html += '<tr class="header-row"><td colspan="2">GENEL BAKIŞ</td></tr>';
    html += '<tr><th>Metrik</th><th>Değer</th></tr>';
    html += `<tr><td>Toplam Sevkiyat</td><td class="int">${shipments.length}</td></tr>`;
    html += `<tr><td>Toplam Ciro (${f.currency})</td><td class="num">${totalSales.toFixed(2)}</td></tr>`;
    html += `<tr><td>Toplam Maliyet (${f.currency})</td><td class="num">${totalCost.toFixed(2)}</td></tr>`;
    html += `<tr><td>Brüt Kâr (${f.currency})</td><td class="num">${totalProfit.toFixed(2)}</td></tr>`;
    html += `<tr><td>Ortalama Marj</td><td class="num">${avgMargin.toFixed(2)}%</td></tr>`;
    html += '</table><br pagebreak="true"/>';

    // Sheet 2: Sevkiyat Detay
    html += '<table>';
    html += '<tr class="header-row"><td colspan="15">SEVKİYAT DETAY LİSTESİ</td></tr>';
    html += '<tr><th>Dosya No</th><th>Mod</th><th>Durum</th><th>Müşteri</th><th>Gönderici</th><th>Alıcı</th>';
    html += '<th>Çıkış</th><th>Varış</th><th>Ağırlık (kg)</th><th>Kap</th>';
    html += '<th>Satış</th><th>Maliyet</th><th>Kâr</th><th>PB</th><th>Tarih</th></tr>';
    for (const s of shipments) {
      const profit = parseFloat(s.sale_price || 0) - parseFloat(s.purchase_price || 0);
      html += '<tr>';
      html += `<td>${escapeHtml(s.shipment_no)}</td>`;
      html += `<td>${modeLabels[s.transport_type] || s.transport_type}</td>`;
      html += `<td>${statusLabels[s.status] || s.status}</td>`;
      html += `<td>${escapeHtml(s.client_billing)}</td>`;
      html += `<td>${escapeHtml(s.sender)}</td>`;
      html += `<td>${escapeHtml(s.receiver)}</td>`;
      html += `<td>${escapeHtml(s.departure_country)}</td>`;
      html += `<td>${escapeHtml(s.arrival_country)}</td>`;
      html += `<td class="num">${parseFloat(s.gross_weight || 0)}</td>`;
      html += `<td class="int">${parseInt(s.quantity || 0, 10)}</td>`;
      html += `<td class="num">${parseFloat(s.sale_price || 0)}</td>`;
      html += `<td class="num">${parseFloat(s.purchase_price || 0)}</td>`;
      html += `<td class="num">${profit.toFixed(2)}</td>`;
      html += `<td>${escapeHtml(s.currency_code)}</td>`;
      html += `<td>${String(s.created_at || '').slice(0, 10)}</td>`;
      html += '</tr>';
    }
    html += '</table><br pagebreak="true"/>';

    // Sheet 3: Müşteriler
    html += '<table>';
    html += '<tr class="header-row"><td colspan="5">MÜŞTERİ ANALİZİ</td></tr>';
    html += `<tr><th>Müşteri</th><th>Adet</th><th>Ciro (${f.currency})</th><th>Maliyet</th><th>Kâr</th></tr>`;
    for (const c of customers) {
      html += `<tr><td>${escapeHtml(c.musteri)}</td>`;
      html += `<td class="int">${parseInt(c.adet || 0, 10)}</td>`;
      html += `<td class="num">${parseFloat(c.ciro || 0)}</td>`;
      html += `<td class="num">${parseFloat(c.maliyet || 0)}</td>`;
      html += `<td class="num">${parseFloat(c.kar || 0)}</td></tr>`;
    }
    html += '</table><br pagebreak="true"/>';

    // Sheet 4: Mod Analizi
    html += '<table>';
    html += '<tr class="header-row"><td colspan="5">ULAŞIM MODU ANALİZİ</td></tr>';
    html += `<tr><th>Mod</th><th>Adet</th><th>Ciro (${f.currency})</th><th>Maliyet</th><th>Kâr</th></tr>`;
    for (const m of modes) {
      html += `<tr><td>${modeLabels[m.transport_type] || m.transport_type}</td>`;
      html += `<td class="int">${parseInt(m.adet || 0, 10)}</td>`;
      html += `<td class="num">${parseFloat(m.ciro || 0)}</td>`;
      html += `<td class="num">${parseFloat(m.maliyet || 0)}</td>`;
      html += `<td class="num">${parseFloat(m.kar || 0)}</td></tr>`;
    }
    html += '</table>';
    html += '</body></html>';

    res.send(html);
  } catch (err) {
    console.error('[statistics/export]', err);
    sendError(res, 'Excel export hatası: ' + err.message, 500);
  }
});

module.exports = router;
