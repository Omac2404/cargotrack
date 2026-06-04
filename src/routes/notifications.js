const express = require('express');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { toInt, sendSuccess, sendError } = require('../helpers/utils');

const router = express.Router();

// GET /api/notifications?unread=1&limit=50
router.get('/', verifyToken, async (req, res) => {
  try {
    const unread = req.query.unread === '1';
    const safeLimit = Math.min(100, Math.max(1, toInt(req.query.limit) || 50));
    const where = unread ? 'user_id = ? AND read_at IS NULL' : 'user_id = ?';
    const [rows] = await pool.execute(
      `SELECT id, type, title, body, link, entity_type, entity_id, read_at, created_at
       FROM notifications WHERE ${where}
       ORDER BY created_at DESC LIMIT ${safeLimit}`,
      [req.user.id]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[notifications/list]', err);
    sendError(res, 'Bildirimler alınamadı', 500);
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [req.user.id]
    );
    sendSuccess(res, { count: parseInt(rows[0].c || 0, 10) });
  } catch (err) {
    console.error('[notifications/unread]', err);
    sendError(res, 'Hata', 500);
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');
    await pool.execute(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL',
      [id, req.user.id]
    );
    sendSuccess(res, { message: 'Okundu' });
  } catch (err) {
    console.error('[notifications/read]', err);
    sendError(res, 'Hata', 500);
  }
});

// POST /api/notifications/read-all — tüm okunmamışları okundu işaretle
router.post('/read-all', verifyToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
      [req.user.id]
    );
    sendSuccess(res, { affected: result.affectedRows, message: 'Tümü okundu işaretlendi' });
  } catch (err) {
    console.error('[notifications/read-all]', err);
    sendError(res, 'Hata', 500);
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');
    await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    sendSuccess(res, { message: 'Silindi' });
  } catch (err) {
    console.error('[notifications/delete]', err);
    sendError(res, 'Hata', 500);
  }
});

module.exports = router;
