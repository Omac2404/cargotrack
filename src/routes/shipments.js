const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, hasRole, requirePermission } = require('../middleware/auth');
const { logAudit, getAuditLog } = require('../helpers/audit');
const { computeDiff } = require('../helpers/diff');
const { notify } = require('../helpers/notifications');
const {
  sanitizeText, sanitizeEmail, toInt, toFloat,
  toNullableInt, toNullableFloat, toNullableDate, toBool01,
  jsonStringifyOrNull, whitelist, sendSuccess, sendError
} = require('../helpers/utils');

const router = express.Router();

// Geçerli taşıma tipleri (DB ENUM ile birebir, ek olarak 'sea' alias)
const VALID_TYPES = ['road', 'storage', 'maritime', 'sea', 'air', 'import', 'export'];
const VALID_STATUSES = ['draft', 'in_progress', 'to_invoice', 'closed'];
const PREFIX_MAP = {
  road: 'ROU', storage: 'STO', maritime: 'SEA',
  air: 'AIR', import: 'IMP', export: 'EXP'
};

function normalizeTransportType(t) {
  if (t === 'sea') return 'maritime';
  return VALID_TYPES.includes(t) ? (t === 'sea' ? 'maritime' : t) : 'road';
}

// Tablo kolonları — beyaz liste (SQL injection koruması: kullanıcı arbitrary kolon yazamaz)
// Her kolon için (name, type, defaultProcessor) tanımlı
const COL_DEFS = {
  shipment_no: { type: 'text' },
  transport_type: { type: 'enum', allowed: VALID_TYPES.filter(t => t !== 'sea').concat([]), defaultValue: 'road' },
  status: { type: 'enum', allowed: VALID_STATUSES, defaultValue: 'draft' },
  created_date: { type: 'date' },
  responsible_user: { type: 'text' },
  client_reference: { type: 'text' },

  client_billing: { type: 'text' },
  sender: { type: 'text' },
  receiver: { type: 'text' },
  agent: { type: 'text' },
  client_contact: { type: 'text' },
  client_phone: { type: 'text' },
  client_email: { type: 'email' },
  client_delivery_address: { type: 'text' },
  departure_country: { type: 'text' },
  arrival_country: { type: 'text' },
  parties_data: { type: 'json' },

  goods_description: { type: 'text' },
  hs_code: { type: 'text' },
  gross_weight: { type: 'float' },
  net_weight: { type: 'float' },
  volume_cbm: { type: 'float' },
  dimensions: { type: 'text' },
  quantity: { type: 'int' },
  package_count: { type: 'int' },
  pallets: { type: 'bool' },
  package_type: { type: 'text' },
  package_type_custom: { type: 'text' },
  dangerous_goods: { type: 'bool' },
  adr_code: { type: 'text' },
  temperature_controlled: { type: 'bool' },
  temperature_min: { type: 'nfloat' },
  temperature_max: { type: 'nfloat' },
  incoterm: { type: 'text' },
  incoterm_location: { type: 'text' },
  incoterm_postal: { type: 'text' },
  incoterm_city: { type: 'text' },
  incoterm_country_field: { type: 'text' },
  insurance: { type: 'bool' },
  goods_value: { type: 'float' },
  crates_data: { type: 'text' },

  purchase_price: { type: 'float' },
  sale_price: { type: 'float' },
  freight_cost: { type: 'float' },
  customs_cost: { type: 'float' },
  transport_handling: { type: 'float' },
  storage_handling: { type: 'float' },
  storage_cost: { type: 'float' },
  insurance_cost: { type: 'float' },
  other_costs: { type: 'float' },
  currency_code: { type: 'text', defaultValue: 'EUR' },
  financial_data: { type: 'json' },

  documents: { type: 'json' },
  documents_data: { type: 'json' },

  warehouse: { type: 'text' },
  entry_date: { type: 'date' },
  exit_date: { type: 'date' },
  daily_rate: { type: 'float' },
  handling_fee: { type: 'float' },
  other_storage_fees: { type: 'float' },
  storage_data: { type: 'json' },
  depo_stock_log: { type: 'json' },
  depo_kap_sayisi: { type: 'int' },
  depo_ucret_tipi: { type: 'text', defaultValue: 'gun' },
  depo_gun_ucret: { type: 'float' },
  depo_hafta_ucret: { type: 'float' },
  depo_ay_ucret: { type: 'float' },
  depo_musteri: { type: 'text' },
  depo_gunluk_ucret: { type: 'float' },
  depo_toplam_satis: { type: 'float' },

  ellecleme_filmleme: { type: 'float' },
  ellecleme_paletleme: { type: 'float' },
  ellecleme_etiketleme: { type: 'float' },
  ellecleme_depo_giris: { type: 'float' },
  ellecleme_depo_cikis: { type: 'float' },

  mode_data: { type: 'json' },

  invoice_generated: { type: 'bool' },
  invoice_no: { type: 'text' },
  invoice_date: { type: 'date' },
  invoice_amount: { type: 'float' },
  payment_received: { type: 'bool' },
  payment_type: { type: 'text' },
  payment_notes: { type: 'text' }
};

function processValue(def, raw) {
  switch (def.type) {
    case 'text': return sanitizeText(raw);
    case 'email': return sanitizeEmail(raw);
    case 'int': return toInt(raw, 0);
    case 'float': return toFloat(raw, 0);
    case 'nfloat': return toNullableFloat(raw);
    case 'bool': return toBool01(raw);
    case 'date': return toNullableDate(raw);
    case 'json': return jsonStringifyOrNull(raw);
    case 'enum': return whitelist(sanitizeText(raw), def.allowed, def.defaultValue);
    default: return raw;
  }
}

function buildDataRecord(input) {
  const out = {};
  for (const col of Object.keys(COL_DEFS)) {
    if (input[col] !== undefined) {
      out[col] = processValue(COL_DEFS[col], input[col]);
    }
  }
  return out;
}

async function generateShipmentNo(conn, type) {
  const prefix = PREFIX_MAP[type] || 'ROU';
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const [rows] = await conn.execute(
    'SELECT COUNT(*) AS c FROM shipments WHERE DATE(created_at) = CURDATE() AND deleted_at IS NULL'
  );
  const seq = String((rows[0].c || 0) + 1).padStart(3, '0');
  return `${prefix}-${ymd}-${seq}`;
}

// ============ GET /api/shipments?transport_type=road ============
// user rolü sadece kendi oluşturduklarını görür; admin+ tümünü görür
router.get('/', verifyToken, async (req, res) => {
  try {
    const type = normalizeTransportType(req.query.transport_type || 'road');
    let sql = 'SELECT * FROM shipments WHERE transport_type = ? AND deleted_at IS NULL';
    const params = [type];
    if (!hasRole(req.user, 'admin')) {
      sql += ' AND created_by = ?';
      params.push(req.user.id);
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(sql, params);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[shipments/list]', err);
    sendError(res, 'Sevkiyatlar alınamadı', 500);
  }
});

// ============ GET /api/shipments/:id ============
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    const [rows] = await pool.execute('SELECT * FROM shipments WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
    if (rows.length === 0) return sendError(res, 'Kayıt bulunamadı', 404);

    const shipment = rows[0];
    // Ownership: user sadece kendininkini görebilir
    if (!hasRole(req.user, 'admin') && shipment.created_by !== req.user.id) {
      return sendError(res, 'Bu kaydı görüntüleme yetkiniz yok', 403);
    }
    // documents JSON kolonu mysql2 tarafından parse edilmiş olabilir, değilse parse et
    if (typeof shipment.documents === 'string') {
      try { shipment.documents = JSON.parse(shipment.documents); }
      catch (e) { shipment.documents = []; }
    } else if (!shipment.documents) {
      shipment.documents = [];
    }

    sendSuccess(res, shipment);
  } catch (err) {
    console.error('[shipments/get]', err);
    sendError(res, 'Hata', 500);
  }
});

// ============ POST /api/shipments (create veya update) ============
router.post('/', verifyToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const input = req.body || {};
    const shipmentId = toInt(input.id);

    // transport_type erken normalize
    const rawType = sanitizeText(input.transport_type || 'road');
    const normalizedType = normalizeTransportType(rawType);

    // Veri kaydını oluştur
    const record = buildDataRecord(input);
    record.transport_type = normalizedType;

    if (shipmentId) {
      // UPDATE — önce eski satırın TAMAMINI çek (diff için)
      const [existingRows] = await conn.execute(
        'SELECT * FROM shipments WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [shipmentId]
      );
      if (existingRows.length === 0) {
        await conn.rollback();
        return sendError(res, 'Kayıt bulunamadı', 404);
      }
      const oldRow = existingRows[0];

      // Yetki: kendi kaydı veya admin+
      if (oldRow.created_by !== req.user.id && !hasRole(req.user, 'admin')) {
        await conn.rollback();
        return sendError(res, 'Bu kaydı düzenleme yetkiniz yok', 403);
      }

      // shipment_no UPDATE'te yeniden üretmiyoruz, gelen değeri veya mevcudu koruyoruz
      if (!record.shipment_no) delete record.shipment_no;

      // Diff hesapla (UPDATE'ten ÖNCE — oldRow elimizde, record da hazır)
      const diff = computeDiff(oldRow, record, COL_DEFS);

      const cols = Object.keys(record);
      const setClause = cols.map(c => `\`${c}\` = ?`).join(', ');
      const values = cols.map(c => record[c]);
      values.push(shipmentId);
      await conn.execute(`UPDATE shipments SET ${setClause} WHERE id = ?`, values);

      await conn.commit();

      // Sadece gerçek değişiklik varsa audit yaz
      if (Object.keys(diff).length > 0) {
        await logAudit(req, 'update', 'shipments', shipmentId, record.shipment_no || oldRow.shipment_no || `#${shipmentId}`, diff);
      }
      sendSuccess(res, { id: shipmentId, shipment_no: record.shipment_no || null, message: 'Kayıt güncellendi' });
    } else {
      // INSERT
      record.shipment_no = await generateShipmentNo(conn, normalizedType);
      record.created_by = req.user.id;
      if (!record.created_date) record.created_date = new Date().toISOString().slice(0, 10);

      const cols = Object.keys(record);
      const placeholders = cols.map(() => '?').join(', ');
      const colList = cols.map(c => `\`${c}\``).join(', ');
      const values = cols.map(c => record[c]);

      const [result] = await conn.execute(
        `INSERT INTO shipments (${colList}) VALUES (${placeholders})`,
        values
      );

      await conn.commit();
      await logAudit(req, 'create', 'shipments', result.insertId, record.shipment_no);
      sendSuccess(res, {
        id: result.insertId,
        shipment_no: record.shipment_no,
        message: 'Kayıt başarılı'
      });
    }
  } catch (err) {
    await conn.rollback();
    console.error('[shipments/save]', err);
    sendError(res, 'Kayıt sırasında hata: ' + err.message, 500);
  } finally {
    conn.release();
  }
});

// ============ POST /api/shipments/bulk-action ============
// Toplu işlem: { ids: [1,2,3], action: 'delete' | 'set_status', status?: '...' }
// Sahiplik: user sadece kendi kayıtlarına; admin+ hepsine
router.post('/bulk-action', verifyToken, requirePermission('shipments.bulk_action'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const body = req.body || {};
    const ids = Array.isArray(body.ids) ? body.ids.map(toInt).filter((n) => n > 0) : [];
    const action = sanitizeText(body.action);
    if (ids.length === 0) return sendError(res, 'Hiç kayıt seçilmedi');
    if (!['delete', 'set_status'].includes(action)) return sendError(res, 'Geçersiz işlem');
    if (action === 'set_status' && !VALID_STATUSES.includes(body.status)) {
      return sendError(res, 'Geçersiz durum');
    }

    await conn.beginTransaction();

    // Ownership kontrolü: user sadece kendi sahip olduklarıyla işlem yapabilir
    const placeholders = ids.map(() => '?').join(',');
    let ownerSql = `SELECT id, shipment_no, created_by FROM shipments WHERE id IN (${placeholders}) AND deleted_at IS NULL`;
    const [rows] = await conn.execute(ownerSql, ids);
    if (rows.length === 0) {
      await conn.rollback();
      return sendError(res, 'Hiçbir kayıt bulunamadı', 404);
    }
    if (!hasRole(req.user, 'admin')) {
      const unauthorized = rows.filter((r) => r.created_by !== req.user.id);
      if (unauthorized.length > 0) {
        await conn.rollback();
        return sendError(res, `Bazı kayıtlarda yetkiniz yok (${unauthorized.length} kayıt)`, 403);
      }
    }

    let affected = 0;
    if (action === 'delete') {
      // Soft-delete (arşive taşı) — uploads klasörü kalıcı silmede temizlenir
      const [del] = await conn.execute(
        `UPDATE shipments SET deleted_at = NOW(), deleted_by = ? WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
        [req.user.id, ...ids]
      );
      affected = del.affectedRows;
      await conn.commit();
      for (const r of rows.slice(0, affected)) {
        await logAudit(req, 'delete', 'shipments', r.id, r.shipment_no || `#${r.id}`);
      }
    } else if (action === 'set_status') {
      const [upd] = await conn.execute(
        `UPDATE shipments SET status = ? WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
        [body.status, ...ids]
      );
      affected = upd.affectedRows;
      await conn.commit();
      const STATUS_TR = { draft: 'Taslak', in_progress: 'Devam Ediyor', to_invoice: 'Faturalanacak', closed: 'Kapalı' };
      for (const r of rows) {
        await logAudit(req, 'update', 'shipments', r.id, r.shipment_no || `#${r.id}`, {
          status: { from: null, to: body.status, _bulk: true },
        });
        // Sevkiyat sahibine bildirim (kendi yapan hariç)
        if (r.created_by && r.created_by !== req.user.id) {
          await notify({
            userId: r.created_by,
            type: 'shipment_status',
            title: `Sevkiyat statüsü değişti: ${r.shipment_no || `#${r.id}`}`,
            body: `Yeni statü: ${STATUS_TR[body.status] || body.status}. ${req.user.username} tarafından (toplu işlem).`,
            link: `/shipments/karayolu/${r.id}/edit`,
            entityType: 'shipments',
            entityId: r.id,
          });
        }
      }
    }

    sendSuccess(res, { affected, message: `${affected} kayıt güncellendi` });
  } catch (err) {
    await conn.rollback();
    console.error('[shipments/bulk-action]', err);
    sendError(res, 'Toplu işlem hatası: ' + err.message, 500);
  } finally {
    conn.release();
  }
});

// ============ GET /api/shipments/:id/history ============
// Sevkiyatın oluşturanı + audit_log'dan tüm değişiklik geçmişi.
// Salt-okunur (audit_log'a yazma sadece backend tarafından yapılır).
router.get('/:id/history', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    // Yetki: kendi kaydı veya admin+
    const [shipRows] = await pool.execute(
      `SELECT s.id, s.shipment_no, s.created_at, s.created_by,
              u.username AS created_by_username, u.full_name AS created_by_fullname
       FROM shipments s
       LEFT JOIN users u ON u.id = s.created_by
       WHERE s.id = ? AND s.deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (shipRows.length === 0) return sendError(res, 'Kayıt bulunamadı', 404);
    const ship = shipRows[0];
    if (!hasRole(req.user, 'admin') && ship.created_by !== req.user.id) {
      return sendError(res, 'Bu kaydı görüntüleme yetkiniz yok', 403);
    }

    // Audit log — entity_type='shipments', entity_id=id; kronolojik (eski→yeni)
    const entries = await getAuditLog({ entityType: 'shipments', entityId: id, limit: 500 });
    // getAuditLog DESC döner; ASC istiyoruz
    entries.reverse();

    // changes string ise parse et (mysql2 JSON tipini auto-parse etmeyebiliyor)
    for (const e of entries) {
      if (typeof e.changes === 'string') {
        try { e.changes = JSON.parse(e.changes); } catch { e.changes = null; }
      }
    }

    sendSuccess(res, {
      created: {
        at: ship.created_at,
        user_id: ship.created_by,
        username: ship.created_by_username,
        full_name: ship.created_by_fullname,
      },
      entries,
    });
  } catch (err) {
    console.error('[shipments/history]', err);
    sendError(res, 'Geçmiş alınamadı', 500);
  }
});

// ============ DELETE /api/shipments/:id ============
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');

    const expected = req.query.expected_transport_type
      ? normalizeTransportType(req.query.expected_transport_type)
      : null;

    const [rows] = await pool.execute(
      'SELECT id, shipment_no, transport_type, created_by FROM shipments WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (rows.length === 0) return sendError(res, 'Kayıt bulunamadı', 404);

    const shipment = rows[0];

    // Yetki: user sadece kendi kaydını silebilir; admin+ herkesi
    if (shipment.created_by !== req.user.id && !hasRole(req.user, 'admin')) {
      return sendError(res, 'Bu kaydı silme yetkiniz yok', 403);
    }

    // Mod uyumsuzluğu kontrolü (v2.10.0 davranışını koru)
    if (expected) {
      let actual = shipment.transport_type;
      if (actual === 'sea') actual = 'maritime';
      if (actual !== expected) {
        const labels = { road: 'Karayolu', maritime: 'Denizyolu', air: 'Havayolu', storage: 'Depolama', import: 'İthalat', export: 'İhracat' };
        return sendError(
          res,
          `Mod uyumsuzluğu: Bu kayıt ${labels[actual] || actual} sevkiyatı (siz ${labels[expected] || expected} listesinde silmeye çalışıyorsunuz). Silme reddedildi.`
        );
      }
    }

    // Soft-delete (arşive taşı) — uploads klasörü kalıcı silmede temizlenir
    await pool.execute(
      'UPDATE shipments SET deleted_at = NOW(), deleted_by = ? WHERE id = ?',
      [req.user.id, id]
    );
    await logAudit(req, 'delete', 'shipments', id, shipment.shipment_no || `#${id}`);
    sendSuccess(res, { message: 'Kayıt arşive taşındı' });
  } catch (err) {
    console.error('[shipments/delete]', err);
    sendError(res, 'Silme sırasında hata: ' + err.message, 500);
  }
});

module.exports = router;
