import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, Search, Pencil, Trash2, Loader2, Warehouse as WhIcon, Inbox, AlertCircle, MapPin, Phone,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useWarehouses, useDeleteWarehouse, WAREHOUSE_TYPES } from './hooks'
import { WarehouseFormDialog } from './WarehouseFormDialog'
import { useWarehouseSummary } from '@/features/lookup/hooks'
import { formatDate } from '@/lib/utils'
import type { Warehouse } from '@/types/api'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'
import { useTranslation } from 'react-i18next'

export function WarehousesListPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<Warehouse | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null)

  const { data: warehouses = [], isLoading, error } = useWarehouses()
  const { data: summaries = [] } = useWarehouseSummary()
  const summaryMap = useMemo(() => Object.fromEntries(summaries.map((s) => [s.id, s])), [summaries])
  const deleteMut = useDeleteWarehouse()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return warehouses
    return warehouses.filter((w) =>
      [w.name, w.warehouse_code, w.city, w.country, w.responsible_person, w.contact_email]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [warehouses, search])

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`${deleteTarget.name} silindi`)
        setDeleteTarget(null)
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center">
            <WhIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('warehouse.title')}</h1>
            <p className="text-xs text-muted-foreground">R/S/T/U/V/Y/Z</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('warehouse.new')}
        </Button>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('warehouse.search_placeholder')}
            className="pl-8 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground px-2">{filtered.length} {t('common.records')}</div>
        <ExportButton
          data={filtered}
          filename="depolar"
          sheetName="Depolar"
          columns={[
            { header: 'Kod', key: 'warehouse_code' },
            { header: 'Ad', key: 'name' },
            { header: 'Tip Kodu', key: 'type_code' },
            { header: 'Tip Açıklaması', key: 'type_code', format: (v) => Object.values(WAREHOUSE_TYPES).find((w) => w.code === v)?.label || String(v ?? '') },
            { header: 'Adres', key: 'address' },
            { header: 'Şehir', key: 'city' },
            { header: 'Ülke', key: 'country' },
            { header: 'Telefon', key: 'phone' },
            { header: 'Durum', key: 'status', format: (v) => v === 'active' ? 'Aktif' : 'Pasif' },
            { header: 'Notlar', key: 'notes' },
            { header: 'Oluşturma', key: 'created_at', format: exportFormatters.dateTime },
          ]}
        />
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            {t('common.error')}: {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">
              {warehouses.length === 0 ? t('common.no_data') : t('common.no_results')}
            </div>
            {warehouses.length === 0 && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                {t('warehouse.new')}
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{t('warehouse.code')}</TableHead>
                <TableHead>{t('warehouse.name')}</TableHead>
                <TableHead>{t('warehouse.type')}</TableHead>
                <TableHead>{t('partner.address')}</TableHead>
                <TableHead>{t('partner.contact')}</TableHead>
                <TableHead>{t('vehicle.capacity')}</TableHead>
                <TableHead className="text-center">{t('nav.shipments')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((w) => {
                const typeInfo = WAREHOUSE_TYPES[w.type_code]
                return (
                  <TableRow key={w.id} className="cursor-pointer" onClick={() => setEditTarget(w)}>
                    <TableCell className="font-mono text-xs">{w.warehouse_code}</TableCell>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {w.type_code} · {typeInfo?.label || '?'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[w.city, w.country].filter(Boolean).join(' / ') || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {w.responsible_person && <div>{w.responsible_person}</div>}
                      {w.contact_phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-3 h-3" />{w.contact_phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{w.capacity_info || '—'}</TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const sum = summaryMap[w.id]
                        const cnt = sum?.active_count || 0
                        return (
                          <div className="space-y-0.5">
                            <Badge variant={cnt > 0 ? 'default' : 'secondary'}>{cnt}</Badge>
                            {sum?.last_activity && (
                              <div className="text-[10px] text-muted-foreground">
                                Son: {formatDate(sum.last_activity)}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={w.status === 'active' ? 'success' : 'secondary'}>
                        {w.status === 'active' ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTarget(w)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(w)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <WarehouseFormDialog
        open={createOpen || !!editTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false)
            setEditTarget(null)
          }
        }}
        warehouse={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Depoyu sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="font-medium text-foreground">{deleteTarget?.name}</strong> kalıcı olarak silinecek.
              Eğer bu depo herhangi bir sevkiyatta kullanılıyorsa silme reddedilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
