/**
 * RBAC — Permission tanımları ve default rol→izin haritası.
 *
 * Format: 'modul.aksiyon' (dotted notation)
 *   - 'shipments.delete', 'partners.read.all', 'audit.view'
 *
 * Wildcard'lar:
 *   - '*' = tüm yetkiler
 *   - 'shipments.*' = shipments modülündeki tüm aksiyonlar
 *
 * Kullanıcı bazlı override: users.permissions JSON kolonunda
 *   { "grant": ["reports.view"], "revoke": ["shipments.delete"] }
 */

// Tüm geçerli permission anahtarları (insan-okunabilir etiketlerle)
const PERMISSIONS = {
  // === Sevkiyatlar ===
  'shipments.create':       'Sevkiyat oluştur',
  'shipments.read.own':     'Kendi sevkiyatlarını görür',
  'shipments.read.all':     'Tüm sevkiyatları görür',
  'shipments.update.own':   'Kendi sevkiyatlarını düzenler',
  'shipments.update.all':   'Tüm sevkiyatları düzenler',
  'shipments.delete.own':   'Kendi sevkiyatlarını siler',
  'shipments.delete.all':   'Tüm sevkiyatları siler',
  'shipments.bulk_action':  'Toplu sevkiyat işlemi (toplu sil / statü)',
  'shipments.financial':    'Finansal sekmeyi görür/düzenler',

  // === Partnerler ===
  'partners.create':        'Partner oluştur',
  'partners.read':          'Partnerleri görür',
  'partners.update':        'Partner düzenler',
  'partners.delete':        'Partner siler',

  // === Araçlar ===
  'vehicles.create':        'Araç oluştur',
  'vehicles.read':          'Araçları görür',
  'vehicles.update':        'Araç düzenler',
  'vehicles.delete':        'Araç siler',

  // === Depolar ===
  'warehouses.create':      'Depo oluştur',
  'warehouses.read':        'Depoları görür',
  'warehouses.update':      'Depo düzenler',
  'warehouses.delete':      'Depo siler',

  // === Atamalar ===
  'assignments.create':     'Atama oluştur',
  'assignments.read':       'Atamaları görür',
  'assignments.update':     'Atama düzenler',
  'assignments.delete':     'Atama siler',

  // === Belgeler ===
  'documents.upload':       'Belge yükler',
  'documents.read':         'Belgeleri görür',
  'documents.delete':       'Belge siler',

  // === Kullanıcılar ===
  'users.read':             'Kullanıcı listesini görür',
  'users.manage':           'Kullanıcı oluştur/düzenle/sil',

  // === Sistem ===
  'audit.view':             'Audit log görür',
  'reports.view':           'Raporları görür',
  'statistics.view':        'İstatistikleri görür',

  // === Arşiv ===
  'archive.view':           'Arşivlenen kayıtları görür',
  'archive.restore':        'Arşivden geri yükler',
  'archive.purge':          'Arşivden kalıcı siler (geri alınamaz)',
};

// Default rol → permission listesi (wildcard ve liste karması destekli)
const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: ['*'], // Her şey

  admin: [
    'shipments.*',
    'partners.*',
    'vehicles.*',
    'warehouses.*',
    'assignments.*',
    'documents.*',
    'audit.view',
    'reports.view',
    'statistics.view',
    'users.read', // Kullanıcı listesini görebilir ama yönetemez (super_admin için)
    'archive.view',
    'archive.restore',
    // archive.purge YOK — sadece super_admin kalıcı silebilir
  ],

  user: [
    // Sevkiyat: kendi kayıtları üzerinde tam yetki
    'shipments.create',
    'shipments.read.own',
    'shipments.update.own',
    'shipments.delete.own',
    'shipments.financial',

    // Partner, araç, depo: sadece okuma
    'partners.read',
    'vehicles.read',
    'warehouses.read',

    // Atama: tam erişim (kendi sevkiyatları için)
    'assignments.create',
    'assignments.read',
    'assignments.update',
    'assignments.delete',

    // Belge: kendi sevkiyatları için
    'documents.upload',
    'documents.read',
    'documents.delete',

    // İstatistik (kendi sevkiyatları)
    'statistics.view',

    // Arşiv: görme yetkisi var ama geri yükleme/kalıcı silme yok
    'archive.view',

    // YOKLAR: bulk_action, audit, reports, users, archive.restore, archive.purge
  ],
};

/**
 * Bir permission desen listesi belirli bir izni karşılıyor mu?
 * Wildcard '*' veya 'modul.*' destekli.
 *
 * @example
 *   matchesPermission('shipments.delete.own', ['shipments.*']) // true
 *   matchesPermission('shipments.delete.own', ['*']) // true
 *   matchesPermission('audit.view', ['shipments.*']) // false
 */
function matchesPermission(perm, patterns) {
  for (const p of patterns) {
    if (p === '*') return true;
    if (p === perm) return true;
    if (p.endsWith('.*')) {
      const prefix = p.slice(0, -2); // "shipments.*" → "shipments"
      if (perm === prefix || perm.startsWith(prefix + '.')) return true;
    }
  }
  return false;
}

/**
 * Kullanıcının belirli bir izne sahip olup olmadığını döner.
 *
 * @param {object} user - { role, permissions } (permissions JSON: { grant: [], revoke: [] })
 * @param {string} permission - 'shipments.delete.all' gibi
 */
function can(user, permission) {
  if (!user || !user.role) return false;
  const rolePerms = DEFAULT_ROLE_PERMISSIONS[user.role] || [];

  // Override
  const override = user.permissions || {};
  const revoked = Array.isArray(override.revoke) ? override.revoke : [];
  const granted = Array.isArray(override.grant) ? override.grant : [];

  // Önce revoke'a bak (revoke öncelikli)
  if (matchesPermission(permission, revoked)) return false;

  // Default rol izinleri + grant ekstra
  return matchesPermission(permission, rolePerms) || matchesPermission(permission, granted);
}

/**
 * Bir user için tüm efektif izinleri liste olarak döner (frontend'e gönderilir).
 */
function getEffectivePermissions(user) {
  if (!user || !user.role) return [];
  const out = new Set();
  for (const perm of Object.keys(PERMISSIONS)) {
    if (can(user, perm)) out.add(perm);
  }
  return Array.from(out);
}

module.exports = {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  can,
  matchesPermission,
  getEffectivePermissions,
};
