import { useMemo, useState } from 'react'
import { Archive, Loader2, AlertCircle, Inbox, RotateCcw, Trash2, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/stores/auth'
import { formatDate } from '@/lib/utils'
import {
  useArchiveCounts, useArchiveList,
  useRestoreOne, usePurgeOne, useBulkRestore, useBulkPurge,
  type ArchiveEntity, type ArchivedItem,
} from './hooks'

const ENTITIES: { key: ArchiveEntity; labelKey: string }[] = [
  { key: 'shipments',   labelKey: 'archive.tabs.shipments' },
  { key: 'partners',    labelKey: 'archive.tabs.partners' },
  { key: 'vehicles',    labelKey: 'archive.tabs.vehicles' },
  { key: 'warehouses',  labelKey: 'archive.tabs.warehouses' },
  { key: 'assignments', labelKey: 'archive.tabs.assignments' },
]

interface ColumnDef {
  key: string
  labelKey: string
  format?: (v: unknown, row: ArchivedItem) => React.ReactNode
}

const COLUMNS: Record<ArchiveEntity, ColumnDef[]> = {
  shipments: [
    { key: 'shipment_no',       labelKey: 'shipment.shipment_no' },
    { key: 'transport_type',    labelKey: 'archive.columns.transport_type' },
    { key: 'client_billing',    labelKey: 'shipment.client' },
    { key: 'sale_price',        labelKey: 'shipment.sale', format: (v, r) => v ? `${v} ${r.currency_code || ''}` : '—' },
    { key: 'status',            labelKey: 'common.status' },
  ],
  partners: [
    { key: 'partner_code',  labelKey: 'archive.columns.code' },
    { key: 'company_name',  labelKey: 'archive.columns.company_name' },
    { key: 'type',          labelKey: 'archive.columns.type' },
    { key: 'city',          labelKey: 'archive.columns.city' },
    { key: 'country',       labelKey: 'archive.columns.country' },
  ],
  vehicles: [
    { key: 'vehicle_code',   labelKey: 'archive.columns.code' },
    { key: 'plate',          labelKey: 'archive.columns.plate' },
    { key: 'transport_type', labelKey: 'archive.columns.transport_type' },
    { key: 'driver_name',    labelKey: 'archive.columns.driver' },
    { key: 'status',         labelKey: 'common.status' },
  ],
  warehouses: [
    { key: 'warehouse_code', labelKey: 'archive.columns.code' },
    { key: 'name',           labelKey: 'archive.columns.name' },
    { key: 'type_code',      labelKey: 'archive.columns.type' },
    { key: 'city',           labelKey: 'archive.columns.city' },
    { key: 'country',        labelKey: 'archive.columns.country' },
  ],
  assignments: [
    { key: 'id',                labelKey: 'archive.columns.id' },
    { key: 'vehicle_id',        labelKey: 'archive.columns.vehicle_id' },
    { key: 'shipment_id',       labelKey: 'archive.columns.shipment_id' },
    { key: 'assigned_quantity', labelKey: 'archive.columns.quantity' },
    { key: 'assigned_weight',   labelKey: 'archive.columns.weight' },
  ],
}

export function ArchivePage() {
  const { t } = useTranslation()
  const can = useAuth(s => s.can)
  const [active, setActive] = useState<ArchiveEntity>('shipments')
  const { data: counts } = useArchiveCounts()

  const canRestore = can('archive.restore')
  const canPurge = can('archive.purge')

  return (
    <div className="space-y-4 max-w-[1800px]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center">
          <Archive className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t('archive.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('archive.subtitle')}</p>
        </div>
      </div>

      <Tabs value={active} onValueChange={(v) => setActive(v as ArchiveEntity)}>
        <TabsList className="flex-wrap h-auto">
          {ENTITIES.map(({ key, labelKey }) => {
            const c = counts?.[key] ?? 0
            return (
              <TabsTrigger key={key} value={key} className="gap-2">
                {t(labelKey)}
                {c > 0 && <Badge variant="secondary" className="h-5 px-1.5">{c}</Badge>}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {ENTITIES.map(({ key }) => (
          <TabsContent key={key} value={key} className="mt-3">
            <ArchiveTable entity={key} canRestore={canRestore} canPurge={canPurge} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function ArchiveTable({
  entity, canRestore, canPurge,
}: { entity: ArchiveEntity; canRestore: boolean; canPurge: boolean }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmBulk, setConfirmBulk] = useState<null | 'restore' | 'purge'>(null)
  const [confirmRow, setConfirmRow] = useState<null | { id: number; action: 'restore' | 'purge' }>(null)

  const { data, isLoading, error } = useArchiveList(entity, q || undefined)
  const restoreOne = useRestoreOne(entity)
  const purgeOne = usePurgeOne(entity)
  const bulkRestore = useBulkRestore(entity)
  const bulkPurge = useBulkPurge(entity)

  const items = data?.items ?? []
  const cols = COLUMNS[entity]

  const allChecked = items.length > 0 && selected.size === items.length
  const someChecked = selected.size > 0 && selected.size < items.length

  function toggleAll() {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(items.map((i) => i.id)))
  }
  function toggleOne(id: number) {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSelected(s)
  }

  async function handleRowAction(id: number, action: 'restore' | 'purge') {
    try {
      if (action === 'restore') {
        await restoreOne.mutateAsync(id)
        toast.success(t('archive.toast.restored_one'))
      } else {
        await purgeOne.mutateAsync(id)
        toast.success(t('archive.toast.purged_one'))
      }
      setSelected((prev) => {
        const s = new Set(prev)
        s.delete(id)
        return s
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('common.error')
      toast.error(msg)
    } finally {
      setConfirmRow(null)
    }
  }

  async function handleBulkAction(action: 'restore' | 'purge') {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    try {
      if (action === 'restore') {
        const r = await bulkRestore.mutateAsync(ids) as { restored: number }
        toast.success(t('archive.toast.restored_n', { count: r.restored }))
      } else {
        const r = await bulkPurge.mutateAsync(ids) as { purged: number }
        toast.success(t('archive.toast.purged_n', { count: r.purged }))
      }
      setSelected(new Set())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('common.error')
      toast.error(msg)
    } finally {
      setConfirmBulk(null)
    }
  }

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('archive.search_placeholder')}
            className="pl-8 h-8"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">
            {selected.size > 0
              ? t('archive.selected_count', { count: selected.size })
              : t('archive.total_count', { count: items.length })}
          </span>
          {selected.size > 0 && canRestore && (
            <Button size="sm" variant="outline" onClick={() => setConfirmBulk('restore')}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> {t('archive.bulk_restore')}
            </Button>
          )}
          {selected.size > 0 && canPurge && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmBulk('purge')}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> {t('archive.bulk_purge')}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-destructive p-3">
          <AlertCircle className="w-4 h-4" /> {error instanceof Error ? error.message : t('common.error')}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <Inbox className="w-8 h-8" />
          <p className="text-sm">{t('archive.empty')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked || (someChecked ? 'indeterminate' : false)}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                {cols.map((c) => (
                  <TableHead key={c.key}>{t(c.labelKey)}</TableHead>
                ))}
                <TableHead>{t('archive.columns.deleted_at')}</TableHead>
                <TableHead>{t('archive.columns.deleted_by')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id} className={selected.has(row.id) ? 'bg-accent/50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(row.id)}
                      onCheckedChange={() => toggleOne(row.id)}
                    />
                  </TableCell>
                  {cols.map((c) => (
                    <TableCell key={c.key}>
                      {c.format
                        ? c.format(row[c.key as keyof typeof row], row)
                        : String(row[c.key as keyof typeof row] ?? '—')}
                    </TableCell>
                  ))}
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(row.deleted_at)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {(row.deleted_by_fullname as string) || (row.deleted_by_username as string) || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {canRestore && (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setConfirmRow({ id: row.id, action: 'restore' })}
                          title={t('archive.row.restore')}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {canPurge && (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setConfirmRow({ id: row.id, action: 'purge' })}
                          title={t('archive.row.purge')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tek satır onay */}
      <AlertDialog open={!!confirmRow} onOpenChange={(o) => !o && setConfirmRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmRow?.action === 'restore' ? t('archive.confirm.restore_title') : t('archive.confirm.purge_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRow?.action === 'restore'
                ? t('archive.confirm.restore_body')
                : t('archive.confirm.purge_body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRow && handleRowAction(confirmRow.id, confirmRow.action)}
              className={confirmRow?.action === 'purge' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmRow?.action === 'restore' ? t('archive.row.restore') : t('archive.row.purge')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toplu onay */}
      <AlertDialog open={!!confirmBulk} onOpenChange={(o) => !o && setConfirmBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBulk === 'restore'
                ? t('archive.confirm.bulk_restore_title', { count: selected.size })
                : t('archive.confirm.bulk_purge_title', { count: selected.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBulk === 'restore'
                ? t('archive.confirm.restore_body')
                : t('archive.confirm.purge_body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmBulk && handleBulkAction(confirmBulk)}
              className={confirmBulk === 'purge' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmBulk === 'restore' ? t('archive.bulk_restore') : t('archive.bulk_purge')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
