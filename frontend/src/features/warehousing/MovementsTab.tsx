import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Pencil, Trash2, Loader2, Save, X, FileText, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ExportButton } from '@/components/shared/ExportButton'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { openPdf, getWhStockUrl } from '@/features/pdf/hooks'
import { useCan } from '@/hooks/useCan'
import { useWhMovements, useSaveWhMovement, useDeleteWhMovement } from './hooks'
import type { WhAccount, WhMovement, MovementDirection } from './types'
import { todayISO, periodRange, currentPeriod } from './types'

interface Draft {
  id?: number
  movement_date: string
  direction: MovementDirection
  pallets: string
  packages: string
  weight_kg: string
  reference: string
  product: string
  notes: string
}

const emptyDraft = (): Draft => ({
  movement_date: todayISO(), direction: 'in', pallets: '', packages: '', weight_kg: '', reference: '', product: '', notes: '',
})

export function MovementsTab({ account }: { account: WhAccount }) {
  const { t } = useTranslation()
  const canOperate = useCan('warehousing.operate')
  const { data, isLoading } = useWhMovements(account.id)
  const saveMut = useSaveWhMovement(account.id)
  const deleteMut = useDeleteWhMovement(account.id)

  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [period, setPeriod] = useState<string>(currentPeriod())
  const [allPeriods, setAllPeriods] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WhMovement | null>(null)

  const rows = useMemo(() => {
    const list = data?.movements || []
    if (allPeriods) return [...list].reverse()
    const { from, to } = periodRange(period)
    return list.filter((m) => m.movement_date >= from && m.movement_date <= to).reverse()
  }, [data, period, allPeriods])

  const sums = useMemo(() => ({
    in: rows.filter((r) => r.direction === 'in').reduce((s, r) => s + Math.abs(r.pallets), 0),
    out: rows.filter((r) => r.direction === 'out').reduce((s, r) => s + Math.abs(r.pallets), 0),
  }), [rows])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const submit = () => {
    const pallets = parseInt(draft.pallets, 10)
    if (!draft.movement_date) return toast.error(t('whs.err_date'))
    if (!Number.isFinite(pallets) || pallets === 0 || (draft.direction !== 'adjust' && pallets < 0)) {
      return toast.error(t('whs.err_pallets'))
    }
    saveMut.mutate({
      ...(draft.id ? { id: draft.id } : {}),
      movement_date: draft.movement_date,
      direction: draft.direction,
      pallets,
      packages: draft.packages,
      weight_kg: draft.weight_kg,
      reference: draft.reference,
      product: draft.product,
      notes: draft.notes,
    }, {
      onSuccess: () => {
        toast.success(draft.id ? t('whs.movement_updated') : t('whs.movement_saved'))
        // Aynı gün seri giriş için tarih ve tür korunur
        setDraft((d) => ({ ...emptyDraft(), movement_date: d.movement_date, direction: d.id ? 'in' : d.direction }))
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  const edit = (m: WhMovement) => {
    setDraft({
      id: m.id,
      movement_date: m.movement_date,
      direction: m.direction,
      pallets: String(m.pallets),
      packages: m.packages === null || m.packages === undefined ? '' : String(m.packages),
      weight_kg: m.weight_kg === null || m.weight_kg === undefined ? '' : String(m.weight_kg),
      reference: m.reference || '',
      product: m.product || '',
      notes: m.notes || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success(t('whs.movement_deleted')); setDeleteTarget(null) },
      onError: (err: Error) => { toast.error(err.message); setDeleteTarget(null) },
    })
  }

  const dirOptions: Array<{ v: MovementDirection; icon: React.ReactNode; cls: string }> = [
    { v: 'in', icon: <ArrowDownToLine className="w-3.5 h-3.5" />, cls: 'data-[on=true]:bg-success/15 data-[on=true]:text-success data-[on=true]:border-success/40' },
    { v: 'out', icon: <ArrowUpFromLine className="w-3.5 h-3.5" />, cls: 'data-[on=true]:bg-destructive/10 data-[on=true]:text-destructive data-[on=true]:border-destructive/40' },
    { v: 'adjust', icon: <SlidersHorizontal className="w-3.5 h-3.5" />, cls: 'data-[on=true]:bg-primary/10 data-[on=true]:text-primary data-[on=true]:border-primary/40' },
  ]

  const range = allPeriods ? { from: '', to: '' } : periodRange(period)

  return (
    <div className="space-y-4">
      {canOperate && (
        <Card className={cn('p-4 space-y-3', draft.id && 'ring-2 ring-primary/40')}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {draft.id ? t('whs.edit_movement') : t('whs.new_movement')}
            </h3>
            {draft.id && (
              <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setDraft(emptyDraft())}>
                <X className="w-3.5 h-3.5" /> {t('common.cancel')}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="mv-date">{t('common.date')}</Label>
              <Input id="mv-date" type="date" value={draft.movement_date} onChange={(e) => set('movement_date', e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-3">
              <Label>{t('whs.movement_type')}</Label>
              <div className="flex gap-1.5">
                {dirOptions.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    data-on={draft.direction === o.v}
                    onClick={() => set('direction', o.v)}
                    className={cn('flex-1 h-9 inline-flex items-center justify-center gap-1 rounded-md border text-xs font-medium transition-colors hover:bg-muted', o.cls)}
                  >
                    {o.icon}{t(`whs.dir_${o.v}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="mv-pal">{t('whs.pallets')} *</Label>
              <Input id="mv-pal" type="number" step="1" value={draft.pallets} onChange={(e) => set('pallets', e.target.value)}
                     placeholder={draft.direction === 'adjust' ? '±' : '0'} />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="mv-pkg">{t('whs.packages')}</Label>
              <Input id="mv-pkg" type="number" step="1" min="0" value={draft.packages} onChange={(e) => set('packages', e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="mv-kg">{t('whs.weight_kg')}</Label>
              <Input id="mv-kg" type="number" step="0.01" min="0" value={draft.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="mv-ref">{t('whs.reference')}</Label>
              <Input id="mv-ref" value={draft.reference} onChange={(e) => set('reference', e.target.value)} placeholder={t('whs.reference_ph')} />
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-2">
              <Label htmlFor="mv-prod">{t('whs.product')}</Label>
              <Input id="mv-prod" value={draft.product} onChange={(e) => set('product', e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-10">
              <Label htmlFor="mv-notes">{t('whs.note')}</Label>
              <Input id="mv-notes" value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-2">
              <Button type="button" className="w-full" onClick={submit} disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {draft.id ? t('common.update') : t('common.save')}
              </Button>
            </div>
          </div>
          {draft.direction === 'adjust' && <p className="text-[11px] text-muted-foreground">{t('whs.adjust_hint')}</p>}
        </Card>
      )}

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Input type="month" className="h-8 w-[160px]" value={period} disabled={allPeriods} onChange={(e) => e.target.value && setPeriod(e.target.value)} />
        <Button type="button" variant={allPeriods ? 'default' : 'outline'} size="sm" className="h-8" onClick={() => setAllPeriods((v) => !v)}>
          {t('whs.all_periods')}
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <Badge variant="success">+{sums.in}</Badge>
          <Badge variant="destructive">-{sums.out}</Badge>
          <span>{rows.length} {t('common.records')}</span>
          <span className="font-semibold text-foreground">· {t('whs.current_stock')}: {data?.balance ?? '—'}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8"
                  onClick={() => openPdf(getWhStockUrl(account.id, range.from, range.to))}>
            <FileText className="w-3.5 h-3.5" /> {t('whs.stock_sheet_pdf')}
          </Button>
          <ExportButton
            data={[...rows].reverse()}
            filename={`mouvements_${account.account_code || account.id}`}
            sheetName={t('whs.tab_movements')}
            label={t('common.export_excel')}
            columns={[
              { header: t('common.date'), key: 'movement_date' },
              { header: t('whs.movement_type'), key: 'direction', format: (v) => t(`whs.dir_${v}`) },
              { header: t('whs.pallets'), key: 'pallets', format: (v, r) => (r.direction === 'out' ? -Math.abs(Number(v)) : Number(v)) },
              { header: t('whs.packages'), key: 'packages' },
              { header: t('whs.weight_kg'), key: 'weight_kg' },
              { header: t('whs.reference'), key: 'reference' },
              { header: t('whs.product'), key: 'product' },
              { header: t('whs.note'), key: 'notes' },
              { header: t('whs.balance'), key: 'balance_after' },
            ]}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Inbox className="w-9 h-9 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('whs.no_movements')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('common.date')}</TableHead>
                <TableHead className="w-[110px]">{t('whs.movement_type')}</TableHead>
                <TableHead className="text-right w-[80px]">{t('whs.pallets')}</TableHead>
                <TableHead className="text-right w-[70px]">{t('whs.packages')}</TableHead>
                <TableHead className="text-right w-[90px]">{t('whs.weight_kg')}</TableHead>
                <TableHead>{t('whs.reference')}</TableHead>
                <TableHead>{t('whs.product')} / {t('whs.note')}</TableHead>
                <TableHead className="text-right w-[80px]">{t('whs.balance')}</TableHead>
                {canOperate && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id} className={cn(draft.id === m.id && 'bg-primary/5')}>
                  <TableCell className="tabular-nums text-xs">{formatDate(m.movement_date)}</TableCell>
                  <TableCell>
                    <Badge variant={m.direction === 'in' ? 'success' : m.direction === 'out' ? 'destructive' : 'secondary'}>
                      {t(`whs.dir_${m.direction}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums font-semibold',
                    m.direction === 'in' ? 'text-success' : m.direction === 'out' ? 'text-destructive' : '')}>
                    {m.direction === 'in' ? `+${Math.abs(m.pallets)}` : m.direction === 'out' ? `-${Math.abs(m.pallets)}` : m.pallets}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{m.packages ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{m.weight_kg !== null && m.weight_kg !== undefined ? formatNumber(m.weight_kg, 0) : '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{m.reference || '—'}</TableCell>
                  <TableCell className="text-xs">
                    {m.product || '—'}
                    {m.notes && <div className="text-[10px] text-muted-foreground">{m.notes}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">{m.balance_after}</TableCell>
                  {canOperate && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => edit(m)} title={t('common.edit')}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(m)} title={t('common.delete')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('whs.delete_movement_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && t('whs.delete_movement_body', {
                date: formatDate(deleteTarget.movement_date),
                type: t(`whs.dir_${deleteTarget.direction}`),
                n: Math.abs(deleteTarget.pallets),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
