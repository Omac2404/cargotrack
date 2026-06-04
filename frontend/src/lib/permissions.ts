/**
 * Frontend permission constants — backend ile birebir uyumlu.
 * Backend can() ile UI gating arası tek kaynak.
 */

export const PERMISSION_LABELS: Record<string, string> = {
  // Sevkiyatlar
  'shipments.create':       'Sevkiyat oluştur',
  'shipments.read.own':     'Kendi sevkiyatlarını görür',
  'shipments.read.all':     'Tüm sevkiyatları görür',
  'shipments.update.own':   'Kendi sevkiyatlarını düzenler',
  'shipments.update.all':   'Tüm sevkiyatları düzenler',
  'shipments.delete.own':   'Kendi sevkiyatlarını siler',
  'shipments.delete.all':   'Tüm sevkiyatları siler',
  'shipments.bulk_action':  'Toplu sevkiyat işlemi',
  'shipments.financial':    'Finansal sekmeyi görür/düzenler',

  // Partnerler
  'partners.create':        'Partner oluştur',
  'partners.read':          'Partnerleri görür',
  'partners.update':        'Partner düzenler',
  'partners.delete':        'Partner siler',

  // Araçlar
  'vehicles.create':        'Araç oluştur',
  'vehicles.read':          'Araçları görür',
  'vehicles.update':        'Araç düzenler',
  'vehicles.delete':        'Araç siler',

  // Depolar
  'warehouses.create':      'Depo oluştur',
  'warehouses.read':        'Depoları görür',
  'warehouses.update':      'Depo düzenler',
  'warehouses.delete':      'Depo siler',

  // Atamalar
  'assignments.create':     'Atama oluştur',
  'assignments.read':       'Atamaları görür',
  'assignments.update':     'Atama düzenler',
  'assignments.delete':     'Atama siler',

  // Belgeler
  'documents.upload':       'Belge yükler',
  'documents.read':         'Belgeleri görür',
  'documents.delete':       'Belge siler',

  // Kullanıcılar
  'users.read':             'Kullanıcı listesini görür',
  'users.manage':           'Kullanıcı oluştur/düzenle/sil',

  // Sistem
  'audit.view':             'Audit log görür',
  'reports.view':           'Raporları görür',
  'statistics.view':        'İstatistikleri görür',
}

export type PermissionKey = keyof typeof PERMISSION_LABELS | string

export const PERMISSION_GROUPS: Array<{ title: string; prefix: string }> = [
  { title: 'Sevkiyatlar', prefix: 'shipments.' },
  { title: 'Partnerler', prefix: 'partners.' },
  { title: 'Araçlar', prefix: 'vehicles.' },
  { title: 'Depolar', prefix: 'warehouses.' },
  { title: 'Atamalar', prefix: 'assignments.' },
  { title: 'Belgeler', prefix: 'documents.' },
  { title: 'Kullanıcılar', prefix: 'users.' },
  { title: 'Sistem', prefix: '' }, // audit, reports, statistics — eşlemediği için 'Sistem' altına düşer
]

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
