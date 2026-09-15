import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Search, Boxes, Loader2, AlertCircle, Inbox, ArrowDownToLine, ArrowUpFromLine, Euro, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ExportButton } from '@/components/shared/ExportButton'
import { cn, formatDate, formatMoney, formatNumber } from '@/lib/utils'
import { useCan } from '@/hooks/useCan'
import { useWhOverview, useSaveWhAccount } from './hooks'
import { AccountForm } from './AccountForm'
import type { WhAccount, WhAccountOverview } from './types'
import { currentPeriod } from './types'

const STATUS_VARIANT = { active: 'success', suspended: 'warning', closed: 'secondary' } as const
const ST_VARIANT = { draft: 'secondary', issued: 'default', paid: 'success' } as const

export function WarehousingListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const canManage = useCan('warehousing.manage')
  const [period, setPeriod] = useState(currentPeriod())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'closed'>('active')
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, error } = useWhOverview(period)
  const saveMut = useSaveWhAccount()
  const accounts = useMemo(() => data?.accounts || [], [data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return accounts.filter((a) =>
      (statusFilter === 'all' || a.status === statusFilter) &&
      (!q || [a.client_name, a.account_code, a.warehouse, a.contact_person].filter(Boolean).join(' ').toLowerCase().includes(q))
    )
  }, [accounts, search, statusFilter])

  const totals = useMemo(() => filtered.reduce((acc, a) => ({
    stock: acc.stock + a.current_stock,
    in: acc.in + a.period_in,
    out: acc.out + a.period_out,
    ht: acc.ht + a.period_total_ht,
  }), { stock: 0, in: 0, out: 0, ht: 0 }), [filtered])

  const create = (form: Partial<WhAccount>) => {
    saveMut.mutate(form, {
      onSuccess: (res) => {
        toast.success(t('whs.account_created', { code: res.account_code || '' }))
        setCreateOpen(false)
        navigate(`/warehousing/${res.id}`)
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  const kpi = (icon: React.ReactNode, label: string, value: string | number, cls?: string) => (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn('text-xl font-bold tabular-nums truncate', cls)}>{value}</div>
      </div>
    </Card>
  )

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('whs.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('whs.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" className="h-9 w-[160px]" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} title={t('whs.period')} />
          {canManage && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> {t('whs.new_account')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpi(<Layers className="w-4 h-4" />, t('whs.kpi_stock'), formatNumber(totals.stock, 0))}
        {kpi(<ArrowDownToLine className="w-4 h-4" />, t('whs.kpi_in'), formatNumber(totals.in, 0), 'text-success')}
        {kpi(<ArrowUpFromLine className="w-4 h-4" />, t('whs.kpi_out'), formatNumber(totals.out, 0), 'text-destructive')}
        {kpi(<Euro className="w-4 h-4" />, t('whs.kpi_revenue'), formatMoney(totals.ht, 'EUR'))}
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('whs.search_ph')} className="pl-8 h-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="active">{t('whs.status_active')}</SelectItem>
            <SelectItem value="suspended">{t('whs.status_suspended')}</SelectItem>
            <SelectItem value="closed">{t('whs.status_closed')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground px-2">{filtered.length} {t('common.records')}</div>
        <ExportButton<WhAccountOverview>
          data={filtered}
          filename={`entreposage_${period}`}
          sheetName={t('whs.title')}
          label={t('common.export_excel')}
          columns={[
            { header: t('whs.account_code'), key: 'account_code' },
            { header: t('whs.client'), key: 'client_name' },
            { header: t('whs.warehouse'), key: 'warehouse' },
            { header: t('whs.current_stock'), key: 'current_stock' },
            { header: `${t('whs.dir_in')} (${period})`, key: 'period_in' },
            { header: `${t('whs.dir_out')} (${period})`, key: 'period_out' },
            { header: t('whs.pallet_days'), key: 'period_pallet_days' },
            { header: `${t('whs.amount_ht')} (${period})`, key: 'period_total_ht' },
            { header: t('whs.statement'), key: 'statement', format: (v) => (v ? t(`whs.st_${(v as { status: string }).status}`) : '') },
            { header: t('whs.last_movement'), key: 'last_movement_date' },
            { header: t('common.status'), key: 'status', format: (v) => t(`whs.status_${v}`) },
          ]}
        />
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{accounts.length === 0 ? t('whs.empty') : t('common.no_results')}</p>
            {accounts.length === 0 && <p className="text-xs mt-1 max-w-md mx-auto">{t('whs.empty_hint')}</p>}
            {accounts.length === 0 && canManage && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> {t('whs.new_account')}
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">{t('whs.account_code')}</TableHead>
                <TableHead>{t('whs.client')}</TableHead>
                <TableHead>{t('whs.warehouse')}</TableHead>
                <TableHead className="text-right">{t('whs.current_stock')}</TableHead>
                <TableHead className="text-center">{t('whs.in_out_period')}</TableHead>
                <TableHead className="text-right">{t('whs.pallet_days')}</TableHead>
                <TableHead className="text-right">{t('whs.amount_ht')}</TableHead>
                <TableHead>{t('whs.statement')}</TableHead>
                <TableHead>{t('whs.last_movement')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/warehousing/${a.id}`)}>
                  <TableCell className="font-mono text-xs">{a.account_code}</TableCell>
                  <TableCell className="font-medium">{a.client_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.warehouse || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-primary">{a.current_stock}</TableCell>
                  <TableCell className="text-center text-xs tabular-nums">
                    <span className="text-success font-semibold">+{a.period_in}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-destructive font-semibold">-{a.period_out}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{formatNumber(a.period_pallet_days, 0)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatMoney(a.period_total_ht, a.currency_code || 'EUR')}
                    {a.period_partial && <div className="text-[10px] font-normal text-warning">{t('whs.in_progress')}</div>}
                  </TableCell>
                  <TableCell>
                    {a.statement
                      ? <Badge variant={ST_VARIANT[a.statement.status]}>{t(`whs.st_${a.statement.status}`)}</Badge>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{a.last_movement_date ? formatDate(a.last_movement_date) : '—'}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[a.status]}>{t(`whs.status_${a.status}`)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('whs.new_account')}</DialogTitle>
            <DialogDescription>{t('whs.new_account_desc')}</DialogDescription>
          </DialogHeader>
          {createOpen && (
            <AccountForm onSubmit={create} isPending={saveMut.isPending} submitLabel={t('common.save')} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
