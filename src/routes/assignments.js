const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, hasRole } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const { notify } = require('../helpers/notifications');
const {
  sanitizeText, toInt, toFloat, toNullableDate, sendSuccess, sendError
} = require('../helpers/utils');

const router = express.Router();

function normalizeTransport(t) {
  if (t === 'sea') return 'maritime';
  return t || 'road';
}

const MODE_LABELS = {
  road: 'Karayolu', maritime: 'Denizyolu', sea: 'Denizyolu',
  air: 'Havayolu', storage: 'Depolama', import: 'İthalat', export: 'İhracat'
};

// ============ GET /api/assignments?vehicle_id=X&shipment_id=Y ============
router.get('/', verifyToken, async (req, res) => {
  try {
    const vehicleId = toInt(req.query.vehicle_id);
    const shipmentId = toInt(req.query.shipment_id);

    let where = '1=1';
    const params = [];
    if (vehicleId > 0) { where += ' AND a.vehicle_id = ?'; params.push(vehicleId); }
    if (shipmentId > 0) { where += ' AND a.shipment_id = ?'; params.push(shipmentId); }
    // user rolü sadece kendi sevkiyatlarına ait atamaları görsün
    if (!hasRole(req.user, 'admin')) {
      where += ' AND s.created_by = ?';
      params.push(req.user.id);
    }

    const sql = `
      SELECT a.*,
             v.vehicle_code, v.plate, v.trailer_plate, v.equipment_type,
             v.capacity_kg, v.volume_m3, v.driver_name,
             s.shipment_no, s.quantity AS shipment_quantity,
             s.gross_weight AS shipment_weight,
             s.departure_country, s.arrival_country,
             s.transport_type, s.client_billing
      FROM vehicle_assignments a
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN shipments s ON a.shipment_id = s.id
      WHERE ${where}
      ORDER BY a.created_at DESC
    `;

    const [rows] = await pool.execute(sql, params);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[assignments/list]', err);
    sendError(res, 'Atamalar alınamadı', 500);
  }
});

// ============ GET /api/assignments/load-pool ============
// Sevkiyat-bazlı yük havuzu: her sevkiyat için toplam kap/ağırlık, atanmış miktarlar, kalan.
// Query: ?status=unassigned|partial|all (default: partial — kalan > 0)
//        ?transport_type=road|maritime|air|...
//        ?q=arama (shipment_no veya client_billing)
router.get('/load-pool', verifyToken, async (req, res) => {
  try {
    const status = sanitizeText(req.query.status || 'partial');
    const transportType = sanitizeText(req.query.transport_type || '');
    const q = sanitizeText(req.query.q || '');

    let where = `s.transport_type != 'storage' AND s.status != 'closed'`;
    const params = [];

    if (transportType) {
      where += ' AND s.transport_type = ?';
      params.push(transportType);
    }
    if (q) {
      where += ' AND (s.shipment_no LIKE ? OR s.client_billing LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (!hasRole(req.user, 'admin')) {
      where += ' AND s.created_by = ?';
      params.push(req.user.id);
    }

    const sql = `
      SELECT s.id, s.shipment_no, s.transport_type, s.status,
             s.client_billing, s.departure_country, s.arrival_country,
             s.quantity AS total_quantity, s.gross_weight AS total_weight,
             COALESCE(SUM(a.assigned_quantity), 0) AS assigned_quantity,
             COALESCE(SUM(a.assigned_weight), 0) AS assigned_weight,
             COUNT(a.id) AS assignment_count
      FROM shipments s
      LEFT JOIN vehicle_assignments a ON a.shipment_id = s.id
      WHERE ${where}
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `;
    const [rows] = await pool.execute(sql, params);

    // Kalan hesapla + status filtre
    const out = [];
    for (const r of rows) {
      const totalQty = parseInt(r.total_quantity || 0, 10);
      const totalWgt = parseFloat(r.total_weight || 0);
      const assignedQty = parseInt(r.assigned_quantity || 0, 10);
      const assignedWgt = parseFloat(r.assigned_weight || 0);
      const remainingQty = Math.max(0, totalQty - assignedQty);
      const remainingWgt = Math.max(0, totalWgt - assignedWgt);
      const isUnassigned = assignedQty === 0;
      const isFullyAssigned = totalQty > 0 && remainingQty === 0;

      if (status === 'unassigned' && !isUnassigned) continue;
      if (status === 'partial' && (isFullyAssigned || (totalQty === 0 && assignedQty === 0))) continue;
      // status === 'all' → hepsi

      out.push({
        ...r,
        total_quantity: totalQty,
        total_weight: totalWgt,
        assigned_quantity: assignedQty,
        assigned_weight: assignedWgt,
        assignment_count: parseInt(r.assignment_count || 0, 10),
        remaining_quantity: remainingQty,
        remaining_weight: remainingWgt,
        is_unassigned: isUnassigned,
        is_fully_assigned: isFullyAssigned,
      });
    }

    sendSuccess(res, out);
  } catch (err) {
    console.error('[assignments/load-pool]', err);
    sendError(res, 'Yük havuzu alınamadı', 500);
  }
});

// ============ POST /api/assignments ============
router.post('/', verifyToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const body = req.body || {};
    const id = toInt(body.assignment_id);
    const vehicleId = toInt(body.vehicle_id);
    const shipmentId = toInt(body.shipment_id);
    const qty = toInt(body.assigned_quantity);
    const weight = toFloat(body.assigned_weight);

    if (vehicleId <= 0) { await conn.rollback(); return sendError(res, 'Araç seçilmedi'); }
    if (shipmentId <= 0) { await conn.rollback(); return sendError(res, 'Sevkiyat seçilmedi'); }
    if (qty <= 0) { await conn.rollback(); return sendError(res, 'Atama miktarı 0\'dan büyük olmalı'); }

    // Pessimistic lock: shipment satırını kilitle (concurrent overbooking'i engelle)
    const [shipmentRows] = await conn.execute(
      'SELECT id, quantity, gross_weight, transport_type FROM shipments WHERE id = ? FOR UPDATE',
      [shipmentId]
    );
    if (shipmentRows.length === 0) {
      await conn.rollback();
      return sendError(res, 'Sevkiyat bulunamadı', 404);
    }
    const shipment = shipmentRows[0];

    // Vehicle satırını da kilitle (silinmesini engellemek için)
    const [vehicleRows] = await conn.execute(
      'SELECT id, transport_type, capacity_kg FROM vehicles WHERE id = ? FOR UPDATE',
      [vehicleId]
    );
    if (vehicleRows.length === 0) {
      await conn.rollback();
      return sendError(res, 'Araç bulunamadı', 404);
    }
    const vehicle = vehicleRows[0];

    // Mod uyumu (sea ↔ maritime normalize)
    const shipTT = normalizeTransport(shipment.transport_type);
    const vehTT = normalizeTransport(vehicle.transport_type);
    if (shipTT === 'storage') {
      await conn.rollback();
      return sendError(res, 'Depolama işlemleri araç ataması alamaz');
    }
    if (shipTT !== vehTT) {
      await conn.rollback();
      return sendError(
        res,
        `Mod uyumsuzluğu: ${MODE_LABELS[shipTT]} sevkiyatı sadece ${MODE_LABELS[shipTT]} aracına atanabilir (seçilen araç: ${MODE_LABELS[vehTT]}).`
      );
    }

    // Mevcut atamaları topla (bu güncellenen hariç) — lock altında
    let sumSql = 'SELECT COALESCE(SUM(assigned_quantity),0) AS qty, COALESCE(SUM(assigned_weight),0) AS wgt FROM vehicle_assignments WHERE shipment_id = ?';
    const sumParams = [shipmentId];
    if (id > 0) { sumSql += ' AND id != ?'; sumParams.push(id); }
    const [sumRows] = await conn.execute(sumSql, sumParams);
    const alreadyQty = parseInt(sumRows[0].qty || 0, 10);
    const alreadyWgt = parseFloat(sumRows[0].wgt || 0);

    // Miktar kontrolü
    const totalQty = parseInt(shipment.quantity || 0, 10);
    if (totalQty > 0 && (alreadyQty + qty) > totalQty) {
      const kalan = totalQty - alreadyQty;
      await conn.rollback();
      return sendError(
        res,
        `Sevkiyatın toplam ${totalQty} kabı var, zaten ${alreadyQty} atanmış. En fazla ${kalan} kap atayabilirsiniz.`
      );
    }

    // Ağırlık kontrolü (sevkiyat brüt ağırlığını aşma)
    const totalWgt = parseFloat(shipment.gross_weight || 0);
    if (totalWgt > 0 && weight > 0 && (alreadyWgt + weight) > (totalWgt + 0.01)) {
      const kalan = (totalWgt - alreadyWgt).toFixed(2);
      await conn.rollback();
      return sendError(
        res,
        `Sevkiyatın toplam ağırlığı ${totalWgt} kg, zaten ${alreadyWgt.toFixed(2)} kg atanmış. En fazla ${kalan} kg atayabilirsiniz.`
      );
    }

    // Araç kapasitesi kontrolü (bu aracın mevcut atamaları + yeni)
    const [vehSumRows] = await conn.execute(
      'SELECT COALESCE(SUM(assigned_weight),0) AS wgt FROM vehicle_assignments WHERE vehicle_id = ?' + (id > 0 ? ' AND id != ?' : ''),
      id > 0 ? [vehicleId, id] : [vehicleId]
    );
    const vehAlreadyWgt = parseFloat(vehSumRows[0].wgt || 0);
    const vehCapacity = parseFloat(vehicle.capacity_kg || 0);
    if (vehCapacity > 0 && weight > 0 && (vehAlreadyWgt + weight) > (vehCapacity + 0.01)) {
      const kalan = (vehCapacity - vehAlreadyWgt).toFixed(2);
      await conn.rollback();
      return sendError(
        res,
        `Araç kapasitesi ${vehCapacity} kg, zaten ${vehAlreadyWgt.toFixed(2)} kg yüklü. En fazla ${kalan} kg yükleyebilirsiniz.`
      );
    }

    const data = {
      vehicle_id: vehicleId,
      shipment_id: shipmentId,
      assigned_quantity: qty,
      assigned_weight: weight,
      loading_date: toNullableDate(body.loading_date),
      notes: sanitizeText(body.notes)
    };

    if (id) {
      const cols = Object.keys(data);
      const setClause = cols.map(c => `\`${c}\` = ?`).join(', ');
      await conn.execute(
        `UPDATE vehicle_assignments SET ${setClause} WHERE id = ?`,
        [...cols.map(c => data[c]), id]
      );
      await conn.commit();
      await logAudit(req, 'update', 'assignments', id, `V#${vehicleId}→S#${shipmentId}`);
      return sendSuccess(res, { id, message: 'Atama güncellendi' });
    }

    data.created_by = req.user.id;
    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(', ');
    const colList = cols.map(c => `\`${c}\``).join(', ');
    const [result] = await conn.execute(
      `INSERT INTO vehicle_assignments (${colList}) VALUES (${placeholders})`,
      cols.map(c => data[c])
    );
    await conn.commit();
    await logAudit(req, 'create', 'assignments', result.insertId, `V#${vehicleId}→S#${shipmentId}`);

    // Bildirim: sevkiyat sahibine (kendi yapan hariç)
    const [shipOwnerRows] = await pool.execute(
      'SELECT created_by, shipment_no FROM shipments WHERE id = ? LIMIT 1', [shipmentId]
    );
    if (shipOwnerRows.length > 0 && shipOwnerRows[0].created_by && shipOwnerRows[0].created_by !== req.user.id) {
      const [vRows] = await pool.execute('SELECT plate FROM vehicles WHERE id = ? LIMIT 1', [vehicleId]);
      const plate = vRows[0]?.plate || `Araç #${vehicleId}`;
      await notify({
        userId: shipOwnerRows[0].created_by,
        type: 'assignment_new',
        title: `Yeni araç ataması: ${shipOwnerRows[0].shipment_no}`,
        body: `${plate} aracına ${qty} kap / ${weight} kg atandı. (${req.user.username})`,
        link: `/assignments`,
        entityType: 'assignments',
        entityId: result.insertId,
      });
    }

    sendSuccess(res, { id: result.insertId, message: 'Atama eklendi' });
  } catch (err) {
    await conn.rollback();
    console.error('[assignments/save]', err);
    sendError(res, 'Atama sırasında hata: ' + err.message, 500);
  } finally {
    conn.release();
  }
});

// ============ DELETE /api/assignments/:id ============
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');
    const [result] = await pool.execute('DELETE FROM vehicle_assignments WHERE id = ?', [id]);
    if (result.affectedRows === 0) return sendError(res, 'Kayıt bulunamadı', 404);
    await logAudit(req, 'delete', 'assignments', id);
    sendSuccess(res, { message: 'Atama silindi' });
  } catch (err) {
    console.error('[assignments/delete]', err);
    sendError(res, 'Silme sırasında hata: ' + err.message, 500);
  }
});

module.exports = router;
