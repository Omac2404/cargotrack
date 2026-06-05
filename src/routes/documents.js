const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const { toInt, sanitizeText, sendSuccess, sendError } = require('../helpers/utils');

const router = express.Router();

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));
const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

// Multer: önce memory'e al, validasyondan sonra diske yaz
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

function sanitizeDocKey(s) {
  // sadece harf/rakam/_/- izin ver — path traversal koruması
  return String(s || '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64);
}

function sanitizeFilename(s) {
  return String(s || '').replace(/[\/\\\0]/g, '_').replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 200);
}

// ============ POST /api/documents/upload ============
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const shipmentId = toInt(req.body.shipment_id);
    const docKey = sanitizeDocKey(req.body.doc_key);
    if (!shipmentId || !docKey) return sendError(res, 'Eksik parametre');
    if (!req.file) return sendError(res, 'Dosya seçilmedi');

    const origName = sanitizeFilename(req.file.originalname);
    const ext = path.extname(origName).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return sendError(res, 'Desteklenmeyen dosya türü');
    }

    // Shipment var mı?
    const [rows] = await pool.execute(
      'SELECT id, documents_data FROM shipments WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [shipmentId]
    );
    if (rows.length === 0) return sendError(res, 'Sevkiyat bulunamadı', 404);

    // Klasör oluştur — uploads/{shipment_id}/
    const dir = path.join(UPLOAD_ROOT, String(shipmentId));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Dosya adı: doc_key_timestamp.ext
    const filename = `${docKey}_${Date.now()}${ext}`;
    const filepath = path.join(dir, filename);

    // Realpath kontrolü — path traversal koruması
    const resolvedDir = path.resolve(UPLOAD_ROOT);
    const resolvedFile = path.resolve(filepath);
    if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
      return sendError(res, 'Geçersiz dosya yolu', 400);
    }

    fs.writeFileSync(filepath, req.file.buffer);

    // documents_data güncelle (versiyonlama: önceki sürümü versions[]'a taşı)
    let docs = {};
    if (rows[0].documents_data) {
      try { docs = JSON.parse(rows[0].documents_data) || {}; }
      catch (e) { docs = {}; }
    }
    const previous = docs[docKey];
    const previousVersions = (previous && Array.isArray(previous.versions)) ? previous.versions : [];
    // Eski current'ı versiyon listesinin başına taşı
    if (previous && previous.stored_name) {
      previousVersions.unshift({
        filename: previous.filename,
        stored_name: previous.stored_name,
        uploaded_at: previous.uploaded_at,
        uploaded_by: previous.uploaded_by || null,
      });
    }
    docs[docKey] = {
      filename: origName,
      stored_name: filename,
      uploaded_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      uploaded_by: req.user?.username || null,
      status: (previous && previous.status) || 'uploaded',
      stages: (previous && previous.stages) || {},
      versions: previousVersions.slice(0, 20), // max 20 versiyon tut
    };

    await pool.execute(
      'UPDATE shipments SET documents_data = ? WHERE id = ?',
      [JSON.stringify(docs), shipmentId]
    );

    await logAudit(req, 'upload', 'documents', shipmentId, `${docKey}/${origName}`);
    sendSuccess(res, {
      message: 'Yüklendi',
      filename: origName,
      download_url: `/api/documents/${shipmentId}/${docKey}`
    });
  } catch (err) {
    console.error('[documents/upload]', err);
    sendError(res, 'Yükleme hatası: ' + err.message, 500);
  }
});

/**
 * Token middleware — Bearer header VEYA ?token=... query param destekler.
 * <a href="..."> ile direkt indirme için query param gerekli.
 */
function verifyTokenFlexible(req, res, next) {
  // Önce header
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  // Header yoksa query'ye bak
  if (!token && req.query.token) token = String(req.query.token);
  if (!token) return sendError(res, 'Oturum bulunamadı', 401);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return sendError(res, 'Geçersiz oturum', 401);
  }
}

/** Yardımcı: shipment'in documents_data'sından belirli docKey+version dosyasını çek. */
async function resolveDocFile(shipmentId, docKey, version) {
  const [rows] = await pool.execute(
    'SELECT documents_data FROM shipments WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [shipmentId]
  );
  if (rows.length === 0) return { error: 'Sevkiyat bulunamadı', code: 404 };

  let docs = {};
  if (rows[0].documents_data) {
    try { docs = JSON.parse(rows[0].documents_data) || {}; }
    catch (e) { docs = {}; }
  }
  const doc = docs[docKey];
  if (!doc) return { error: 'Belge bulunamadı', code: 404 };

  // version=0 (default) = current, version>=1 = versions[version-1]
  let entry;
  if (version > 0) {
    const versions = Array.isArray(doc.versions) ? doc.versions : [];
    entry = versions[version - 1];
    if (!entry) return { error: 'Versiyon bulunamadı', code: 404 };
  } else {
    entry = doc;
  }
  if (!entry.stored_name) return { error: 'Belge bulunamadı', code: 404 };

  const filepath = path.join(UPLOAD_ROOT, String(shipmentId), entry.stored_name);
  const resolvedDir = path.resolve(UPLOAD_ROOT);
  const resolvedFile = path.resolve(filepath);
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    return { error: 'Geçersiz yol', code: 400 };
  }
  if (!fs.existsSync(filepath)) return { error: 'Dosya diskte bulunamadı', code: 404 };

  return { filepath, filename: entry.filename || entry.stored_name, entry };
}

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// ============ GET /api/documents/:shipmentId/:docKey?version=N&inline=1 ============
// version (default 0 = current). inline=1 → preview için iframe-friendly (Content-Disposition: inline)
router.get('/:shipmentId/:docKey', verifyTokenFlexible, async (req, res) => {
  try {
    const shipmentId = toInt(req.params.shipmentId);
    const docKey = sanitizeDocKey(req.params.docKey);
    const version = Math.max(0, toInt(req.query.version) || 0);
    const inline = String(req.query.inline || '') === '1';
    if (!shipmentId || !docKey) return sendError(res, 'Eksik parametre');

    const r = await resolveDocFile(shipmentId, docKey, version);
    if (r.error) return sendError(res, r.error, r.code);

    const ext = path.extname(r.filename).toLowerCase();
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';

    await logAudit(req, 'download', 'documents', shipmentId,
      `${docKey}${version > 0 ? `/v${version}` : ''}/${r.filename}`);

    if (inline) {
      // Preview için: iframe/img tag'da gösterilecek
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(r.filename)}"`);
      res.sendFile(r.filepath);
    } else {
      res.download(r.filepath, r.filename);
    }
  } catch (err) {
    console.error('[documents/download]', err);
    sendError(res, 'İndirme hatası: ' + err.message, 500);
  }
});

// ============ GET /api/documents/:shipmentId/:docKey/versions (sadece liste — meta) ============
router.get('/:shipmentId/:docKey/versions', verifyToken, async (req, res) => {
  try {
    const shipmentId = toInt(req.params.shipmentId);
    const docKey = sanitizeDocKey(req.params.docKey);
    if (!shipmentId || !docKey) return sendError(res, 'Eksik parametre');

    const [rows] = await pool.execute(
      'SELECT documents_data FROM shipments WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [shipmentId]
    );
    if (rows.length === 0) return sendError(res, 'Sevkiyat bulunamadı', 404);
    let docs = {};
    if (rows[0].documents_data) {
      try { docs = JSON.parse(rows[0].documents_data) || {}; } catch { docs = {}; }
    }
    const doc = docs[docKey];
    if (!doc) return sendSuccess(res, { current: null, versions: [] });

    sendSuccess(res, {
      current: {
        filename: doc.filename,
        uploaded_at: doc.uploaded_at,
        uploaded_by: doc.uploaded_by || null,
      },
      versions: Array.isArray(doc.versions)
        ? doc.versions.map((v, i) => ({
            version: i + 1,
            filename: v.filename,
            uploaded_at: v.uploaded_at,
            uploaded_by: v.uploaded_by || null,
          }))
        : [],
    });
  } catch (err) {
    console.error('[documents/versions]', err);
    sendError(res, 'Hata', 500);
  }
});

// ============ POST /api/documents/:shipmentId/:docKey/restore?version=N ============
// N. versiyonu güncel (current) yap; mevcut current'ı versions[]'a taşır.
router.post('/:shipmentId/:docKey/restore', verifyToken, async (req, res) => {
  try {
    const shipmentId = toInt(req.params.shipmentId);
    const docKey = sanitizeDocKey(req.params.docKey);
    const version = Math.max(1, toInt(req.query.version) || 0);
    if (!shipmentId || !docKey || !version) return sendError(res, 'Eksik parametre');

    const [rows] = await pool.execute(
      'SELECT documents_data FROM shipments WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [shipmentId]
    );
    if (rows.length === 0) return sendError(res, 'Sevkiyat bulunamadı', 404);
    let docs = {};
    try { docs = JSON.parse(rows[0].documents_data || '{}') || {}; } catch { docs = {}; }
    const doc = docs[docKey];
    if (!doc) return sendError(res, 'Belge bulunamadı', 404);
    const versions = Array.isArray(doc.versions) ? doc.versions : [];
    const target = versions[version - 1];
    if (!target) return sendError(res, 'Versiyon bulunamadı', 404);

    // Mevcut current'ı target'ın yerine, target'ı current'a koy
    const newVersions = versions.slice();
    newVersions[version - 1] = {
      filename: doc.filename,
      stored_name: doc.stored_name,
      uploaded_at: doc.uploaded_at,
      uploaded_by: doc.uploaded_by || null,
    };
    docs[docKey] = {
      ...doc,
      filename: target.filename,
      stored_name: target.stored_name,
      uploaded_at: target.uploaded_at,
      uploaded_by: target.uploaded_by || null,
      versions: newVersions,
    };
    await pool.execute(
      'UPDATE shipments SET documents_data = ? WHERE id = ?',
      [JSON.stringify(docs), shipmentId]
    );
    await logAudit(req, 'update', 'documents', shipmentId, `${docKey}/restore-v${version}`);
    sendSuccess(res, { message: `Versiyon ${version} geri yüklendi` });
  } catch (err) {
    console.error('[documents/restore]', err);
    sendError(res, 'Geri yükleme hatası: ' + err.message, 500);
  }
});

// ============ DELETE /api/documents/:shipmentId/:docKey ============
router.delete('/:shipmentId/:docKey', verifyToken, async (req, res) => {
  try {
    const shipmentId = toInt(req.params.shipmentId);
    const docKey = sanitizeDocKey(req.params.docKey);
    if (!shipmentId || !docKey) return sendError(res, 'Eksik parametre');

    const [rows] = await pool.execute(
      'SELECT documents_data FROM shipments WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [shipmentId]
    );
    if (rows.length === 0) return sendError(res, 'Sevkiyat bulunamadı', 404);

    let docs = {};
    if (rows[0].documents_data) {
      try { docs = JSON.parse(rows[0].documents_data) || {}; }
      catch (e) { docs = {}; }
    }

    const doc = docs[docKey];
    if (doc && doc.stored_name) {
      const filepath = path.join(UPLOAD_ROOT, String(shipmentId), doc.stored_name);
      const resolvedDir = path.resolve(UPLOAD_ROOT);
      const resolvedFile = path.resolve(filepath);
      if (resolvedFile.startsWith(resolvedDir + path.sep) && fs.existsSync(filepath)) {
        try { fs.unlinkSync(filepath); } catch (e) { /* yoksay */ }
      }
    }

    delete docs[docKey];
    await pool.execute(
      'UPDATE shipments SET documents_data = ? WHERE id = ?',
      [JSON.stringify(docs), shipmentId]
    );
    await logAudit(req, 'delete', 'documents', shipmentId, docKey);
    sendSuccess(res, { message: 'Silindi' });
  } catch (err) {
    console.error('[documents/delete]', err);
    sendError(res, 'Silme hatası: ' + err.message, 500);
  }
});

module.exports = router;
