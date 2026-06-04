const express = require('express');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { getAuditLog } = require('../helpers/audit');
const { sanitizeText, toInt, sendSuccess, sendError } = require('../helpers/utils');

const router = express.Router();

// GET /api/audit?entity_type=shipments&entity_id=1&user_id=2&limit=50&offset=0
// Sadece admin+ görebilir
router.get('/', verifyToken, requirePermission('audit.view'), async (req, res) => {
  try {
    const filters = {
      entityType: sanitizeText(req.query.entity_type) || undefined,
      entityId: toInt(req.query.entity_id) || undefined,
      userId: toInt(req.query.user_id) || undefined,
      limit: Math.min(500, toInt(req.query.limit) || 100),
      offset: toInt(req.query.offset) || 0,
    };
    const rows = await getAuditLog(filters);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('[audit/list]', err);
    sendError(res, 'Audit log alınamadı', 500);
  }
});

module.exports = router;
