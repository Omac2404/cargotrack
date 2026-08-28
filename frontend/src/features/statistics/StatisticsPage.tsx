import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  BarChart3, Package, TrendingUp, AlertTriangle, FileX, Clock, Calendar,
  Download, Loader2, AlertCircle, Wallet, Users, DollarSign, RefreshCcw,
  Receipt, Activity, Truck, Warehouse as WhIcon, FileText, MapPin,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CurrencyCombobox } from '@/components/shared/CurrencyCombobox'
import { useStatistics, exportStatsExcel, type StatsFilters } from './hooks'
import { StatCard } from './StatCards'
import { cn, formatDate, formatMoney, formatNumber } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

// Aşağıdaki sabitler i18n ANAHTARI tutar — t() render anında çağrılır (import anında değil)
const MODE_LABEL_KEYS: Record<string, string> = {
  road: 'transport.modes.road', maritime: 'transport.modes.maritime', air: 'transport.modes.air',
  storage: 'transport.modes.storage', import: 'transport.modes.import', export: 'transport.modes.export',
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  draft: 'shipment.status.draft', in_progress: 'shipment.status.in_progress',
  to_invoice: 'shipment.status.to_invoice', closed: 'shipment.status.closed',
}

// Belge kısaltmaları (BL, AWB, CMR, ATR, EUR.1) dilden bağımsız kodlardır; çevrilmez.
const DOC_CODES: Record<string, string> = { bl: 'BL', awb: 'AWB', cmr: 'CMR', atr: 'ATR', eur1: 'EUR.1' }
const DOC_LABEL_KEYS: Record<string, string> = {
  invoice: 'ui.fatura', packing_list: 'transport.documents.packing_list',
  certificate_origin: 'ui.stat_doc_origin', customs_declaration: 'ui.stat_doc_customs',
  insurance_policy: 'ui.stat_doc_insurance', weight_certificate: 'ui.stat_doc_weight',
  fumigation: 'ui.stat_doc_fumigation',
}

// 30 gün önce / bugün defaultları
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const QUICK_RANGES = [
  { labelKey: 'ui.stat_last_7_days', days: 7 },
  { labelKey: 'ui.stat_last_30_days', days: 30 },
  { labelKey: 'ui.stat_last_90_days', days: 90 },
  { labelKey: 'ui.stat_this_year', custom: () => ({ from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) }) },
]

// Renk paleti (mod ve grafikler için)
const COLORS = ['#6366f1', '#06b6d4', '#0ea5e9', '#f59e0b', '#10b981', '#a855f7']

export function StatisticsPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<StatsFilters>({
    date_from: daysAgo(30),
    date_to: daysAgo(0),
    transport_type: '',
    currency: 'EUR',
  })

  const { data, isLoading, error, refetch, isFetching } = useStatistics(filters)

  const exportMut = useMutation({
    mutationFn: () => exportStatsExcel(filters),
    onSuccess: () => toast.success(t('common.success')),
    onError: (err: Error) => toast.error(err.message),
  })

  const handleQuickRange = (q: typeof QUICK_RANGES[number]) => {
    if (q.custom) {
      const c = q.custom()
      setFilters((f) => ({ ...f, date_from: c.from, date_to: c.to }))
    } else if (q.days) {
      setFilters((f) => ({ ...f, date_from: daysAgo(q.days), date_to: daysAgo(0) }))
    }
  }

  const ov = data?.overview
  const cmp = data?.comparison

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('statistics.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('reports.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={cn(isFetching && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
          <Button size="sm" onClick={() => exportMut.mutate()} disabled={exportMut.isPending}>
            {exportMut.isPending ? <Loader2 className="animate-spin" /> : <Download />}
            {t('common.export_excel')}
          </Button>
        </div>
      </div>

      {/* === Filtreler === */}
      <Card className="p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[10px]">{t('statistics.date_from')}</Label>
            <Input
              type="date"
              className="h-8 w-[140px]"
              value={filters.date_from}
              onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">{t('statistics.date_to')}</Label>
            <Input
              type="date"
              className="h-8 w-[140px]"
              value={filters.date_to}
              onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">{t('reports.mode')}</Label>
            <Select
              value={filters.transport_type || '__all__'}
              onValueChange={(v) => setFilters((f) => ({ ...f, transport_type: v === '__all__' ? '' : v }))}
            >
              <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('reports.all_modes')}</SelectItem>
                <SelectItem value="road">{t('nav.road')}</SelectItem>
                <SelectItem value="maritime">{t('nav.maritime')}</SelectItem>
                <SelectItem value="air">{t('nav.air')}</SelectItem>
                <SelectItem value="storage">{t('nav.storage')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">{t('shipment.fields.currency')}</Label>
            <CurrencyCombobox
              value={filters.currency || 'EUR'}
              onChange={(v) => setFilters((f) => ({ ...f, currency: v }))}
              className="h-8 w-[180px]"
            />
          </div>

          <div className="flex items-center gap-1.5 ml-auto pl-2 border-l">
            {QUICK_RANGES.map((q) => (
              <button
                key={q.labelKey}
                onClick={() => handleQuickRange(q)}
                className="text-xs px-2 py-1 rounded border border-input hover:bg-accent transition-colors"
              >
                {t(q.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>
              {formatDate(data.filters.date_from)} → {formatDate(data.filters.date_to)} ·
              {t('ui.stat_days_count', { count: data.filters.period_days })}
              {data.filters.transport_type && ` · ${MODE_LABEL_KEYS[data.filters.transport_type] ? t(MODE_LABEL_KEYS[data.filters.transport_type]) : data.filters.transport_type}`} ·
              {' ' + data.filters.currency}
            </span>
          </div>
        )}
      </Card>

      {error ? (
        <Card className="p-8 text-center text-destructive">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          {t('common.error')}: {(error as Error).message}
        </Card>
      ) : isLoading || !data ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </Card>
      ) : (
        <>
          {/* === Overview kartlar === */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
            <StatCard
              label={t('statistics.summary.total_shipments')}
              value={formatNumber(ov!.total_count, 0)}
              icon={<Package className="w-3.5 h-3.5" />}
              variant="primary"
              trend={{ current: ov!.total_count, previous: cmp!.prev_total_count, format: 'count' }}
              sub={`${ov!.open_count} ${t('shipment.summary.open').toLowerCase()} · ${ov!.closed_count} ${t('shipment.summary.closed').toLowerCase()}`}
            />
            <StatCard
              label={t('statistics.summary.total_revenue')}
              value={formatMoney(ov!.total_sales, filters.currency)}
              icon={<DollarSign className="w-3.5 h-3.5" />}
              variant="success"
              currency={filters.currency}
              trend={{ current: ov!.total_sales, previous: cmp!.prev_total_sales, format: 'money' }}
            />
            <StatCard
              label={t('statistics.summary.total_profit')}
              value={formatMoney(ov!.total_profit, filters.currency)}
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              variant="success"
              currency={filters.currency}
              trend={{ current: ov!.total_profit, previous: cmp!.prev_total_profit, format: 'money' }}
              sub={t('ui.stat_cost_sub', { value: formatMoney(ov!.total_cost, filters.currency) })}
            />
            <StatCard
              label={t('statistics.summary.margin')}
              value={`${formatNumber(ov!.avg_margin, 1)}%`}
              icon={<Activity className="w-3.5 h-3.5" />}
              variant={ov!.avg_margin >= cmp!.prev_avg_margin ? 'success' : 'warning'}
              sub={t('ui.stat_prev_sub', { value: `${formatNumber(cmp!.prev_avg_margin, 1)}%` })}
            />

            <StatCard
              label={t('ui.odenmemis')}
              value={formatMoney(ov!.unpaid_total, filters.currency)}
              icon={<Receipt className="w-3.5 h-3.5" />}
              variant={ov!.overdue_count > 0 ? 'destructive' : 'default'}
              sub={t('ui.stat_unpaid_sub', { invoices: ov!.unpaid_count, overdue: ov!.overdue_count })}
            />
            <StatCard
              label={t('ui.belge_eksik')}
              value={formatNumber(ov!.missing_doc_shipments, 0)}
              icon={<FileX className="w-3.5 h-3.5" />}
              variant={ov!.missing_doc_shipments > 0 ? 'warning' : 'default'}
              sub={t('ui.stat_shipment_unit')}
            />
            <StatCard
              label={t('ui.yeni_musteri')}
              value={formatNumber(ov!.new_customers, 0)}
              icon={<Users className="w-3.5 h-3.5" />}
              variant="primary"
              sub={t('ui.stat_first_time_in_period')}
            />
            <StatCard
              label={t('ui.toplam_agirlik')}
              value={t('ui.stat_tons', { value: formatNumber(ov!.total_weight / 1000, 1) })}
              icon={<Wallet className="w-3.5 h-3.5" />}
              sub={t('ui.stat_packages', { count: formatNumber(ov!.total_quantity, 0) })}
            />
          </div>

          {/* === Ana grafikler grid === */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Aylık trend - 2 kolon kapla */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('statistics.charts.monthly_trend')}</CardTitle>
                <CardDescription>{t('ui.stat_rev_cost_profit')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.financial.monthly_trend.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data.financial.monthly_trend.map(p => ({
                      month: p.month,
                      revenue: Number(p.revenue || 0),
                      cost: Number(p.cost || 0),
                      profit: Number(p.profit || 0),
                    }))}>
                      <defs>
                        <linearGradient id="cRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="cCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="cProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{ fontSize: 12, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        formatter={((v: unknown) => formatMoney(Number(v), filters.currency || 'EUR')) as never}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="revenue" name={t('statistics.table.revenue')} stroke="#10b981" fill="url(#cRev)" strokeWidth={2} />
                      <Area type="monotone" dataKey="cost" name={t('ui.rep_cost')} stroke="#ef4444" fill="url(#cCost)" strokeWidth={2} />
                      <Area type="monotone" dataKey="profit" name={t('statistics.table.profit')} stroke="#6366f1" fill="url(#cProfit)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Mod dağılımı (pie) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('statistics.charts.mode_distribution')}</CardTitle>
                <CardDescription>{t('ui.ciroya_gore')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.modes.breakdown.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.modes.breakdown.map(m => ({
                          name: MODE_LABEL_KEYS[m.transport_type] ? t(MODE_LABEL_KEYS[m.transport_type]) : m.transport_type,
                          value: Number(m.revenue || 0),
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={2}
                      >
                        {data.modes.breakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 12, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        formatter={((v: unknown) => formatMoney(Number(v), filters.currency || 'EUR')) as never}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* === Para birimi + Durum + Belge eksikliği === */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('statistics.charts.currency_distribution')}</CardTitle>
                <CardDescription>{t('ui.tum_sevkiyatlar_filtreden_bagimsiz')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.financial.currency_breakdown.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <div className="space-y-2">
                    {data.financial.currency_breakdown.map((c) => (
                      <div key={c.currency_code} className="flex items-center justify-between text-sm">
                        <Badge variant="outline" className="font-mono">{c.currency_code}</Badge>
                        <div className="text-right">
                          <div className="font-mono">{formatMoney(c.revenue, c.currency_code)}</div>
                          <div className="text-[10px] text-muted-foreground">{t('ui.stat_shipments_count', { count: c.count })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('statistics.charts.status_distribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.operations.status_distribution.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart
                      data={data.operations.status_distribution.map(s => ({
                        name: STATUS_LABEL_KEYS[s.status] ? t(STATUS_LABEL_KEYS[s.status]) : s.status, value: s.count,
                      }))}
                      layout="vertical"
                    >
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" width={90} />
                      <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> {t('ui.belge_eksiklikleri')}
                </CardTitle>
                <CardDescription>{t('ui.en_cok_eksik_olan_belgeler')}</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(data.operations.doc_missing_top).length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">{t('ui.eksik_belge_yok')}</div>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(data.operations.doc_missing_top).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{DOC_LABEL_KEYS[k] ? t(DOC_LABEL_KEYS[k]) : (DOC_CODES[k] || k)}</span>
                        <Badge variant="warning">{v}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* === Müşteri tabloları === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('statistics.charts.top10_customers_revenue')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CustomerTable items={data.customers.top_revenue} currency={filters.currency || 'EUR'} field="revenue" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('statistics.charts.top10_customers_profit')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CustomerTable items={data.customers.top_profit} currency={filters.currency || 'EUR'} field="profit" />
              </CardContent>
            </Card>
          </div>

          {/* === Top kâr / düşük marj === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-success">{t('ui.top_5_karli_sevkiyat')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ShipmentProfitTable items={data.financial.top_profit} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-warning flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {t('ui.top_5_dusuk_marj')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ShipmentProfitTable items={data.financial.low_margin} />
              </CardContent>
            </Card>
          </div>

          {/* === Ödenmemiş faturalar === */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> {t('ui.stat_unpaid_invoices', { count: data.financial.unpaid_invoices.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.financial.unpaid_invoices.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">{t('ui.tum_faturalar_odenmis')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('statistics.table.shipment')}</TableHead>
                      <TableHead>{t('shipment.client')}</TableHead>
                      <TableHead>{t('statistics.table.invoice_no')}</TableHead>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead className="text-right">{t('statistics.table.amount')}</TableHead>
                      <TableHead className="text-right">{t('statistics.table.age')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.financial.unpaid_invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.shipment_no}</TableCell>
                        <TableCell className="text-sm">{inv.client_billing || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{inv.invoice_no || '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(inv.invoice_date)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(inv.sale_price, inv.currency_code)}</TableCell>
                        <TableCell className="text-right text-xs">
                          {inv.overdue ? (
                            <Badge variant="destructive">{t('ui.stat_days_overdue', { count: inv.days_old })}</Badge>
                          ) : (
                            <span className="text-muted-foreground">{t('ui.stat_days_count', { count: inv.days_old })}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* === Operasyon: araç + depo + güzergah + coğrafi === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5" /> {t('ui.arac_performansi')}
                </CardTitle>
                <CardDescription>{t('ui.donem_icindeki_atamalara_gore')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.operations.vehicle_performance.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">{t('common.no_data')}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('statistics.table.vehicle')}</TableHead>
                        <TableHead>{t('vehicle.driver')}</TableHead>
                        <TableHead className="text-right">{t('statistics.table.assignment')}</TableHead>
                        <TableHead className="text-right">{t('statistics.table.package')}</TableHead>
                        <TableHead className="text-right">{t('statistics.table.weight')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.operations.vehicle_performance.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">{v.plate}</TableCell>
                          <TableCell className="text-xs">{v.driver_name || '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{v.assignment_count}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs">{formatNumber(v.total_quantity, 0)}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs">{formatNumber(v.total_weight, 0)} kg</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <WhIcon className="w-3.5 h-3.5" /> {t('ui.depo_yuku')}
                </CardTitle>
                <CardDescription>{t('ui.aktif_depo_sevkiyatlari')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.operations.warehouse_load.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">{t('ui.depo_yok')}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('statistics.table.warehouse')}</TableHead>
                        <TableHead>{t('partner.type')}</TableHead>
                        <TableHead className="text-right">{t('statistics.table.active_shipments')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.operations.warehouse_load.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-medium text-xs">{w.name}</TableCell>
                          <TableCell><Badge variant="outline" className="font-mono">{w.warehouse_type}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums">{w.active_shipments}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* === Top güzergahlar === */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> {t('ui.top_10_guzergah')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.operations.top_routes.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">{t('common.no_data')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('shipment.route')}</TableHead>
                      <TableHead className="text-right">{t('statistics.table.shipment')}</TableHead>
                      <TableHead className="text-right">{t('statistics.table.revenue')}</TableHead>
                      <TableHead className="text-right">{t('statistics.table.avg_margin')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.operations.top_routes.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{r.route}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(r.revenue, filters.currency)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{formatNumber(r.avg_margin, 1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function EmptyChart() {
  const { t } = useTranslation()
  return (
    <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
      {t('ui.bu_donem_icin_veri_yok')}
    </div>
  )
}

function CustomerTable({
  items, currency, field,
}: { items: { client_billing: string; shipment_count: number; revenue: number | string; profit: number | string }[]; currency: string; field: 'revenue' | 'profit' }) {
  const { t } = useTranslation()
  if (items.length === 0) {
    return <div className="text-center py-6 text-xs text-muted-foreground">{t('ui.musteri_verisi_yok')}</div>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>{t('shipment.client')}</TableHead>
          <TableHead className="text-right">{t('statistics.table.shipment')}</TableHead>
          <TableHead className="text-right">{field === 'revenue' ? t('statistics.table.revenue') : t('statistics.table.profit')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((c, i) => (
          <TableRow key={c.client_billing}>
            <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
            <TableCell className="text-sm font-medium max-w-[200px] truncate">{c.client_billing}</TableCell>
            <TableCell className="text-right tabular-nums text-xs">{c.shipment_count}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(c[field], currency)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ShipmentProfitTable({ items }: { items: { shipment_no: string; client_billing: string; profit: number | string; margin: number | string; currency_code: string }[] }) {
  const { t } = useTranslation()
  if (items.length === 0) {
    return <div className="text-center py-6 text-xs text-muted-foreground">{t('common.no_data')}</div>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('statistics.table.file')}</TableHead>
          <TableHead>{t('shipment.client')}</TableHead>
          <TableHead className="text-right">{t('statistics.table.profit')}</TableHead>
          <TableHead className="text-right">{t('statistics.summary.margin')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((s) => (
          <TableRow key={s.shipment_no}>
            <TableCell className="font-mono text-xs">{s.shipment_no}</TableCell>
            <TableCell className="text-xs max-w-[160px] truncate">{s.client_billing || '—'}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(s.profit, s.currency_code)}</TableCell>
            <TableCell className="text-right tabular-nums text-xs">{formatNumber(s.margin, 1)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

