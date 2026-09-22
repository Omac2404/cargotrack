const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, requirePermission, can } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const {
  sanitizeText, toInt, toFloat, toNullableDate, toBool01,
  jsonStringifyOrNull, whitelist, sendSuccess, sendError
, toNullableInt } = require('../helpers/utils');

const router = express.Router();

const VALID_TRANSPORT = ['road', 'sea', 'air'];
const VALID_STATUS = ['active', 'inactive', 'maintenance', 'closed'];
// 'closed' = is bitti, kayit arsivde; yukleme/atama listelerinde cikmaz
const OPEN_STATUSES = ['active', 'inactive', 'maintenance'];

/**
 * Ayni plakada KAPATILMAMIS baska kayit var mi?
 * Kapatilmis kayitlarla cakisma serbesttir — ayni plakali kamyon tekrar
 * geldiginde yeni kayit acilabilmesi bunun icin.
 */
async function findOpenDuplicate(conn, plate, excludeId) {
  const [rows] = await (conn || pool).execute(
    `SELECT id, vehicle_code, plate, status FROM vehicles
     WHERE plate = ? AND deleted_at IS NULL AND status != 'closed'
     ${excludeId ? 'AND id != ?' : ''} LIMIT 1`,
    excludeId ? [plate, excludeId] : [plate]
  );
  return rows[0] || null;
}

const EQUIPMENT_BY_MODE = {
  road: ['tilt', 'frigorifik', 'open', 'container', 'tanker', 'other'],
  sea: ['container_20', 'container_40', 'container_40hc', 'container_reefer', 'bulk', 'breakbulk', 'tanker', 'roro', 'other'],
  air: ['passenger', 'freighter', 'combi', 'express', 'other']
};

const PREFIX_MAP = { road: 'V', sea: 'VS', air: 'VA' };

// ============ GET /api/vehicles?transport_type=road ============
router.get('/', verifyToken, requirePermission('vehicles.read'), async (req, res) => {
  try {
    const transportType = sanitizeText(req.query.transport_type || '');
    // Kapatilan kayitlar varsayilan olarak gelmez; arac listesi ekrani
    // include_closed=1 ile hepsini ister.
    const includeClosed = ['1', 'true', 'yes'].includes(String(req.query.include_closed || '').toLowerCase());
    const where = ['deleted_at IS NULL'];
    const params = [];
    if (transportType && VALID_TRANSPORT.includes(transportType)) {
      where.push('transport_type = ?');
      params.push(transportType);
    }
    if (!includeClosed) where.push("status != 'closed'");
    const [rows] = await pool.execute(
      `SELECT * FROM vehicles WHERE ${where.join(' AND ')} ORDER BY vehicle_code ASC`,
      params
    );
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

    // İzin: yeni araç → vehicles.create, mevcut araç → vehicles.update
    const needed = id ? 'vehicles.update' : 'vehicles.create';
    if (!can(req.user, needed)) {
      await conn.rollback();
      return sendError(res, `Bu işlem için yetkiniz yok (${needed})`, 403);
    }

    const plate = sanitizeText(body.plate);
    if (!plate) {
      await conn.rollback();
      return sendError(res, 'Plaka / Tanıtıcı zorunludur');
    }

    // Konteyner detaylari (deniz): [{no, packages, weight}] — no'su bos satirlar atilir
    let containersData = body.containers_data;
    if (typeof containersData === 'string' && containersData.trim()) {
      try { containersData = JSON.parse(containersData); } catch (e) { containersData = null; }
    }
    const containerRows = Array.isArray(containersData)
      ? containersData
          .filter((c) => c && String(c.no || '').trim())
          .map((c) => ({
            no: sanitizeText(String(c.no)).toUpperCase(),
            packages: toNullableInt(c.packages),
            weight: c.weight === '' || c.weight == null ? null : (parseFloat(c.weight) || null),
          }))
      : [];

    // Ayni plakada acik kayit varsa engelle — iki ayni kayit karisikliga yol aciyordu.
    // Once eski kaydin kapatilmasi gerekir (Clôturer le véhicule).
    const dup = await findOpenDuplicate(conn, plate.toUpperCase(), id || null);
    if (dup) {
      await conn.rollback();
      return sendError(res, `Bu plakada açık bir araç kaydı var: ${dup.vehicle_code}. Yeni kayıt açmak için önce onu kapatın.`, 409, {
        code: 'duplicate_plate',
        vehicle: { id: dup.id, vehicle_code: dup.vehicle_code, plate: dup.plate },
      });
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
      carrier_name: sanitizeText(body.carrier_name),
      // Deniz modu: konteyner ve B/L bilgileri (diger modlarda bos gecilir)
      container_numbers: containerRows.length
        ? containerRows.map((c) => String(c.no).trim()).join(', ')
        : sanitizeText(body.container_numbers),
      container_count: containerRows.length ? containerRows.length : toNullableInt(body.container_count),
      containers_data: containerRows.length ? JSON.stringify(containerRows) : null,
      bl_number: sanitizeText(body.bl_number),
      total_packages: toNullableInt(body.total_packages),
      driver_name: sanitizeText(body.driver_name),
      driver_phone: sanitizeText(body.driver_phone),
      registration_date: toNullableDate(body.registration_date),
      notes: sanitizeText(body.notes),
      status: whitelist(sanitizeText(body.status), VALID_STATUS, 'active'),
      mode_data: jsonStringifyOrNull(body.mode_data)
    };

    // Durum formdan 'closed' yapildiysa kapanis bilgisi de yazilir
    if (data.status === 'closed') {
      data.closed_at = new Date();
      data.closed_by = req.user.id;
    } else {
      data.closed_at = null;
      data.closed_by = null;
    }

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
router.get('/:id', verifyToken, requirePermission('vehicles.read'), async (req, res) => {
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
router.get('/:id/load', verifyToken, requirePermission('vehicles.read'), async (req, res) => {
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
       -- INNER JOIN: kapasite kontrolüyle birebir aynı kural. Sevkiyatı arşivlenmiş
       -- ya da hiç bulunmayan atamalar ne listede ne de doluluk hesabında yer alır.
       JOIN shipments s ON s.id = a.shipment_id AND s.deleted_at IS NULL
       WHERE a.vehicle_id = ? AND a.deleted_at IS NULL
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

// ============ POST /api/vehicles/:id/close ============
// İş biten kamyonun kaydını kapatır: yükleme/atama listelerinden çıkar, yükleri
// ve dosya atamaları arşiv olarak aynen kalır (yükleme listesi PDF'i basılabilir).
router.post('/:id/close', verifyToken, requirePermission('vehicles.update'), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const [rows] = await pool.execute(
      'SELECT id, vehicle_code, plate, status FROM vehicles WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]
    );
    const v = rows[0];
    if (!v) return sendError(res, 'Kayıt bulunamadı', 404);
    if (v.status === 'closed') return sendSuccess(res, { id, message: 'Kayıt zaten kapalı' });

    await pool.execute(
      "UPDATE vehicles SET status = 'closed', closed_at = NOW(), closed_by = ? WHERE id = ?",
      [req.user.id, id]
    );
    await logAudit(req, 'update', 'vehicles', id, `${v.vehicle_code} ${v.plate} kapatıldı`);
    sendSuccess(res, { id, message: 'Araç kaydı kapatıldı' });
  } catch (err) {
    console.error('[vehicles/close]', err);
    sendError(res, 'Kapatma sırasında hata', 500);
  }
});

// ============ POST /api/vehicles/:id/reopen ============
// Yanlışlıkla kapatılan kaydı geri açar — aynı plakada başka açık kayıt varsa engellenir.
router.post('/:id/reopen', verifyToken, requirePermission('vehicles.update'), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const [rows] = await pool.execute(
      'SELECT id, vehicle_code, plate, status FROM vehicles WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]
    );
    const v = rows[0];
    if (!v) return sendError(res, 'Kayıt bulunamadı', 404);
    if (v.status !== 'closed') return sendSuccess(res, { id, message: 'Kayıt zaten açık' });

    const dup = await findOpenDuplicate(null, v.plate, id);
    if (dup) {
      return sendError(res, `Bu plakada açık bir kayıt var: ${dup.vehicle_code}. Geri açmak için önce onu kapatın.`, 409, {
        code: 'duplicate_plate',
        vehicle: { id: dup.id, vehicle_code: dup.vehicle_code, plate: dup.plate },
      });
    }
    await pool.execute(
      "UPDATE vehicles SET status = 'active', closed_at = NULL, closed_by = NULL WHERE id = ?", [id]
    );
    await logAudit(req, 'update', 'vehicles', id, `${v.vehicle_code} ${v.plate} yeniden açıldı`);
    sendSuccess(res, { id, message: 'Araç kaydı yeniden açıldı' });
  } catch (err) {
    console.error('[vehicles/reopen]', err);
    sendError(res, 'Geri açma sırasında hata', 500);
  }
});

// ============ DELETE /api/vehicles/:id ============
router.delete('/:id', verifyToken, requirePermission('vehicles.delete'), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    // Kayıt arşivde değil mi?
    const [vrows] = await pool.execute(
      'SELECT id FROM vehicles WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (vrows.length === 0) return sendError(res, 'Kayıt bulunamadı', 404);

    // RESTRICT: aktif atamaları olan araç silinemez.
    // Arşivlenmiş sevkiyatların atamaları sayılmaz — yoksa araç ekranda boş
    // görünürken "atamaları var" diye silinemez hale geliyordu.
    const [refs] = await pool.execute(
      `SELECT COUNT(*) AS c
       FROM vehicle_assignments a
       JOIN shipments s ON s.id = a.shipment_id
       WHERE a.vehicle_id = ? AND a.deleted_at IS NULL AND s.deleted_at IS NULL`,
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
