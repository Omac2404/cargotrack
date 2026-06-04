import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  count: number
  onClear: () => void
  children?: React.ReactNode
}

/**
 * Toplu seçim aksiyon barı — seçim yapıldıkça liste üstünde belirir.
 * Çocuk olarak aksiyon butonları (toplu sil, toplu kapat vs.) konur.
 *
 * @example
 *   <BulkActionBar count={sel.count} onClear={sel.clear}>
 *     <Button variant="destructive" onClick={handleBulkDelete}>Sil</Button>
 *     <Button onClick={handleBulkClose}>Kapat</Button>
 *   </BulkActionBar>
 */
export function BulkActionBar({ count, onClear, children }: Props) {
  if (count === 0) return null

  return (
    <div className="flex items-center gap-2 p-2 px-3 rounded-md bg-primary/10 border border-primary/30">
      <span className="text-xs font-semibold text-primary">
        {count} kayıt seçildi
      </span>
      <div className="flex items-center gap-1 ml-auto">
        {children}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-1"
          onClick={onClear}
          title="Seçimi temizle"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
