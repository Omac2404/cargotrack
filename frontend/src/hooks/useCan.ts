import { useAuth } from '@/stores/auth'
import type { PermissionKey } from '@/lib/permissions'

/**
 * Mevcut kullanıcının belirli bir izne sahip olup olmadığını döner.
 * UI gating için: button.disabled, conditional render vs.
 *
 * @example
 *   const canDelete = useCan('shipments.delete.all')
 *   {canDelete && <Button onClick={...}>Sil</Button>}
 */
export function useCan(permission: PermissionKey): boolean {
  return useAuth((s) => s.can(permission))
}

/**
 * Birden fazla izinden HERHANGİ birine sahip mi (OR mantığı).
 */
export function useCanAny(permissions: PermissionKey[]): boolean {
  return useAuth((s) => permissions.some((p) => s.can(p)))
}

/**
 * Tüm izinlere sahip mi (AND mantığı).
 */
export function useCanAll(permissions: PermissionKey[]): boolean {
  return useAuth((s) => permissions.every((p) => s.can(p)))
}
