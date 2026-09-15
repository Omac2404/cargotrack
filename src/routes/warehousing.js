/**
 * Sözleşmeli depoculuk (entreposage) API.
 *
 *   /accounts                      müşteri depo hesapları (sözleşme + tarife)
 *   /accounts/:id/movements        palet giriş / çıkış / düzeltme defteri
 *   /accounts/:id/services         depo hizmetleri (sipariş hazırlama, etiketleme...)
 *   /accounts/:id/statement        ay sonu dökümü (canlı hesap)
 *   /accounts/:id/statements       kapatılmış aylar (donmuş kopya + fatura durumu)
 *   /overview                      tüm hesapların dönem özeti
 *
 * Sevkiyat dosyalarındaki geçici/transit depolamaya dokunmaz.
 */
const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const {
  sanitizeText, sanitizeEmail, toInt, toFloat, toNullableInt, toNullableFloat, toNullableDate,
  whitelist, sendSuccess, sendError,
} = require('../helpers/utils');
const W = require('../helpers/warehousing');

const router = express.Router();

const ACCOUNT_STATUS = ['active', 'suspended', 'closed'];
const DIRECTIONS = ['in', 'out', 'adjust'];
const STATEMENT_STATUS = ['draft', 'issued', 'paid'];

const currentPeriod = () => W.toISODate(new Date()).slice(0, 7);
const fmtFr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// ---------- yardımcılar ----------
async function loadAccount(id) {
  const [rows] = await pool.execute('SELECT * FROM wh_accounts WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
  return rows[0] || null;
}

async function loadMovements(accountId, untilDate) {
  const params = [accountId];
  let sql = 'SELECT * FROM wh_movements WHERE account_id = ? AND deleted_at IS NULL';
  if (untilDate) { sql += ' AND movement_date <= ?'; params.push(untilDate); }
  sql += ' ORDER BY movement_date ASC, id ASC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function loadServices(accountId, from, to) {
  const [rows] = await pool.execute(
    `SELECT * FROM wh_services WHERE account_id = ? AND deleted_at IS NULL
     AND service_date BETWEEN ? AND ? ORDER BY service_date ASC, id ASC`,
    [accountId, from, to]
  );
  return rows;
}

/** Dönem kapatılmış (düzenlenmiş fatura) mı? Taslak kapanış düzenlemeyi engellemez. */
async function lockedStatement(accountId, isoDate) {
  const [rows] = await pool.execute(
    `SELECT id, status, statement_no FROM wh_statements
     WHERE account_id = ? AND period = ? AND status IN ('issued','paid') LIMIT 1`,
    [accountId, String(isoDate).slice(0, 7)]
  );
  return rows[0] || null;
}

function lockedMessage(st, isoDate) {
  return `Le mois ${String(isoDate).slice(0, 7)} est clôturé (relevé ${st.statement_no}, statut « ${st.status === 'paid' ? 'payé' : 'émis'} »). Repassez-le en brouillon pour modifier.`;
}

function accountRecord(body) {
  const billing = whitelist(sanitizeText(body.storage_billing), Object.keys(W.STORAGE_BILLING), 'pallet_day');
  const extra = W.parseExtraServices(body.extra_services);
  const vat = toNullableFloat(body.vat_rate);
  return {
    client_name: sanitizeText(body.client_name),
    warehouse: sanitizeText(body.warehouse),
    contact_person: sanitizeText(body.contact_person),
    contact_email: sanitizeEmail(body.contact_email),
    contact_phone: sanitizeText(body.contact_phone),
    start_date: toNullableDate(body.start_date),
    end_date: toNullableDate(body.end_date),
    status: whitelist(sanitizeText(body.status), ACCOUNT_STATUS, 'active'),
    currency_code: (sanitizeText(body.currency_code) || 'EUR').toUpperCase().slice(0, 3),
    vat_rate: vat === null ? 20 : Math.max(0, Math.min(100, vat)),
    storage_billing: billing,
    storage_rate: Math.max(0, toFloat(body.storage_rate)),
    fixed_monthly_fee: Math.max(0, toFloat(body.fixed_monthly_fee)),
    min_monthly_fee: Math.max(0, toFloat(body.min_monthly_fee)),
    in_rate: Math.max(0, toFloat(body.in_rate)),
    out_rate: Math.max(0, toFloat(body.out_rate)),
    order_prep_rate: Math.max(0, toFloat(body.order_prep_rate)),
    order_line_rate: Math.max(0, toFloat(body.order_line_rate)),
    label_rate: Math.max(0, toFloat(body.label_rate)),
    filming_rate: Math.max(0, toFloat(body.filming_rate)),
    palletizing_rate: Math.max(0, toFloat(body.palletizing_rate)),
    unloading_rate: Math.max(0, toFloat(body.unloading_rate)),
    extra_services: extra.length ? JSON.stringify(extra) : null,
    payment_terms: sanitizeText(body.payment_terms),
    notes: sanitizeText(body.notes),
  };
}

function serializeAccount(row) {
  if (!row) return row;
  return { ...row, start_date: W.toISODate(row.start_date), end_date: W.toISODate(row.end_date), extra_services: W.parseExtraServices(row.extra_services) };
}

// ============ GET /overview?period=YYYY-MM ============
// Liste ekranı: her hesap için güncel stok + seçilen dönemin tahmini tutarı
router.get('/overview', verifyToken, requirePermission('warehousing.read'), async (req, res) => {
  try {
    const period = W.isValidPeriod(req.query.period) ? req.query.period : currentPeriod();
    const { start, end } = W.periodBounds(period);

    const [accounts] = await pool.execute(
      'SELECT * FROM wh_accounts WHERE deleted_at IS NULL ORDER BY client_name ASC'
    );
    if (accounts.length === 0) return sendSuccess(res, { period, accounts: [], totals: { stock: 0, total_ht: 0, in: 0, out: 0 } });

    const [movs] = await pool.execute(
      'SELECT * FROM wh_movements WHERE deleted_at IS NULL AND movement_date <= ? ORDER BY movement_date ASC, id ASC', [end]
    );
    const [allMovs] = await pool.execute(
      `SELECT account_id, direction, pallets, movement_date FROM wh_movements WHERE deleted_at IS NULL`
    );
    const [svcs] = await pool.execute(
      'SELECT * FROM wh_services WHERE deleted_at IS NULL AND service_date BETWEEN ? AND ?', [start, end]
    );
    const [stmts] = await pool.execute(
      'SELECT id, account_id, status, statement_no, total_ttc FROM wh_statements WHERE period = ?', [period]
    );

    const group = (arr) => arr.reduce((m, r) => { (m[r.account_id] = m[r.account_id] || []).push(r); return m; }, {});
    const movBy = group(movs), allBy = group(allMovs), svcBy = group(svcs);
    const stBy = Object.fromEntries(stmts.map((s) => [s.account_id, s]));

    const totals = { stock: 0, total_ht: 0, in: 0, out: 0 };
    const out = accounts.map((a) => {
      const st = W.computeStatement(a, movBy[a.id] || [], svcBy[a.id] || [], period);
      const all = allBy[a.id] || [];
      const currentStock = all.reduce((s, m) => s + W.signedPallets(m), 0);
      const last = all.reduce((mx, m) => { const d = W.toISODate(m.movement_date); return d > mx ? d : mx; }, '');
      totals.stock += currentStock;
      totals.total_ht += st.total_ht;
      totals.in += st.stock.in;
      totals.out += st.stock.out;
      return {
        ...serializeAccount(a),
        current_stock: currentStock,
        last_movement_date: last || null,
        period_in: st.stock.in,
        period_out: st.stock.out,
        period_pallet_days: st.stock.pallet_days,
        period_total_ht: st.total_ht,
        period_partial: st.partial,
        statement: stBy[a.id] || null,
      };
    });
    totals.total_ht = W.round2(totals.total_ht);
    sendSuccess(res, { period, accounts: out, totals });
  } catch (err) {
    console.error('[warehousing/overview]', err);
    sendError(res, 'Données d’entreposage indisponibles', 500);
  }
});

// ============ GET /accounts/:id ============
router.get('/accounts/:id', verifyToken, requirePermission('warehousing.read'), async (req, res) => {
  try {
    const acc = await loadAccount(toInt(req.params.id));
    if (!acc) return sendError(res, 'Compte introuvable', 404);
    const all = await loadMovements(acc.id);
    const { balance } = W.runningBalances(all);
    sendSuccess(res, { ...serializeAccount(acc), current_stock: balance, movement_count: all.length });
  } catch (err) {
    console.error('[warehousing/account]', err);
    sendError(res, 'Erreur', 500);
  }
});

// ============ POST /accounts (oluştur / güncelle) ============
router.post('/accounts', verifyToken, requirePermission('warehousing.manage'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const body = req.body || {};
    const id = toInt(body.id);
    const data = accountRecord(body);
    if (!data.client_name) return sendError(res, 'Le client est obligatoire');

    await conn.beginTransaction();
    if (id) {
      const [ex] = await conn.execute('SELECT id FROM wh_accounts WHERE id = ? AND deleted_at IS NULL', [id]);
      if (!ex.length) { await conn.rollback(); return sendError(res, 'Compte introuvable', 404); }
      const cols = Object.keys(data);
      await conn.execute(
        `UPDATE wh_accounts SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`,
        [...cols.map((c) => data[c]), id]
      );
      await conn.commit();
      await logAudit(req, 'update', 'warehousing', id, data.client_name);
      return sendSuccess(res, { id, message: 'Compte mis à jour' });
    }

    data.created_by = req.user.id;
    const cols = Object.keys(data);
    const [r] = await conn.execute(
      `INSERT INTO wh_accounts (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => data[c])
    );
    const code = `DEP-${String(r.insertId).padStart(4, '0')}`;
    await conn.execute('UPDATE wh_accounts SET account_code = ? WHERE id = ?', [code, r.insertId]);
    await conn.commit();
    await logAudit(req, 'create', 'warehousing', r.insertId, `${code} ${data.client_name}`);
    sendSuccess(res, { id: r.insertId, account_code: code, message: 'Compte créé' });
  } catch (err) {
    try { await conn.rollback(); } catch (e) { /* yoksay */ }
    console.error('[warehousing/account-save]', err);
    sendError(res, 'Enregistrement impossible', 500);
  } finally {
    conn.release();
  }
});

// ============ DELETE /accounts/:id (soft) ============
router.delete('/accounts/:id', verifyToken, requirePermission('warehousing.delete'), async (req, res) => {
  try {
    const acc = await loadAccount(toInt(req.params.id));
    if (!acc) return sendError(res, 'Compte introuvable', 404);
    await pool.execute('UPDATE wh_accounts SET deleted_at = NOW() WHERE id = ?', [acc.id]);
    await logAudit(req, 'delete', 'warehousing', acc.id, `${acc.account_code} ${acc.client_name}`);
    sendSuccess(res, { message: 'Compte supprimé' });
  } catch (err) {
    console.error('[warehousing/account-delete]', err);
    sendError(res, 'Suppression impossible', 500);
  }
});

// ============ GET /accounts/:id/movements?from&to ============
// Bakiye TÜM hareketler üzerinden hesaplanır, filtre sonra uygulanır
router.get('/accounts/:id/movements', verifyToken, requirePermission('warehousing.read'), async (req, res) => {
  try {
    const acc = await loadAccount(toInt(req.params.id));
    if (!acc) return sendError(res, 'Compte introuvable', 404);
    const from = toNullableDate(req.query.from);
    const to = toNullableDate(req.query.to);
    const { rows, balance } = W.runningBalances(await loadMovements(acc.id));
    const filtered = rows.filter((r) => (!from || r.movement_date >= from) && (!to || r.movement_date <= to));
    sendSuccess(res, { balance, movements: filtered });
  } catch (err) {
    console.error('[warehousing/movements]', err);
    sendError(res, 'Erreur', 500);
  }
});

// ============ POST /accounts/:id/movements (oluştur / güncelle) ============
router.post('/accounts/:id/movements', verifyToken, requirePermission('warehousing.operate'), async (req, res) => {
  try {
    const acc = await loadAccount(toInt(req.params.id));
    if (!acc) return sendError(res, 'Compte introuvable', 404);
    const body = req.body || {};
    const mvId = toInt(body.id);

    const date = toNullableDate(body.movement_date);
    if (!date) return sendError(res, 'Date obligatoire');
    const direction = whitelist(sanitizeText(body.direction), DIRECTIONS, '');
    if (!direction) return sendError(res, 'Type de mouvement invalide');
    let pallets = toInt(body.pallets, 0);
    if (direction !== 'adjust') pallets = Math.abs(pallets);
    if (pallets === 0) return sendError(res, 'Le nombre de palettes doit être différent de zéro');

    const record = {
      movement_date: date,
      direction,
      pallets,
      packages: toNullableInt(body.packages),
      weight_kg: toNullableFloat(body.weight_kg),
      reference: sanitizeText(body.reference).slice(0, 120),
      product: sanitizeText(body.product).slice(0, 255),
      notes: sanitizeText(body.notes),
    };

    const all = await loadMovements(acc.id);
    let previous = null;
    if (mvId) {
      previous = all.find((m) => m.id === mvId);
      if (!previous) return sendError(res, 'Mouvement introuvable', 404);
      const lockOld = await lockedStatement(acc.id, W.toISODate(previous.movement_date));
      if (lockOld) return sendError(res, lockedMessage(lockOld, W.toISODate(previous.movement_date)), 409);
    }
    const lock = await lockedStatement(acc.id, date);
    if (lock) return sendError(res, lockedMessage(lock, date), 409);

    // Stok hiçbir gün sonunda eksiye düşemez (geriye dönük girişlerde de)
    const simulated = all.filter((m) => m.id !== mvId).concat([{ id: mvId || Number.MAX_SAFE_INTEGER, ...record }]);
    const { firstNegative } = W.runningBalances(simulated);
    if (firstNegative) {
      return sendError(res,
        `Stock insuffisant au ${fmtFr(firstNegative.date)} : le solde deviendrait ${firstNegative.balance} palette(s). Vérifiez les entrées antérieures.`,
        409);
    }

    if (mvId) {
      const cols = Object.keys(record);
      await pool.execute(
        `UPDATE wh_movements SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ? AND account_id = ?`,
        [...cols.map((c) => record[c]), mvId, acc.id]
      );
      await logAudit(req, 'update', 'warehousing', acc.id, `${acc.account_code} mvt #${mvId} ${direction} ${pallets}`);
      return sendSuccess(res, { id: mvId, message: 'Mouvement mis à jour' });
    }

    const full = { account_id: acc.id, ...record, created_by: req.user.id };
    const cols = Object.keys(full);
    const [r] = await pool.execute(
      `INSERT INTO wh_movements (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => full[c])
    );
    await logAudit(req, 'create', 'warehousing', acc.id, `${acc.account_code} ${direction} ${pallets} pal. ${date}`);
    sendSuccess(res, { id: r.insertId, message: 'Mouvement enregistré' });
  } catch (err) {
    console.error('[warehousing/movement-save]', err);
    sendError(res, 'Enregistrement impossible', 500);
  }
});

// ============ DELETE /movements/:id ============
router.delete('/movements/:id', verifyToken, requirePermission('warehousing.operate'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM wh_movements WHERE id = ? AND deleted_at IS NULL', [toInt(req.params.id)]);
    const mv = rows[0];
    if (!mv) return sendError(res, 'Mouvement introuvable', 404);
    const date = W.toISODate(mv.movement_date);
    const lock = await lockedStatement(mv.account_id, date);
    if (lock) return sendError(res, lockedMessage(lock, date), 409);

    const all = await loadMovements(mv.account_id);
    const { firstNegative } = W.runningBalances(all.filter((m) => m.id !== mv.id));
    if (firstNegative) {
      return sendError(res,
        `Suppression impossible : le stock deviendrait négatif au ${fmtFr(firstNegative.date)} (${firstNegative.balance} palette(s)).`,
        409);
    }
    await pool.execute('UPDATE wh_movements SET deleted_at = NOW() WHERE id = ?', [mv.id]);
    await logAudit(req, 'delete', 'warehousing', mv.account_id, `mvt #${mv.id} ${mv.direction} ${mv.pallets} ${date}`);
    sendSuccess(res, { message: 'Mouvement supprimé' });
  } catch (err) {
    console.error('[warehousing/movement-delete]', err);
    sendError(res, 'Suppression impossible', 500);
  }
});

// ============ GET /accounts/:id/services?from&to ============
router.get('/accounts/:id/services', verifyToken, requirePermission('warehousing.read'), async (req, res) => {
  try {
    const acc = await loadAccount(toInt(req.params.id));
    if (!acc) return sendError(res, 'Compte introuvable', 404);
    const from = toNullableDate(req.query.from) || '1900-01-01';
    const to = toNullableDate(req.query.to) || '2999-12-31';
    const rows = await loadServices(acc.id, from, to);
    sendSuccess(res, rows.map((r) => ({
      ...r,
      service_date: W.toISODate(r.service_date),
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
      amount: W.round2(Number(r.quantity) * Number(r.unit_price)),
    })));
  } catch (err) {
    console.error('[warehousing/services]', err);
    sendError(res, 'Erreur', 500);
  }
});

// ============ POST /accounts/:id/services (oluştur / güncelle) ============
router.post('/accounts/:id/services', verifyToken, requirePermission('warehousing.operate'), async (req, res) => {
  try {
    const acc = await loadAccount(toInt(req.params.id));
    if (!acc) return sendError(res, 'Compte introuvable', 404);
    const body = req.body || {};
    const svId = toInt(body.id);

    const date = toNullableDate(body.service_date);
    if (!date) return sendError(res, 'Date obligatoire');
    const type = whitelist(sanitizeText(body.service_type), Object.keys(W.SERVICE_TYPES), '');
    if (!type) return sendError(res, 'Type de prestation invalide');
    const quantity = toFloat(body.quantity);
    if (!(quantity > 0)) return sendError(res, 'La quantité doit être supérieure à zéro');
    const label = sanitizeText(body.label).slice(0, 255);
    if (type === 'custom' && !label) return sendError(res, 'Libellé obligatoire pour une prestation personnalisée');

    // Birim fiyat girilmemişse sözleşme tarifesinden
    const def = W.SERVICE_TYPES[type];
    let unitPrice = toNullableFloat(body.unit_price);
    if (unitPrice === null) unitPrice = def.rateCol ? Number(acc[def.rateCol]) || 0 : 0;

    const record = {
      service_date: date,
      service_type: type,
      label,
      unit: sanitizeText(body.unit).slice(0, 50),
      quantity,
      unit_price: Math.max(0, unitPrice),
      reference: sanitizeText(body.reference).slice(0, 120),
      notes: sanitizeText(body.notes),
    };

    if (svId) {
      const [ex] = await pool.execute('SELECT * FROM wh_services WHERE id = ? AND account_id = ? AND deleted_at IS NULL', [svId, acc.id]);
      if (!ex.length) return sendError(res, 'Prestation introuvable', 404);
      const lockOld = await lockedStatement(acc.id, W.toISODate(ex[0].service_date));
      if (lockOld) return sendError(res, lockedMessage(lockOld, W.toISODate(ex[0].service_date)), 409);
    }
    const lock = await lockedStatement(acc.id, date);
    if (lock) return sendError(res, lockedMessage(lock, date), 409);

    if (svId) {
      const cols = Object.keys(record);
      await pool.execute(
        `UPDATE wh_services SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`,
        [...cols.map((c) => record[c]), svId]
      );
      await logAudit(req, 'update', 'warehousing', acc.id, `${acc.account_code} prestation #${svId}`);
      return sendSuccess(res, { id: svId, message: 'Prestation mise à jour' });
    }
    const full = { account_id: acc.id, ...record, created_by: req.user.id };
    const cols = Object.keys(full);
    const [r] = await pool.execute(
      `INSERT INTO wh_services (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => full[c])
    );
    await logAudit(req, 'create', 'warehousing', acc.id, `${acc.account_code} ${type} x${quantity} ${date}`);
    sendSuccess(res, { id: r.insertId, message: 'Prestation enregistrée' });
  } catch (err) {
    console.error('[warehousing/service-save]', err);
    sendError(res, 'Enregistrement impossible', 500);
  }
});

// ============ DELETE /services/:id ============
router.delete('/services/:id', verifyToken, requirePermission('warehousing.operate'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM wh_services WHERE id = ? AND deleted_at IS NULL', [toInt(req.params.id)]);
    const sv = rows[0];
    if (!sv) return sendError(res, 'Prestation introuvable', 404);
    const date = W.toISODate(sv.service_date);
    const lock = await lockedStatement(sv.account_id, date);
    if (lock) return sendError(res, lockedMessage(lock, date), 409);
    await pool.execute('UPDATE wh_services SET deleted_at = NOW() WHERE id = ?', [sv.id]);
    await logAudit(req, 'delete', 'warehousing', sv.account_id, `prestation #${sv.id} ${sv.service_type} ${date}`);
    sendSuccess(res, { message: 'Prestation supprimée' });
  } catch (err) {
    console.error('[warehousing/service-delete]', err);
    sendError(res, 'Suppression impossible', 500);
  }
});

/** Canlı döküm hesabı (rota ve PDF ortak) */
async function buildStatement(acc, period) {
  const { start, end } = W.periodBounds(period);
  const movements = await loadMovements(acc.id, end);
  const services = await loadServices(acc.id, start, end);
  return W.computeStatement(acc, movements, services, period);
}

// ============ GET /accounts/:id/statement?period=YYYY-MM ============
// Kapatılmış (issued/paid) dönemde donmuş kopya döner; aksi halde canlı hesap
router.get('/accounts/:id/statement', verifyToken, requirePermission('warehousing.read'), async (req, res) => {
  try {
    const acc = await loadAccount(toInt(req.params.id));
    if (!acc) return sendError(res, 'Compte introuvable', 404);
    const period = W.isValidPeriod(req.query.period) ? req.query.period : currentPeriod();
    const [saved] = await pool.execute('SELECT * FROM wh_statements WHERE account_id = ? AND period = ? LIMIT 1', [acc.id, period]);
    const record = saved[0] || null;
    const live = await buildStatement(acc, period);
    let data = live;
    let source = 'live';
    if (record && record.status !== 'draft' && record.snapshot) {
      try { data = JSON.parse(record.snapshot); source = 'snapshot'; } catch (e) { /* bozuksa canlı */ }
    }
    const { snapshot, ...recordMeta } = record || {};
    sendSuccess(res, {
      ...data,
      source,
      statement_no: record ? record.statement_no : W.statementNumber(acc, period),
      record: record ? recordMeta : null,
      // Donmuş kopya ile canlı hesap farklıysa uyarı (kapanıştan sonra değişen tarife vb.)
      live_total_ht: live.total_ht,
    });
  } catch (err) {
    console.error('[warehousing/statement]', err);
    sendError(res, 'Calcul du relevé impossible', 500);
  }
});

// ============ GET /accounts/:id/statements ============
router.get('/accounts/:id/statements', verifyToken, requirePermission('warehousing.read'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, account_id, period, statement_no, status, total_ht, total_vat, total_ttc, currency_code,
              invoice_no, issued_at, paid_at, created_at, updated_at
       FROM wh_statements WHERE account_id = ? ORDER BY period DESC`,
      [toInt(req.params.id)]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[warehousing/statements]', err);
    sendError(res, 'Erreur', 500);
  }
});

// ============ POST /accounts/:id/statements {period} — ayı kapat (taslak kopya) ============
router.post('/accounts/:id/statements', verifyToken, requirePermission('warehousing.manage'), async (req, res) => {
  try {
    const acc = await loadAccount(toInt(req.params.id));
    if (!acc) return sendError(res, 'Compte introuvable', 404);
    const period = sanitizeText((req.body || {}).period);
    if (!W.isValidPeriod(period)) return sendError(res, 'Période invalide (AAAA-MM)');

    const [ex] = await pool.execute('SELECT * FROM wh_statements WHERE account_id = ? AND period = ? LIMIT 1', [acc.id, period]);
    if (ex[0] && ex[0].status !== 'draft') {
      return sendError(res, `Le relevé ${ex[0].statement_no} est déjà ${ex[0].status === 'paid' ? 'payé' : 'émis'} — repassez-le en brouillon pour le recalculer.`, 409);
    }
    const st = await buildStatement(acc, period);
    const snapshot = JSON.stringify({ ...st, account: serializeAccount(acc), closed_at: new Date().toISOString() });
    const no = W.statementNumber(acc, period);

    if (ex[0]) {
      await pool.execute(
        `UPDATE wh_statements SET snapshot = ?, total_ht = ?, total_vat = ?, total_ttc = ?, currency_code = ?, statement_no = ? WHERE id = ?`,
        [snapshot, st.total_ht, st.total_vat, st.total_ttc, st.currency, no, ex[0].id]
      );
      await logAudit(req, 'update', 'warehousing', acc.id, `${no} recalculé`);
      return sendSuccess(res, { id: ex[0].id, statement_no: no, message: 'Relevé recalculé' });
    }
    const [r] = await pool.execute(
      `INSERT INTO wh_statements (account_id, period, statement_no, status, snapshot, total_ht, total_vat, total_ttc, currency_code, created_by)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      [acc.id, period, no, snapshot, st.total_ht, st.total_vat, st.total_ttc, st.currency, req.user.id]
    );
    await logAudit(req, 'create', 'warehousing', acc.id, `${no} clôture`);
    sendSuccess(res, { id: r.insertId, statement_no: no, message: 'Mois clôturé (brouillon)' });
  } catch (err) {
    console.error('[warehousing/statement-close]', err);
    sendError(res, 'Clôture impossible', 500);
  }
});

// ============ POST /statements/:id/status {status, invoice_no} ============
router.post('/statements/:id/status', verifyToken, requirePermission('warehousing.manage'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM wh_statements WHERE id = ?', [toInt(req.params.id)]);
    const st = rows[0];
    if (!st) return sendError(res, 'Relevé introuvable', 404);
    const body = req.body || {};
    const status = whitelist(sanitizeText(body.status), STATEMENT_STATUS, '');
    if (!status) return sendError(res, 'Statut invalide');

    // Emise geçerken döküm son hesapla dondurulur
    let snapshotSql = '';
    const params = [];
    if (status !== 'draft' && st.status === 'draft') {
      const acc = await loadAccount(st.account_id);
      if (acc) {
        const fresh = await buildStatement(acc, st.period);
        snapshotSql = ', snapshot = ?, total_ht = ?, total_vat = ?, total_ttc = ?';
        params.push(JSON.stringify({ ...fresh, account: serializeAccount(acc), closed_at: new Date().toISOString() }),
          fresh.total_ht, fresh.total_vat, fresh.total_ttc);
      }
    }
    const issuedAt = status === 'draft' ? null : (st.issued_at || new Date());
    const paidAt = status === 'paid' ? (st.paid_at || new Date()) : null;
    const invoiceNo = body.invoice_no !== undefined ? sanitizeText(body.invoice_no).slice(0, 80) : st.invoice_no;
    await pool.execute(
      `UPDATE wh_statements SET status = ?, issued_at = ?, paid_at = ?, invoice_no = ?${snapshotSql} WHERE id = ?`,
      [status, issuedAt, paidAt, invoiceNo, ...params, st.id]
    );
    await logAudit(req, 'update', 'warehousing', st.account_id, `${st.statement_no} → ${status}`);
    sendSuccess(res, { message: 'Statut mis à jour' });
  } catch (err) {
    console.error('[warehousing/statement-status]', err);
    sendError(res, 'Mise à jour impossible', 500);
  }
});

// ============ DELETE /statements/:id (yalnızca taslak) ============
router.delete('/statements/:id', verifyToken, requirePermission('warehousing.manage'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM wh_statements WHERE id = ?', [toInt(req.params.id)]);
    const st = rows[0];
    if (!st) return sendError(res, 'Relevé introuvable', 404);
    if (st.status !== 'draft') return sendError(res, 'Seul un brouillon peut être supprimé', 409);
    await pool.execute('DELETE FROM wh_statements WHERE id = ?', [st.id]);
    await logAudit(req, 'delete', 'warehousing', st.account_id, `${st.statement_no} brouillon supprimé`);
    sendSuccess(res, { message: 'Brouillon supprimé' });
  } catch (err) {
    console.error('[warehousing/statement-delete]', err);
    sendError(res, 'Suppression impossible', 500);
  }
});

module.exports = router;
module.exports.buildStatement = buildStatement;
module.exports.loadAccount = loadAccount;
