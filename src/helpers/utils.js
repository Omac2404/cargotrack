function sanitizeText(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function sanitizeEmail(val) {
  const s = sanitizeText(val);
  if (!s) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : '';
}

function toInt(val, fallback = 0) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toFloat(val, fallback = 0) {
  if (val === '' || val === null || val === undefined) return fallback;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

function toNullableInt(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
}

function toNullableFloat(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

function toNullableDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  // YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  return null;
}

function toBool01(val) {
  if (val === true || val === 1 || val === '1' || val === 'true') return 1;
  return 0;
}

function jsonStringifyOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'string') {
    // Eğer zaten JSON string ise olduğu gibi sakla
    try {
      JSON.parse(val);
      return val;
    } catch (e) {
      return JSON.stringify(val);
    }
  }
  return JSON.stringify(val);
}

function whitelist(val, allowed, fallback) {
  return allowed.includes(val) ? val : fallback;
}

// Yanıt yardımcıları (WP'nin wp_send_json_success/_error karşılıkları)
function sendSuccess(res, data = {}) {
  res.json({ success: true, data });
}

function sendError(res, message, status = 400, extra = {}) {
  res.status(status).json({ success: false, data: { message, ...extra } });
}

module.exports = {
  sanitizeText,
  sanitizeEmail,
  toInt,
  toFloat,
  toNullableInt,
  toNullableFloat,
  toNullableDate,
  toBool01,
  jsonStringifyOrNull,
  whitelist,
  sendSuccess,
  sendError
};
