import { useCallback, useMemo, useState } from 'react'

/**
 * Liste satırları için toplu seçim state'i.
 * `idKey`: her satırın benzersiz ID'sini hangi alandan alacağız (default: 'id').
 *
 * @example
 *   const sel = useBulkSelection(shipments, (s) => s.id)
 *   sel.toggle(123); sel.toggleAll(); sel.selectedIds // Set<number>
 *   sel.isSelected(123); sel.allSelected; sel.someSelected
 */
export function useBulkSelection<T, K extends string | number = number>(
  items: T[],
  getId: (item: T) => K,
) {
  const [selectedIds, setSelected] = useState<Set<K>>(new Set())

  const allIds = useMemo(() => items.map(getId), [items, getId])

  const isSelected = useCallback((id: K) => selectedIds.has(id), [selectedIds])

  const toggle = useCallback((id: K) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === allIds.length && allIds.length > 0) return new Set()
      return new Set(allIds)
    })
  }, [allIds])

  const clear = useCallback(() => setSelected(new Set()), [])

  const allSelected = selectedIds.size === allIds.length && allIds.length > 0
  const someSelected = selectedIds.size > 0 && selectedIds.size < allIds.length

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(getId(item))),
    [items, selectedIds, getId]
  )

  return {
    selectedIds,
    selectedItems,
    count: selectedIds.size,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  }
}
