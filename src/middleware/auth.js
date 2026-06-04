const jwt = require('jsonwebtoken');
const { sendError } = require('../helpers/utils');
const { can: hasPermission } = require('../config/permissions');

const ROLE_RANK = {
  user: 1,
  admin: 2,
  super_admin: 3
};

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return sendError(res, 'Oturum bulunamadı', 401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return sendError(res, 'Geçersiz veya süresi dolmuş oturum', 401);
  }
}

function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return sendError(res, 'Oturum bulunamadı', 401);
    const userRank = ROLE_RANK[req.user.role] || 0;
    const requiredRank = ROLE_RANK[minRole] || 0;
    if (userRank < requiredRank) {
      return sendError(res, 'Bu işlem için yetkiniz yok', 403);
    }
    next();
  };
}

function hasRole(user, minRole) {
  if (!user) return false;
  return (ROLE_RANK[user.role] || 0) >= (ROLE_RANK[minRole] || 0);
}

function signToken(user) {
  // user.permissions: JSON kolonundan parse edilmiş override objesi
  let perms = user.permissions;
  if (typeof perms === 'string') {
    try { perms = JSON.parse(perms); } catch { perms = null; }
  }
  const payload = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    permissions: perms || null, // override (grant/revoke) varsa
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
}

/** Belirli bir izni isteyen middleware. requireRole'a alternatif. */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return sendError(res, 'Oturum bulunamadı', 401);
    if (!hasPermission(req.user, permission)) {
      return sendError(res, `Bu işlem için yetkiniz yok (${permission})`, 403);
    }
    next();
  };
}

/** İzin kontrolünü direkt kullanmak için (route içinde) */
function can(user, permission) {
  return hasPermission(user, permission);
}

module.exports = { verifyToken, requireRole, hasRole, signToken, ROLE_RANK, requirePermission, can };
