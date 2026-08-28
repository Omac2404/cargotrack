/**
 * Frontend permission constants — backend ile birebir uyumlu.
 * Backend can() ile UI gating arası tek kaynak.
 *
 * Etiketler i18n anahtarı olarak tutulur; render yerinde t() ile çevrilir
 * (getPermissionLabel / getPermissionGroups).
 */

type TFn = (key: string) => string

/** permission key -> i18n key (ui.perm_*) */
export const PERMISSION_LABELS: Record<string, string> = {
  // Sevkiyatlar
  'shipments.create':       'ui.perm_shipments_create',
  'shipments.read.own':     'ui.perm_shipments_read_own',
  'shipments.read.all':     'ui.perm_shipments_read_all',
  'shipments.update.own':   'ui.perm_shipments_update_own',
  'shipments.update.all':   'ui.perm_shipments_update_all',
  'shipments.delete.own':   'ui.perm_shipments_delete_own',
  'shipments.delete.all':   'ui.perm_shipments_delete_all',
  'shipments.bulk_action':  'ui.perm_shipments_bulk_action',
  'shipments.financial':    'ui.perm_shipments_financial',

  // Partnerler
  'partners.create':        'ui.perm_partners_create',
  'partners.read':          'ui.perm_partners_read',
  'partners.update':        'ui.perm_partners_update',
  'partners.delete':        'ui.perm_partners_delete',

  // Araçlar
  'vehicles.create':        'ui.perm_vehicles_create',
  'vehicles.read':          'ui.perm_vehicles_read',
  'vehicles.update':        'ui.perm_vehicles_update',
  'vehicles.delete':        'ui.perm_vehicles_delete',

  // Depolar
  'warehouses.create':      'ui.perm_warehouses_create',
  'warehouses.read':        'ui.perm_warehouses_read',
  'warehouses.update':      'ui.perm_warehouses_update',
  'warehouses.delete':      'ui.perm_warehouses_delete',

  // Atamalar
  'assignments.create':     'ui.perm_assignments_create',
  'assignments.read':       'ui.perm_assignments_read',
  'assignments.update':     'ui.perm_assignments_update',
  'assignments.delete':     'ui.perm_assignments_delete',

  // Belgeler
  'documents.upload':       'ui.perm_documents_upload',
  'documents.read':         'ui.perm_documents_read',
  'documents.delete':       'ui.perm_documents_delete',

  // Kullanıcılar
  'users.read':             'ui.perm_users_read',
  'users.manage':           'ui.perm_users_manage',

  // Sistem
  'audit.view':             'ui.perm_audit_view',
  'reports.view':           'ui.perm_reports_view',
  'statistics.view':        'ui.perm_statistics_view',

  // Arşiv
  'archive.view':           'ui.perm_archive_view',
  'archive.restore':        'ui.perm_archive_restore',
  'archive.purge':          'ui.perm_archive_purge',
}

export type PermissionKey = keyof typeof PERMISSION_LABELS | string

/** Çevrilmiş izin etiketi; bilinmeyen anahtar için anahtarın kendisi döner. */
export function getPermissionLabel(t: TFn, key: PermissionKey): string {
  const i18nKey = PERMISSION_LABELS[key]
  return i18nKey ? t(i18nKey) : String(key)
}

/** title alanı i18n anahtarıdır — render yerinde t(title) ile çevrilir. */
export const PERMISSION_GROUPS: Array<{ title: string; prefix: string }> = [
  { title: 'nav.shipments', prefix: 'shipments.' },
  { title: 'nav.partners', prefix: 'partners.' },
  { title: 'nav.vehicles', prefix: 'vehicles.' },
  { title: 'nav.warehouses', prefix: 'warehouses.' },
  { title: 'nav.assignments', prefix: 'assignments.' },
  { title: 'nav.documents', prefix: 'documents.' },
  { title: 'nav.users', prefix: 'users.' },
  { title: 'ui.perm_group_system', prefix: '' }, // audit, reports, statistics — eşlemediği için 'Sistem' altına düşer
]

/** Çevrilmiş grup başlıklarıyla PERMISSION_GROUPS kopyası. */
export function getPermissionGroups(t: TFn): Array<{ title: string; prefix: string }> {
  return PERMISSION_GROUPS.map((g) => ({ ...g, title: t(g.title) }))
}

/**
 * Bir izin listesinde belirli bir permission var mı?
 * Backend ile aynı wildcard mantığı (`*`, `module.*`).
 */
export function hasPermission(perms: string[] | undefined, key: PermissionKey): boolean {
  if (!perms || perms.length === 0) return false
  if (perms.includes('*')) return true
  if (perms.includes(key)) return true
  // wildcard
  const dotIdx = key.indexOf('.')
  if (dotIdx > 0) {
    const prefix = key.slice(0, dotIdx)
    if (perms.includes(`${prefix}.*`)) return true
  }
  return false
}
