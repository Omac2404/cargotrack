import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportToExcel, type ExportColumn } from '@/lib/export'

interface Props<T> {
  /** Export edilecek satır verisi (genelde filtrelenmiş liste) */
  data: T[]
  /** Sütun tanımları */
  columns: ExportColumn<T>[]
  /** Dosya adı (uzantısız, tarih otomatik eklenir) */
  filename: string
  /** Sheet adı */
  sheetName?: string
  /** Buton boyutu */
  size?: 'default' | 'sm' | 'icon'
  /** Görünür buton etiketi (default: "Excel'e Aktar") */
  label?: string
  disabled?: boolean
  className?: string
}

/**
 * Veri listesini Excel olarak indiren tek-tıklık buton.
 * Liste sayfalarında kullanılır.
 */
export function ExportButton<T>({
  data, columns, filename, sheetName = 'Veriler',
  size = 'sm', label = "Excel'e Aktar", disabled = false, className,
}: Props<T>) {
  const handleExport = () => {
    exportToExcel(data, columns, filename, sheetName)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      title={data.length === 0 ? 'Aktarılacak veri yok' : `${data.length} kayıt indirilecek`}
      className={className}
    >
      <Download className="w-3.5 h-3.5" />
      {size !== 'icon' && label}
    </Button>
  )
}
