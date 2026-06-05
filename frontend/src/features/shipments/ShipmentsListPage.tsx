import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  Plus, Search, Pencil, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown,
  Inbox, AlertCircle,
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
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { getModeConfig, STATUS_LABELS } from './modeConfig'
import { useShipments, useDeleteShipment, useBulkShipmentAction, type BulkActionParams } from './hooks'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { BulkActionBar } from '@/components/shared/BulkActionBar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Shipment } from '@/types/api'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'
import { Can } from '@/components/Can'
import { useCanAny } from '@/hooks/useCan'

/** mode_data JSON parse */
function parseModeData(raw: unknown): Record<string, string> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, string>
  try { return JSON.parse(String(raw)) || {} } catch { return {} }
}

type SortField = 'shipment_no' | 'created_at' | 'client_billing' | 'sale_price' | 'status'
type SortDir = 'asc' | 'desc'

export function ShipmentsListPage() {
  const { t } = useTranslation()
  const { mode } = useParams<{ mode: string }>()
  const navigate = useNavigate()
  const config = getModeConfig(mode)
  // Mode label çevirisi (config.label TR; navigation key'i ile çevirelim)
  const modeKey = mode === 'maritime' ? 'maritime' : mode === 'air' ? 'air' : mode === 'storage' ? 'storage' : 'road'
  const modeLabel = t(`nav.${modeKey}`)

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [deleteTarget, setDeleteTarget] = useState<Shipment | null>(null)

  const { data: shipments = [], isLoading, error } = useShipments(config.key)
  const deleteMut = useDeleteShipment()
  const bulkMut = useBulkShipmentAction()
  const [bulkConfirm, setBulkConfirm] = useState<{ action: BulkActionParams['action']; status?: BulkActionParams['status'] } | null>(null)

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = !q
      ? shipments
      : shipments.filter((s) => {
          const blob = [
            s.shipment_no, s.client_billing, s.sender, s.receiver, s.agent,
            s.departure_country, s.arrival_country, s.invoice_no,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return blob.includes(q)
        })

    list = [...list].sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv), 'tr')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [shipments, search, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMut.mutate(
      { id: deleteTarget.id, expected_transport_type: config.key },
      {
        onSuccess: () => {
          toast.success(`${deleteTarget.shipment_no} silindi`)
          setDeleteTarget(null)
        },
        onError: (err: Error) => toast.error(err.message),
      }
    )
  }

  // Bulk seçim
  const sel = useBulkSelection(filteredSorted, (s) => s.id)

  const handleBulkConfirm = () => {
    if (!bulkConfirm) return
    bulkMut.mutate(
      { ids: Array.from(sel.selectedIds), action: bulkConfirm.action, status: bulkConfirm.status },
      {
        onSuccess: (data) => {
          toast.success(data.message)
          sel.clear()
          setBulkConfirm(null)
        },
        onError: (err: Error) => toast.error(err.message),
      }
    )
  }

  // İstatistik özet (toplam, açık, kapalı)
  const stats = useMemo(() => {
    return {
      total: shipments.length,
      open: shipments.filter((s) => ['draft', 'in_progress', 'to_invoice'].includes(s.status)).length,
      closed: shipments.filter((s) => s.status === 'closed').length,
      totalSale: shipments.reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0),
    }
  }, [shipments])

  return (
    <div className="space-y-4 max-w-[1600px]">
      {/* Başlık */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br text-white flex items-center justify-center', config.gradient)}>
            {config.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('shipment.title_with_mode', { mode: modeLabel })}</h1>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to={`/shipments/${config.slug}/new`}>
              <Plus className="w-4 h-4" />
              {t('shipment.new')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label={t('shipment.summary.total')} value={stats.total} />
        <StatBox label={t('shipment.summary.open')} value={stats.open} highlight />
        <StatBox label={t('shipment.summary.closed')} value={stats.closed} muted />
        <StatBox label={t('shipment.summary.revenue')} value={formatMoney(stats.totalSale, 'EUR')} mono />
      </div>

      {/* Filtre */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('shipment.search_placeholder')}
            className="pl-8 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground px-2">
          {filteredSorted.length} {t('common.records')}
        </div>
        <ExportButton
          data={filteredSorted}
          filename={`sevkiyatlar_${config.slug}`}
          sheetName={t('shipment.title_with_mode', { mode: modeLabel })}
          columns={[
            { header: t('shipment.shipment_no'), key: 'shipment_no' },
            { header: t('common.status'), key: 'status', format: (v) => {
              const k = STATUS_LABELS[v as string]?.label
              return k ? t(k) : String(v ?? '')
            }},
            { header: t('shipment.client'), key: 'client_billing' },
            { header: t('partner.types.sender', { defaultValue: 'Gönderici' }), key: 'sender' },
            { header: t('partner.types.receiver', { defaultValue: 'Alıcı' }), key: 'receiver' },
            { header: t('shipment.fields.departure_country', { defaultValue: 'Çıkış' }), key: 'departure_country' },
            { header: t('shipment.fields.arrival_country', { defaultValue: 'Varış' }), key: 'arrival_country' },
            { header: t('shipment.cargo.quantity', { defaultValue: 'Kap' }), key: 'quantity', format: (v) => exportFormatters.number(v, 0) },
            { header: t('shipment.cargo.gross_weight', { defaultValue: 'Brüt Ağırlık (kg)' }), key: 'gross_weight', format: (v) => exportFormatters.number(v) },
            { header: t('shipment.cargo.volume', { defaultValue: 'Hacim (m³)' }), key: 'volume_cbm', format: (v) => exportFormatters.number(v, 3) },
            { header: t('shipment.fields.currency'), key: 'currency_code' },
            { header: t('shipment.financial.total_purchase', { defaultValue: 'Toplam Alış' }), key: 'purchase_price', format: (v) => exportFormatters.number(v) },
            { header: t('shipment.financial.total_sale', { defaultValue: 'Toplam Satış' }), key: 'sale_price', format: (v) => exportFormatters.number(v) },
            { header: t('invoice.invoice_no', { defaultValue: 'Fatura No' }), key: 'invoice_no' },
            { header: t('invoice.invoice_date', { defaultValue: 'Fatura Tarihi' }), key: 'invoice_date', format: exportFormatters.date },
            { header: t('shipment.fields.payment_received'), key: 'payment_received', format: exportFormatters.yesNo },
            { header: t('shipment.fields.created_date'), key: 'created_date', format: exportFormatters.date },
          ]}
        />
      </Card>

      {/* Bulk action bar — sadece bulk_action izni olanlara */}
      <Can permission="shipments.bulk_action">
        <BulkActionBar count={sel.count} onClear={sel.clear}>
          <Select onValueChange={(v) => setBulkConfirm({ action: 'set_status', status: v as BulkActionParams['status'] })}>
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue placeholder={t('shipment.bulk.change_status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('shipment.status.draft')}</SelectItem>
              <SelectItem value="in_progress">{t('shipment.status.in_progress')}</SelectItem>
              <SelectItem value="to_invoice">{t('shipment.status.to_invoice')}</SelectItem>
              <SelectItem value="closed">{t('shipment.status.closed')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-7"
            onClick={() => setBulkConfirm({ action: 'delete' })}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('shipment.bulk.delete')}
          </Button>
        </BulkActionBar>
      </Can>

      {/* Tablo */}
      <Card className="overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <div className="font-medium">Hata: {(error as Error).message}</div>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            {t('common.loading')}
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">
              {shipments.length === 0
                ? t('shipment.no_shipments_yet', { mode: modeLabel.toLowerCase() })
                : t('common.no_results')}
            </div>
            {shipments.length === 0 && (
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to={`/shipments/${config.slug}/new`}>{t('shipment.create_first')}</Link>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={sel.allSelected || (sel.someSelected ? 'indeterminate' : false)}
                    onCheckedChange={() => sel.toggleAll()}
                    aria-label="Tümünü seç"
                  />
                </TableHead>
                <SortableHeader field="shipment_no" current={sortField} dir={sortDir} onClick={handleSort}>
                  {t('shipment.file_no')}
                </SortableHeader>
                <SortableHeader field="created_at" current={sortField} dir={sortDir} onClick={handleSort}>
                  {t('common.date')}
                </SortableHeader>
                <SortableHeader field="client_billing" current={sortField} dir={sortDir} onClick={handleSort}>
                  {t('shipment.client')}
                </SortableHeader>
                <TableHead>{t('shipment.route')}</TableHead>
                {/* Mode-spesifik kolonlar */}
                {(config.key === 'maritime') && (
                  <>
                    <TableHead>Vessel / Voyage</TableHead>
                    <TableHead>B/L No</TableHead>
                  </>
                )}
                {(config.key === 'air') && (
                  <>
                    <TableHead>Flight</TableHead>
                    <TableHead>AWB No</TableHead>
                  </>
                )}
                <TableHead className="text-right">{t('shipment.weight_pkg')}</TableHead>
                <SortableHeader field="sale_price" current={sortField} dir={sortDir} onClick={handleSort} align="right">
                  {t('shipment.sale')}
                </SortableHeader>
                <SortableHeader field="status" current={sortField} dir={sortDir} onClick={handleSort}>
                  {t('common.status')}
                </SortableHeader>
                <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSorted.map((s) => {
                const statusConfig = STATUS_LABELS[s.status] || { variant: 'secondary' as const }
                const status = { ...statusConfig, label: t(`shipment.status.${s.status}`, s.status) }
                const modeData = parseModeData(s.mode_data)
                return (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/shipments/${config.slug}/${s.id}/edit`)}>
                    <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={sel.isSelected(s.id)}
                        onCheckedChange={() => sel.toggle(s.id)}
                        aria-label={`${s.shipment_no} seç`}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-medium">{s.shipment_no}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(s.created_at)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{s.client_billing || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {config.key === 'maritime' ? (
                        <span>{modeData.pol || s.departure_country || '?'} → {modeData.pod || s.arrival_country || '?'}</span>
                      ) : config.key === 'air' ? (
                        <span>{modeData.origin_airport || s.departure_country || '?'} → {modeData.dest_airport || s.arrival_country || '?'}</span>
                      ) : (
                        <span>{s.departure_country || '?'} → {s.arrival_country || '?'}</span>
                      )}
                    </TableCell>
                    {/* Mode-spesifik hücreler */}
                    {(config.key === 'maritime') && (
                      <>
                        <TableCell className="text-xs">
                          {modeData.vessel_name || '—'}
                          {modeData.voyage_no && <div className="text-muted-foreground font-mono">{modeData.voyage_no}</div>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {modeData.mbl_no || '—'}
                          {modeData.hbl_no && <div className="text-[10px] text-muted-foreground">H: {modeData.hbl_no}</div>}
                        </TableCell>
                      </>
                    )}
                    {(config.key === 'air') && (
                      <>
                        <TableCell className="text-xs">
                          {modeData.airline_code || '—'}
                          {modeData.flight_no && <span className="font-mono ml-1">{modeData.flight_no}</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {modeData.mawb_no || '—'}
                          {modeData.hawb_no && <div className="text-[10px] text-muted-foreground">H: {modeData.hawb_no}</div>}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right tabular-nums text-xs">
                      {Number(s.gross_weight || 0).toFixed(0)} kg
                      <span className="text-muted-foreground"> / {s.quantity || 0}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(s.sale_price, s.currency_code || 'EUR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{t(status.label)}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                          <Link to={`/shipments/${config.slug}/${s.id}/edit`} title="Düzenle">
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(s)}
                          title="Sil"
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

      {/* Silme dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shipment.delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('shipment.delete_confirm_body', { no: deleteTarget?.shipment_no || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toplu işlem onayı */}
      <AlertDialog open={!!bulkConfirm} onOpenChange={(o) => !o && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm?.action === 'delete'
                ? t('shipment.bulk.delete_confirm_title', { count: sel.count })
                : t('shipment.bulk.status_confirm_title', { count: sel.count })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm?.action === 'delete'
                ? t('shipment.bulk.delete_confirm_body')
                : t('shipment.bulk.status_confirm_body', {
                    status: bulkConfirm?.status ? t(`shipment.status.${bulkConfirm.status}`) : '',
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkMut.isPending}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkConfirm() }}
              disabled={bulkMut.isPending}
              className={bulkConfirm?.action === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {bulkMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {bulkConfirm?.action === 'delete' ? t('common.delete') : t('common.apply')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatBox({ label, value, highlight, muted, mono }: {
  label: string; value: string | number; highlight?: boolean; muted?: boolean; mono?: boolean
}) {
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={cn(
        'text-lg font-bold mt-1',
        mono && 'font-mono',
        highlight && 'text-primary',
        muted && 'text-muted-foreground'
      )}>
        {value}
      </div>
    </Card>
  )
}

function SortableHeader({
  field, current, dir, onClick, children, align = 'left',
}: {
  field: SortField; current: SortField; dir: SortDir
  onClick: (f: SortField) => void; children: React.ReactNode
  align?: 'left' | 'right'
}) {
  const active = current === field
  return (
    <TableHead className={align === 'right' ? 'text-right' : ''}>
      <button
        onClick={() => onClick(field)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground transition-colors',
          active && 'text-foreground'
        )}
      >
        {children}
        {active ? (
          dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </TableHead>
  )
}
