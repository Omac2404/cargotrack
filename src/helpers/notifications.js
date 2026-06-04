const { pool } = require('../config/database');

/**
 * Bir kullanıcıya in-app bildirim oluşturur (fire-and-forget).
 *
 * @param {object} opts
 * @param {number} opts.userId
 * @param {string} opts.type - 'shipment_status' | 'assignment_new' | 'transit_expiry' | 'document_missing' | 'info'
 * @param {string} opts.title - Kısa başlık
 * @param {string} [opts.body] - Detay (opsiyonel)
 * @param {string} [opts.link] - Tıklayınca gidilecek frontend path (örn: '/shipments/karayolu/123/edit')
 * @param {string} [opts.entityType] - 'shipments' | 'partners' | 'assignments' vs.
 * @param {number} [opts.entityId]
 */
async function notify({ userId, type, title, body, link, entityType, entityId }) {
  if (!userId || !type || !title) return null;
  try {
    const [result] = await pool.execute(
      `INSERT INTO notifications (user_id, type, title, body, link, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, title, body || null, link || null, entityType || null, entityId || null]
    );
    return result.insertId;
  } catch (err) {
    console.warn('[notify] failed:', err.message);
    return null;
  }
}

/** Birden fazla kullanıcıya aynı bildirimi gönder */
async function notifyMany(userIds, opts) {
  for (const uid of userIds) {
    await notify({ ...opts, userId: uid });
  }
}

/** Admin+ rolündeki tüm kullanıcılara bildirim */
async function notifyAdmins(opts) {
  try {
    const [rows] = await pool.execute(
      "SELECT id FROM users WHERE role IN ('admin','super_admin') AND status = 'active'"
    );
    for (const r of rows) {
      await notify({ ...opts, userId: r.id });
    }
  } catch (err) {
    console.warn('[notifyAdmins] failed:', err.message);
  }
}

module.exports = { notify, notifyMany, notifyAdmins };
