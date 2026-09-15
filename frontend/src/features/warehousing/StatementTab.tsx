import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  FileText, Lock, Send, CheckCircle2, RotateCcw, Trash2, Loader2, AlertTriangle, Info, RefreshCw,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
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
import { exportToExcel } from '@/lib/export'
import { cn, formatDate, formatMoney, formatNumber } from '@/lib/utils'
import { openPdf, getWhStatementUrl } from '@/features/pdf/hooks'
import { useCan } from '@/hooks/useCan'
import {
  useWhStatement, useWhStatements, useCloseWhPeriod, useSetWhStatementStatus, useDeleteWhStatement,
} from './hooks'
import type { WhAccount, StatementStatus } from './types'
import { currentPeriod } from './types'

const STATUS_VARIANT: Record<StatementStatus, 'secondary' | 'default' | 'success'> = {
  draft: 'secondary', issued: 'default', paid: 'success',
}

export function StatementTab({ account }: { account: WhAccount }) {
  const { t } = useTranslation()
  const canManage = useCan('warehousing.manage')
  const [period, setPeriod] = useState(currentPeriod())
  const [invoiceNo, setInvoiceNo] = useState('')
  const [confirm, setConfirm] = useState<null | 'close' | 'delete'>(null)

  const { data: st, isLoading, error, refetch, isFetching } = useWhStatement(account.id, period)
  const { data: history = [] } = useWhStatements(account.id)
  const closeMut = useCloseWhPeriod(account.id)
  const statusMut = useSetWhStatementStatus(account.id)
  const deleteMut = useDeleteWhStatement(account.id)
  const cur = st?.currency || account.currency_code || 'EUR'
  const record = st?.record || null

  const chartData = useMemo(
    () => (st?.daily || []).map((d) => ({
      day: d.date.slice(8),
      stock: d.counted ? d.stock : null,
      in: d.in || null,
      out: d.out ? -d.out : null,
    })),
    [st]
  )

  const snapshotDiffers = !!(st && st.source === 'snapshot' && Math.abs((st.live_total_ht || 0) - st.total_ht) > 0.009)

  const closePeriod = () => {
    closeMut.mutate(period, {
      onSuccess: (r) => { toast.success(t('whs.period_closed', { no: r.statement_no })); setConfirm(null) },
      onError: (err: Error) => { toast.error(err.message); setConfirm(null) },
    })
  }

  const setStatus = (status: StatementStatus) => {
    if (!record) return
    statusMut.mutate({ id: record.id, status, invoice_no: status === 'issued' ? invoiceNo || record.invoice_no : undefined }, {
      onSuccess: () => toast.success(t(`whs.statement_now_${status}`)),
      onError: (err: Error) => toast.error(err.message),
    })
  }

  const deleteDraft = () => {
    if (!record) return
    deleteMut.mutate(record.id, {
      onSuccess: () => { toast.success(t('whs.draft_deleted')); setConfirm(null) },
      onError: (err: Error) => { toast.error(err.message); setConfirm(null) },
    })
  }

  const exportExcel = () => {
    if (!st) return
    exportToExcel(
      st.lines,
      [
        { header: t('whs.designation'), key: 'label' },
        { header: t('whs.quantity'), key: 'quantity' },
        { header: t('whs.unit'), key: 'unit' },
        { header: t('whs.unit_price'), key: 'unit_price' },
        { header: t('whs.amount_ht'), key: 'amount' },
      ],
      `releve_${st.statement_no}`,
      st.statement_no.slice(0, 31)
    )
  }

  const stat = (label: string, value: string | number, cls?: string) => (
    <div className="rounded-md border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('text-xl font-bold tabular-nums', cls)}>{value}</div>
    </div>
  )

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Label className="text-xs">{t('whs.period')}</Label>
        <Input type="month" className="h-8 w-[160px]" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} title={t('common.refresh')}>
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
        </Button>
        {st && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-muted-foreground">{st.statement_no}</span>
            {record
              ? <Badge variant={STATUS_VARIANT[record.status]}>{t(`whs.st_${record.status}`)}</Badge>
              : <Badge variant="warning">{t('whs.st_provisional')}</Badge>}
            {record?.invoice_no && <span className="text-muted-foreground">· {t('whs.invoice_no')}: <b className="text-foreground">{record.invoice_no}</b></span>}
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" disabled={!st} onClick={exportExcel}>
            {t('common.export_excel')}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8" disabled={!st}
                  onClick={() => openPdf(getWhStatementUrl(account.id, period))}>
            <FileText className="w-3.5 h-3.5" /> {t('whs.statement_pdf')}
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="p-8 text-center text-destructive text-sm">{(error as Error).message}</Card>
      ) : isLoading || !st ? (
        <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></Card>
      ) : (
        <>
          {st.partial && (
            <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
              <Info className="w-4 h-4 text-warning shrink-0" />
              {t('whs.partial_notice', { date: formatDate(st.calculated_until), days: st.days_counted, total: st.days_in_month })}
            </div>
          )}
          {snapshotDiffers && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              {t('whs.snapshot_differs', { frozen: formatMoney(st.total_ht, cur), live: formatMoney(st.live_total_ht, cur) })}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {stat(t('whs.opening_stock'), st.stock.opening)}
            {stat(t('whs.dir_in'), st.stock.in ? `+${st.stock.in}` : 0, 'text-success')}
            {stat(t('whs.dir_out'), st.stock.out ? `-${st.stock.out}` : 0, 'text-destructive')}
            {stat(t('whs.dir_adjust'), st.stock.adjust)}
            {stat(t('whs.closing_stock'), st.stock.closing, 'text-primary')}
            {stat(t('whs.peak'), st.stock.peak)}
            {stat(t('whs.pallet_days'), formatNumber(st.stock.pallet_days, 0))}
            {stat(t('whs.avg_occupancy'), formatNumber(st.stock.average, 2))}
          </div>

          <Card className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('whs.daily_stock_chart')}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="whStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {/* SVG özniteliklerinde CSS değişkeni çözülmüyor — sabit renk */}
                <Bar dataKey="in" name={t('whs.dir_in')} fill="#10b981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="out" name={t('whs.dir_out')} fill="#ef4444" radius={[0, 0, 3, 3]} isAnimationActive={false} />
                <Area type="stepAfter" dataKey="stock" name={t('whs.stock')} stroke="#0ea5e9" fill="url(#whStock)" strokeWidth={2} connectNulls={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('whs.designation')}</TableHead>
                  <TableHead className="text-right w-[110px]">{t('whs.quantity')}</TableHead>
                  <TableHead className="w-[110px]">{t('whs.unit')}</TableHead>
                  <TableHead className="text-right w-[120px]">{t('whs.unit_price')}</TableHead>
                  <TableHead className="text-right w-[140px]">{t('whs.amount_ht')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {st.lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">{t('whs.no_charges')}</TableCell>
                  </TableRow>
                ) : st.lines.map((l, i) => (
                  <TableRow key={`${l.code}-${i}`}>
                    <TableCell className="text-sm">
                      {l.label}
                      {l.entries ? <span className="text-[10px] text-muted-foreground ml-2">({t('whs.n_entries', { n: l.entries })})</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(l.quantity, Number.isInteger(l.quantity) ? 0 : 2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.unit}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{formatNumber(l.unit_price, l.unit_price > 0 && l.unit_price < 1 ? 4 : 2)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatMoney(l.amount, cur)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t bg-muted/30 p-4 flex justify-end">
              <div className="w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between"><span>{t('whs.total_ht')}</span><b className="tabular-nums">{formatMoney(st.total_ht, cur)}</b></div>
                <div className="flex justify-between"><span>{t('whs.vat')} {formatNumber(st.vat_rate, st.vat_rate % 1 ? 2 : 0)} %</span><b className="tabular-nums">{formatMoney(st.total_vat, cur)}</b></div>
                <div className="flex justify-between border-t pt-1 text-base text-primary"><span className="font-semibold">{t('whs.total_ttc')}</span><b className="tabular-nums">{formatMoney(st.total_ttc, cur)}</b></div>
              </div>
            </div>
          </Card>

          {canManage && (
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('whs.month_closing')}</h3>
              {!record ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs text-muted-foreground flex-1 min-w-[240px]">{t('whs.close_hint')}</p>
                  <Button type="button" onClick={() => setConfirm('close')} disabled={closeMut.isPending}>
                    <Lock className="w-4 h-4" /> {t('whs.close_period')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  {record.status === 'draft' && (
                    <>
                      <Button type="button" variant="outline" onClick={() => setConfirm('close')} disabled={closeMut.isPending}>
                        <RefreshCw className="w-4 h-4" /> {t('whs.recalculate')}
                      </Button>
                      <div className="space-y-1.5">
                        <Label htmlFor="st-inv" className="text-xs">{t('whs.invoice_no')}</Label>
                        <Input id="st-inv" className="h-9 w-[180px]" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="FA-2026-…" />
                      </div>
                      <Button type="button" onClick={() => setStatus('issued')} disabled={statusMut.isPending}>
                        <Send className="w-4 h-4" /> {t('whs.issue')}
                      </Button>
                      <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirm('delete')}>
                        <Trash2 className="w-4 h-4" /> {t('whs.delete_draft')}
                      </Button>
                    </>
                  )}
                  {record.status === 'issued' && (
                    <>
                      <Button type="button" onClick={() => setStatus('paid')} disabled={statusMut.isPending}>
                        <CheckCircle2 className="w-4 h-4" /> {t('whs.mark_paid')}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setStatus('draft')} disabled={statusMut.isPending}>
                        <RotateCcw className="w-4 h-4" /> {t('whs.back_to_draft')}
                      </Button>
                    </>
                  )}
                  {record.status === 'paid' && (
                    <Button type="button" variant="outline" onClick={() => setStatus('issued')} disabled={statusMut.isPending}>
                      <RotateCcw className="w-4 h-4" /> {t('whs.mark_unpaid')}
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground basis-full">{t(`whs.status_help_${record.status}`)}</p>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {history.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('whs.statement_history')}</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('whs.period')}</TableHead>
                <TableHead>{t('whs.statement_no')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('whs.invoice_no')}</TableHead>
                <TableHead className="text-right">{t('whs.total_ht')}</TableHead>
                <TableHead className="text-right">{t('whs.total_ttc')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id} className={cn('cursor-pointer', h.period === period && 'bg-primary/5')} onClick={() => setPeriod(h.period)}>
                  <TableCell className="tabular-nums">{h.period}</TableCell>
                  <TableCell className="font-mono text-xs">{h.statement_no}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[h.status]}>{t(`whs.st_${h.status}`)}</Badge></TableCell>
                  <TableCell className="text-xs">{h.invoice_no || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(h.total_ht, h.currency_code || cur)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatMoney(h.total_ttc, h.currency_code || cur)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === 'delete' ? t('whs.delete_draft') : t('whs.close_period')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'delete' ? t('whs.delete_draft_body') : t('whs.close_period_body', { period })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm === 'delete' ? deleteDraft : closePeriod}
              className={confirm === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
