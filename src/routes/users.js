const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const {
  sanitizeText, sanitizeEmail, toInt, whitelist, sendSuccess, sendError
} = require('../helpers/utils');

const router = express.Router();

const VALID_ROLES = ['super_admin', 'admin', 'user'];
const VALID_STATUS = ['active', 'inactive'];

// Tüm route'lar super_admin yetkisi gerektirir
router.use(verifyToken, requireRole('super_admin'));

// ============ GET /api/users ============
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, full_name, email, role, status, created_at, last_login
       FROM users ORDER BY created_at DESC`
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[users/list]', err);
    sendError(res, 'Kullanıcılar alınamadı', 500);
  }
});

// ============ POST /api/users (create / update) ============
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const userId = toInt(body.user_id);
    const username = sanitizeText(body.username);
    const fullName = sanitizeText(body.full_name);
    const email = sanitizeEmail(body.email);
    const role = whitelist(sanitizeText(body.role), VALID_ROLES, 'admin');
    const status = whitelist(sanitizeText(body.status), VALID_STATUS, 'active');
    const password = String(body.password || '');

    if (!fullName) return sendError(res, 'Ad Soyad zorunludur');

    if (userId) {
      // UPDATE
      const data = { full_name: fullName, email, role, status };
      if (password) data.password = bcrypt.hashSync(password, 10);

      const cols = Object.keys(data);
      const setClause = cols.map(c => `\`${c}\` = ?`).join(', ');
      await pool.execute(
        `UPDATE users SET ${setClause} WHERE id = ?`,
        [...cols.map(c => data[c]), userId]
      );
      await logAudit(req, 'update', 'users', userId, fullName);
      return sendSuccess(res, { id: userId, message: 'Kullanıcı güncellendi' });
    }

    // INSERT
    if (!username || !password) {
      return sendError(res, 'Kullanıcı adı ve şifre zorunludur');
    }
    const [existing] = await pool.execute(
      'SELECT COUNT(*) AS c FROM users WHERE username = ?',
      [username]
    );
    if (existing[0].c > 0) {
      return sendError(res, 'Bu kullanıcı adı zaten mevcut!');
    }

    const hash = bcrypt.hashSync(password, 10);
    const [result] = await pool.execute(
      `INSERT INTO users (username, password, full_name, email, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, hash, fullName, email, role, status]
    );
    await logAudit(req, 'create', 'users', result.insertId, username);
    sendSuccess(res, { id: result.insertId, message: 'Kullanıcı eklendi' });
  } catch (err) {
    console.error('[users/save]', err);
    sendError(res, 'Kayıt sırasında hata: ' + err.message, 500);
  }
});

// ============ DELETE /api/users/:id ============
router.delete('/:id', async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 'Geçersiz ID');
    if (id === req.user.id) {
      return sendError(res, 'Kendi hesabınızı silemezsiniz!');
    }

    // RESTRICT yok — created_by ON DELETE SET NULL ayarlandı (kullanıcı silinince referanslar null olur)
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) return sendError(res, 'Kullanıcı bulunamadı', 404);
    await logAudit(req, 'delete', 'users', id);
    sendSuccess(res, { message: 'Kullanıcı silindi' });
  } catch (err) {
    console.error('[users/delete]', err);
    sendError(res, 'Silme sırasında hata: ' + err.message, 500);
  }
});

module.exports = router;
