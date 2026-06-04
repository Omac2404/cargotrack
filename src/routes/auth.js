const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { signToken, verifyToken } = require('../middleware/auth');
const { loginRateLimit, recordLoginAttempt } = require('../middleware/loginRateLimit');
const { logAudit } = require('../helpers/audit');
const { sanitizeText, sendSuccess, sendError } = require('../helpers/utils');

const router = express.Router();

// POST /api/auth/login (rate-limited)
router.post('/login', loginRateLimit, async (req, res) => {
  const username = sanitizeText(req.body.username);
  const password = String(req.body.password || '');
  try {
    if (!username || !password) {
      await recordLoginAttempt(req, username, false);
      return sendError(res, 'Kullanıcı adı ve şifre gereklidir');
    }

    const [rows] = await pool.execute(
      'SELECT id, username, password, full_name, email, role, status, permissions, must_change_password FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (rows.length === 0) {
      await recordLoginAttempt(req, username, false);
      return sendError(res, 'Geçersiz kullanıcı adı veya şifre', 401);
    }

    const user = rows[0];
    if (user.status !== 'active') {
      await recordLoginAttempt(req, username, false);
      return sendError(res, 'Hesabınız devre dışı bırakılmış', 403);
    }

    if (!bcrypt.compareSync(password, user.password)) {
      await recordLoginAttempt(req, username, false);
      return sendError(res, 'Geçersiz kullanıcı adı veya şifre', 401);
    }

    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    await recordLoginAttempt(req, username, true);

    const token = signToken(user);
    // Audit log - user context'i manuel set ediyoruz
    req.user = { id: user.id, username: user.username };
    await logAudit(req, 'login', 'users', user.id, user.username);

    // Efektif izinler — frontend gating için
    const { getEffectivePermissions } = require('../config/permissions');
    const effectivePermissions = getEffectivePermissions({
      role: user.role,
      permissions: typeof user.permissions === 'string'
        ? (() => { try { return JSON.parse(user.permissions); } catch { return null; } })()
        : user.permissions,
    });

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        permissions: effectivePermissions,
        must_change_password: Number(user.must_change_password) === 1,
      }
    });
  } catch (err) {
    console.error('[auth/login]', err);
    sendError(res, 'Giriş sırasında hata oluştu', 500);
  }
});

// POST /api/auth/logout — JWT stateless, sadece frontend token siler + audit
router.post('/logout', verifyToken, async (req, res) => {
  await logAudit(req, 'logout', 'users', req.user.id, req.user.username);
  sendSuccess(res, { message: 'Çıkış yapıldı' });
});

// POST /api/auth/change-password — kullanıcı kendi şifresini değiştirir
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const currentPassword = String(req.body.current_password || '');
    const newPassword = String(req.body.new_password || '');
    if (!currentPassword || !newPassword) {
      return sendError(res, 'Mevcut ve yeni şifre zorunludur');
    }

    // Production-grade şifre kuvvet kontrolü (helpers/password-strength.js)
    const { validatePassword } = require('../helpers/password-strength');
    const v = validatePassword(newPassword, { username: req.user.username });
    if (!v.ok) {
      return sendError(res, v.errors[0]); // ilk hata mesajı (en kritik)
    }

    const [rows] = await pool.execute('SELECT password FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (rows.length === 0) return sendError(res, 'Kullanıcı bulunamadı', 404);

    if (!bcrypt.compareSync(currentPassword, rows[0].password)) {
      return sendError(res, 'Mevcut şifre hatalı', 401);
    }

    // Yeni şifre eskisiyle aynı olamaz
    if (bcrypt.compareSync(newPassword, rows[0].password)) {
      return sendError(res, 'Yeni şifre eskisiyle aynı olamaz');
    }

    const isProd = process.env.NODE_ENV === 'production';
    const hash = bcrypt.hashSync(newPassword, isProd ? 12 : 10);
    // must_change_password flag'ını da sıfırla (varsayılan şifreyi değiştirdi)
    await pool.execute('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [hash, req.user.id]);
    sendSuccess(res, { message: 'Şifre güncellendi' });
  } catch (err) {
    console.error('[auth/change-password]', err);
    sendError(res, 'Şifre değiştirme sırasında hata', 500);
  }
});

// GET /api/auth/me — mevcut oturum bilgisi (efektif izinlerle)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, full_name, email, role, status, permissions, must_change_password FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (rows.length === 0) return sendError(res, 'Kullanıcı bulunamadı', 404);
    const u = rows[0];
    const { getEffectivePermissions } = require('../config/permissions');
    const overridePerms = typeof u.permissions === 'string'
      ? (() => { try { return JSON.parse(u.permissions); } catch { return null; } })()
      : u.permissions;
    const effectivePermissions = getEffectivePermissions({ role: u.role, permissions: overridePerms });
    sendSuccess(res, {
      user: {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        status: u.status,
        permissions: effectivePermissions,
        must_change_password: Number(u.must_change_password) === 1,
      },
    });
  } catch (err) {
    console.error('[auth/me]', err);
    sendError(res, 'Hata', 500);
  }
});

// GET /api/auth/permissions — tüm permission anahtarları + insan-okunabilir etiketler
// (Kullanıcı yönetim UI'sı için — kim hangi yetkiyi alacak listesi)
router.get('/permissions', verifyToken, async (req, res) => {
  const { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } = require('../config/permissions');
  sendSuccess(res, {
    all: PERMISSIONS,
    roles: DEFAULT_ROLE_PERMISSIONS,
  });
});

module.exports = router;
