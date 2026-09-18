/**
 * Dosyadan doğrudan araca yükleme (chargement direct).
 *
 * Sevkiyatta `direct_vehicle_id` seçiliyse, dosya kaydedildiğinde o araca
 * dosyanın TÜM koli/kilosuyla bir atama yapılır ve dosya değiştikçe güncel
 * tutulur. Böylece kamyonu belli olan dosyalar için ayrıca atama gerekmez.
 *
 * Kurallar (atama API'si ile aynı):
 *   - depolama dosyası araç alamaz; ithalat/ihracat her moddaki araca gidebilir
 *   - araç kapasitesi aşılamaz (aracın diğer aktif yükleri sayılır)
 *   - dosya birden fazla araca bölünmüşse dokunulmaz ('split')
 *
 * Sonuç ekrana çevrilmek üzere kod + parametre olarak döner; mesaj metni
 * frontend'de kullanıcının diline göre üretilir.
 */
const { pool } = require('../config/database');
const { can } = require('../middleware/auth');
const { logAudit } = require('./audit');

const norm = (t) => (t === 'sea' ? 'maritime' : t || '');

async function syncDirectAssignment(shipmentId, req) {
  if (!can(req.user, 'assignments.create')) return { status: 'skipped', code: 'no_permission' };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [srows] = await conn.execute(
      `SELECT id, shipment_no, quantity, gross_weight, transport_type, direct_vehicle_id
       FROM shipments WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [shipmentId]
    );
    const s = srows[0];
    if (!s || !s.direct_vehicle_id) { await conn.rollback(); return { status: 'none' }; }

    const [vrows] = await conn.execute(
      'SELECT id, plate, transport_type, capacity_kg FROM vehicles WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
      [s.direct_vehicle_id]
    );
    const v = vrows[0];
    if (!v) { await conn.rollback(); return { status: 'error', code: 'vehicle_missing' }; }

    const shipTT = norm(s.transport_type);
    const vehTT = norm(v.transport_type);
    if (shipTT === 'storage') { await conn.rollback(); return { status: 'error', code: 'storage', plate: v.plate }; }
    if (shipTT !== 'import' && shipTT !== 'export' && shipTT !== vehTT) {
      await conn.rollback();
      return { status: 'error', code: 'mode', plate: v.plate };
    }

    const qty = parseInt(s.quantity, 10) || 0;
    const wgt = Math.round((parseFloat(s.gross_weight) || 0) * 100) / 100;
    if (qty <= 0) { await conn.rollback(); return { status: 'skipped', code: 'no_quantity', plate: v.plate }; }

    const [active] = await conn.execute(
      'SELECT id, vehicle_id, assigned_quantity, assigned_weight FROM vehicle_assignments WHERE shipment_id = ? AND deleted_at IS NULL',
      [s.id]
    );
    if (active.length > 1) { await conn.rollback(); return { status: 'split', code: 'split', count: active.length, plate: v.plate }; }
    const existing = active[0] || null;

    // Kapasite: aracın bu atama dışındaki aktif yükleri
    const [used] = await conn.execute(
      `SELECT COALESCE(SUM(a.assigned_weight), 0) AS wgt
       FROM vehicle_assignments a JOIN shipments sh ON sh.id = a.shipment_id
       WHERE a.vehicle_id = ? AND a.deleted_at IS NULL AND sh.deleted_at IS NULL
       ${existing ? 'AND a.id != ?' : ''}`,
      existing ? [v.id, existing.id] : [v.id]
    );
    const usedW = parseFloat(used[0].wgt || 0);
    const cap = parseFloat(v.capacity_kg || 0);
    if (cap > 0 && wgt > 0 && usedW + wgt > cap + 0.01) {
      await conn.rollback();
      return {
        status: 'error', code: 'capacity', plate: v.plate,
        capacity: cap, used: Math.round(usedW * 100) / 100, remaining: Math.max(0, Math.round((cap - usedW) * 100) / 100), weight: wgt,
      };
    }

    let action = 'unchanged';
    let assignmentId = existing ? existing.id : null;
    if (existing) {
      const same = existing.vehicle_id === v.id
        && parseInt(existing.assigned_quantity, 10) === qty
        && Math.abs(parseFloat(existing.assigned_weight || 0) - wgt) < 0.005;
      if (!same) {
        await conn.execute(
          'UPDATE vehicle_assignments SET vehicle_id = ?, assigned_quantity = ?, assigned_weight = ? WHERE id = ?',
          [v.id, qty, wgt, existing.id]
        );
        action = existing.vehicle_id === v.id ? 'updated' : 'moved';
      }
    } else {
      const [r] = await conn.execute(
        'INSERT INTO vehicle_assignments (vehicle_id, shipment_id, assigned_quantity, assigned_weight, created_by) VALUES (?, ?, ?, ?, ?)',
        [v.id, s.id, qty, wgt, req.user.id]
      );
      assignmentId = r.insertId;
      action = 'created';
    }
    await conn.commit();

    if (action !== 'unchanged') {
      await logAudit(req, action === 'created' ? 'create' : 'update', 'assignments', assignmentId,
        `${s.shipment_no} → ${v.plate} (chargement direct ${qty} colis / ${wgt} kg)`);
    }
    return { status: 'ok', code: action, plate: v.plate, quantity: qty, weight: wgt };
  } catch (err) {
    try { await conn.rollback(); } catch (e) { /* yoksay */ }
    console.error('[direct-assignment]', err);
    return { status: 'error', code: 'server' };
  } finally {
    conn.release();
  }
}

module.exports = { syncDirectAssignment };
