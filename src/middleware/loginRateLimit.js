const { pool } = require('../config/database');
const { sendError } = require('../helpers/utils');

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;

/**
 * IP başına son 15 dakikada başarısız login denemesi sayısını kontrol eder.
 * MAX_ATTEMPTS aşıldığında 429 döndürür.
 */
async function loginRateLimit(req, res, next) {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
    if (!ip) return next();

    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS c FROM login_attempts
       WHERE ip_address = ? AND success = 0
       AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [ip, WINDOW_MINUTES]
    );
    const failures = rows[0].c || 0;

    if (failures >= MAX_ATTEMPTS) {
      return sendError(
        res,
        `Çok fazla başarısız deneme. ${WINDOW_MINUTES} dakika sonra tekrar deneyin.`,
        429
      );
    }
    next();
  } catch (err) {
    // Hata durumunda akışı kesme
    console.warn('[loginRateLimit]', err.message);
    next();
  }
}

async function recordLoginAttempt(req, username, success) {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim().slice(0, 45);
    await pool.execute(
      'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)',
      [String(username || '').slice(0, 100), ip, success ? 1 : 0]
    );
  } catch (err) {
    console.warn('[recordLoginAttempt]', err.message);
  }
}

module.exports = { loginRateLimit, recordLoginAttempt };
