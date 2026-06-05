const express = require('express');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const {
  sanitizeText, toInt, toFloat, toNullableDate, toBool01,
  jsonStringifyOrNull, whitelist, sendSuccess, sendError
} = require('../helpers/utils');

const router = express.Router();

const VALID_TRANSPORT = ['road', 'sea', 'air'];
const VALID_STATUS = ['active', 'inactive', 'maintenance'];

const EQUIPMENT_BY_MODE = {
  road: ['tilt', 'frigorifik', 'open', 'container', 'tanker', 'other'],
  sea: ['container_20', 'container_40', 'container_40hc', 'container_reefer', 'bulk', 'breakbulk', 'tanker', 'roro', 'other'],
  air: ['passenger', 'freighter', 'combi', 'express', 'other']
};

const PREFIX_MAP = { road: 'V', sea: 'VS', air: 'VA' };

// ============ GET /api/vehicles?transport_type=road ============
router.get('/', verifyToken, async (req, res) => {
  try {
    const transportType = sanitizeText(req.query.transport_type || '');
    let rows;
    if (transportType && VALID_TRANSPORT.includes(transportType)) {
      [rows] = await pool.execute(
        'SELECT * FROM vehicles WHERE transport_type = ? AND deleted_at IS NULL ORDER BY vehicle_code ASC',
        [transportType]
      );
    } else {
      [rows] = await pool.execute('SELECT * FROM vehicles WHERE deleted_at IS NULL ORDER BY vehicle_code ASC');
    }
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[vehicles/list]', err);
    sendError(res, 'Araçlar alınamadı', 500);
  }
});

// ============ POST /api/vehicles ============
router.post('/', verifyToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const body = req.body || {};
    const id = toInt(body.vehicle_id);
    const plate = sanitizeText(body.plate);
    if (!plate) {
      await conn.rollback();
      return sendError(res, 'Plaka / Tanıtıcı zorunludur');
    }

    const transportType = whitelist(sanitizeText(body.transport_type), VALID_TRANSPORT, 'road');
    const allowedEquipment = EQUIPMENT_BY_MODE[transportType];
    const equipmentType = whitelist(sanitizeText(body.equipment_type), allowedEquipment, allowedEquipment[0]);

    const data = {
      transport_type: transportType,
      plate: plate.toUpperCase(),
      trailer_plate: sanitizeText(body.trailer_plate).toUpperCase(),
      volume_m3: toFloat(body.volume_m3),
      capacity_kg: toFloat(body.capacity_kg),
      equipment_type: equipmentType,
      adr_certified: toBool01(body.adr_certified),
      brand_model: sanitizeText(body.brand_model),
      driver_name: sanitizeText(body.driver_name),
      driver_phone: sanitizeText(body.driver_phone),
      registration_date: toNullableDate(body.registration_date),
      notes: sanitizeText(body.notes),
      status: whitelist(sanitizeText(body.status), VALID_STATUS, 'active'),
      mode_data: jsonStringifyOrNull(body.mode_data)
    };

    if (id) {
      const cols = Object.keys(data);
      const setClause = cols.map(c => `\`${c}\` = ?`).join(', ');
      await conn.execute(
        `UPDATE vehicles SET ${setClause} WHERE id = ?`,
        [...cols.map(c => data[c]), id]
      );
      await conn.commit();
      await logAudit(req, 'update', 'vehicles', id, data.plate);
      return sendSuccess(res, { id, message: 'Araç güncellendi' });
    }

    data.created_by = req.user.id;
    data.vehicle_code = 'VTMP_' + Date.now();
    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(', ');
    const colList = cols.map(c => `\`${c}\``).join(', ');
    const [result] = await conn.execute(
      `INSERT INTO vehicles (${colList}) VALUES (${placeholders})`,
      cols.map(c => data[c])
    );
    const newId = result.insertId;
    const prefix = PREFIX_MAP[transportType] || 'V';
    const code = prefix + String(newId).padStart(3, '0');
    await conn.execute('UPDATE vehicles SET vehicle_code = ? WHERE id = ?', [code, newId]);
    await conn.commit();
    await logAudit(req, 'create', 'vehicles', newId, data.plate);

    sendSuccess(res, { id: newId, vehicle_code: code, message: 'Araç eklendi' });
  } catch (err) {
    await conn.rollback();
    console.error('[vehicles/save]', err);
    sendError(res, 'Kayıt sırasında hata: ' + err.message, 500);
  } finally {
    conn.release();
  }
});

// ============ GET /api/vehicles/:id ============
// Tek araç (form'da düzenleme için)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');
    const [rows] = await pool.execute('SELECT * FROM vehicles WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    if (rows.length === 0) return sendError(res, 'Araç bulunamadı', 404);
    sendSuccess(res, rows[0]);
  } catch (err) {
    console.error('[vehicles/get]', err);
    sendError(res, 'Hata', 500);
  }
});

// ============ GET /api/vehicles/:id/load ============
// Bu araca yapılan tüm atamalar + sevkiyat detayları + kapasite kullanım özeti
router.get('/:id/load', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    // Araç bilgisi (kapasite için)
    const [vrows] = await pool.execute(
      'SELECT id, plate, capacity_kg, volume_m3 FROM vehicles WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (vrows.length === 0) return sendError(res, 'Araç bulunamadı', 404);
    const vehicle = vrows[0];

    // Atamalar + sevkiyat detayları (arşivde olmayan)
    const [assignments] = await pool.execute(
      `SELECT a.id, a.shipment_id, a.assigned_quantity, a.assigned_weight,
              a.loading_date, a.notes, a.created_at,
              s.shipment_no, s.client_billing, s.transport_type AS shipment_transport,
              s.departure_country, s.arrival_country, s.status AS shipment_status,
              s.quantity AS shipment_total_quantity, s.gross_weight AS shipment_total_weight
       FROM vehicle_assignments a
       LEFT JOIN shipments s ON s.id = a.shipment_id
       WHERE a.vehicle_id = ? AND a.deleted_at IS NULL AND (s.deleted_at IS NULL OR s.id IS NULL)
       ORDER BY a.loading_date DESC, a.created_at DESC`,
      [id]
    );

    // Özet: toplam atanan kap/ağırlık + kapasite kullanım yüzdesi
    let totalQty = 0;
    let totalWeight = 0;
    for (const a of assignments) {
      totalQty += parseInt(a.assigned_quantity || 0, 10);
      totalWeight += parseFloat(a.assigned_weight || 0);
    }
    const capacity = parseFloat(vehicle.capacity_kg || 0);
    const loadPercent = capacity > 0 ? (totalWeight / capacity) * 100 : 0;

    sendSuccess(res, {
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        capacity_kg: capacity,
        volume_m3: parseFloat(vehicle.volume_m3 || 0),
      },
      summary: {
        assignment_count: assignments.length,
        total_quantity: totalQty,
        total_weight: totalWeight,
        load_percent: Math.round(loadPercent * 10) / 10,
        remaining_capacity_kg: Math.max(0, capacity - totalWeight),
      },
      assignments,
    });
  } catch (err) {
    console.error('[vehicles/load]', err);
    sendError(res, 'Yük havuzu alınamadı', 500);
  }
});

// ============ DELETE /api/vehicles/:id ============
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    // Kayıt arşivde değil mi?
    const [vrows] = await pool.execute(
      'SELECT id FROM vehicles WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (vrows.length === 0) return sendError(res, 'Kayıt bulunamadı', 404);

    // RESTRICT: aktif atamaları olan araç silinemez
    const [refs] = await pool.execute(
      'SELECT COUNT(*) AS c FROM vehicle_assignments WHERE vehicle_id = ? AND deleted_at IS NULL',
      [id]
    );
    if (refs[0].c > 0) {
      return sendError(res, `Bu araca bağlı ${refs[0].c} aktif atama var. Önce atamaları kaldırın.`);
    }

    // Soft-delete
    await pool.execute('UPDATE vehicles SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [req.user.id, id]);
    await logAudit(req, 'delete', 'vehicles', id);
    sendSuccess(res, { message: 'Araç arşive taşındı' });
  } catch (err) {
    console.error('[vehicles/delete]', err);
    sendError(res, 'Silme sırasında hata: ' + err.message, 500);
  }
});

module.exports = router;
