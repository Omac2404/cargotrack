import type { ReactNode } from 'react'
import { useCan, useCanAny, useCanAll } from '@/hooks/useCan'
import type { PermissionKey } from '@/lib/permissions'

interface Props {
  /** Tek izin */
  permission?: PermissionKey
  /** Birden fazla izinden herhangi biri (OR) */
  any?: PermissionKey[]
  /** Tüm izinlere sahip (AND) */
  all?: PermissionKey[]
  /** İzin VARSA gösterilecek içerik */
  children: ReactNode
  /** İzin YOKSA gösterilecek alternatif (default: hiçbir şey) */
  fallback?: ReactNode
}

/**
 * Çocuk içeriği koşullu render eden permission gate.
 *
 * @example
 *   <Can permission="shipments.delete.all">
 *     <Button onClick={handleDelete}>Sil</Button>
 *   </Can>
 *
 *   <Can any={['users.read', 'users.manage']}>
 *     <Link to="/users">Kullanıcılar</Link>
 *   </Can>
 */
export function Can({ permission, any, all, children, fallback = null }: Props) {
  if (!permission && !any && !all) {
    console.warn('<Can> requires one of: permission, any, all')
    return <>{fallback}</>
  }
  // Hook'lar koşullu olmamalı — hepsini çağırıp en spesifiğine düşelim
  const single = useCan(permission || '__never__')
  const anyOk = useCanAny(any || [])
  const allOk = useCanAll(all || [])

  let allowed = false
  if (permission) allowed = single
  else if (any) allowed = anyOk
  else if (all) allowed = allOk

  return <>{allowed ? children : fallback}</>
}
