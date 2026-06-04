const { pool } = require('../config/database');

/**
 * Audit log kaydı — fire-and-forget (await edilmesi gerekmiyor, hata sessizce yutuluyor)
 *
 * @param {object} req - Express request (user ve IP için)
 * @param {string} action - create|update|delete|login|logout|upload|download
 * @param {string} entityType - users|shipments|partners|warehouses|vehicles|assignments|documents
 * @param {number|null} entityId
 * @param {string|null} entityLabel - insan-okunabilir tanımlayıcı (shipment_no, plaka, vb)
 * @param {object|null} changes - değişiklik özeti ({ before, after } veya yeni veri)
 */
async function logAudit(req, action, entityType, entityId, entityLabel = null, changes = null) {
  try {
    const userId = req?.user?.id || null;
    const username = req?.user?.username || null;
    const ip = (req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '').toString().split(',')[0].trim().slice(0, 45);
    const ua = (req?.headers?.['user-agent'] || '').toString().slice(0, 255);

    await pool.execute(
      `INSERT INTO audit_log
       (user_id, username, action, entity_type, entity_id, entity_label, changes, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, action, entityType, entityId, entityLabel,
       changes ? JSON.stringify(changes) : null, ip, ua]
    );
  } catch (err) {
    console.warn('[audit] log failed:', err.message);
  }
}

async function getAuditLog({ entityType, entityId, userId, limit = 100, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (entityType) { where.push('entity_type = ?'); params.push(entityType); }
  if (entityId) { where.push('entity_id = ?'); params.push(entityId); }
  if (userId) { where.push('user_id = ?'); params.push(userId); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // mysql2 LIMIT/OFFSET prepared statement bug — integer'ları inline yaz (sanitize edildi)
  const safeLimit = Math.min(1000, Math.max(1, parseInt(limit, 10) || 100));
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

  const [rows] = await pool.execute(
    `SELECT id, user_id, username, action, entity_type, entity_id, entity_label,
            changes, ip_address, created_at
     FROM audit_log ${whereSql}
     ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );
  return rows;
}

module.exports = { logAudit, getAuditLog };
