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

const MODE_LABELS: Record<string, string> = {
  road: 'Karayolu', maritime: 'Denizyolu', air: 'Havayolu', storage: 'Depolama',
  import: 'İthalat', export: 'İhracat',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak', in_progress: 'Devam', to_invoice: 'Faturalanacak', closed: 'Kapalı',
}

const DOC_LABELS: Record<string, string> = {
  invoice: 'Fatura', packing_list: 'Çeki Listesi', bl: 'BL', awb: 'AWB', cmr: 'CMR',
  atr: 'ATR', eur1: 'EUR.1', certificate_origin: 'Menşe', customs_declaration: 'Gümrük Beyan.',
  insurance_policy: 'Sigorta', weight_certificate: 'Ağırlık', fumigation: 'Fümigasyon',
}

// 30 gün önce / bugün defaultları
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const QUICK_RANGES = [
  { label: 'Son 7 Gün', days: 7 },
  { label: 'Son 30 Gün', days: 30 },
  { label: 'Son 90 Gün', days: 90 },
  { label: 'Bu Yıl', custom: () => ({ from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) }) },
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
                <SelectItem value="__all__">Tüm Modlar</SelectItem>
                <SelectItem value="road">Karayolu</SelectItem>
                <SelectItem value="maritime">Denizyolu</SelectItem>
                <SelectItem value="air">Havayolu</SelectItem>
                <SelectItem value="storage">Depolama</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Para Birimi</Label>
            <CurrencyCombobox
              value={filters.currency || 'EUR'}
              onChange={(v) => setFilters((f) => ({ ...f, currency: v }))}
              className="h-8 w-[180px]"
            />
          </div>

          <div className="flex items-center gap-1.5 ml-auto pl-2 border-l">
            {QUICK_RANGES.map((q) => (
              <button
                key={q.label}
                onClick={() => handleQuickRange(q)}
                className="text-xs px-2 py-1 rounded border border-input hover:bg-accent transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>
              {formatDate(data.filters.date_from)} → {formatDate(data.filters.date_to)} ·
              {data.filters.period_days} gün
              {data.filters.transport_type && ` · ${MODE_LABELS[data.filters.transport_type]}`} ·
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
              sub={`Maliyet: ${formatMoney(ov!.total_cost, filters.currency)}`}
            />
            <StatCard
              label={t('statistics.summary.margin')}
              value={`${formatNumber(ov!.avg_margin, 1)}%`}
              icon={<Activity className="w-3.5 h-3.5" />}
              variant={ov!.avg_margin >= cmp!.prev_avg_margin ? 'success' : 'warning'}
              sub={`prev: ${formatNumber(cmp!.prev_avg_margin, 1)}%`}
            />

            <StatCard
              label="Ödenmemiş"
              value={formatMoney(ov!.unpaid_total, filters.currency)}
              icon={<Receipt className="w-3.5 h-3.5" />}
              variant={ov!.overdue_count > 0 ? 'destructive' : 'default'}
              sub={`${ov!.unpaid_count} fatura · ${ov!.overdue_count} gecikmiş`}
            />
            <StatCard
              label="Belge Eksik"
              value={formatNumber(ov!.missing_doc_shipments, 0)}
              icon={<FileX className="w-3.5 h-3.5" />}
              variant={ov!.missing_doc_shipments > 0 ? 'warning' : 'default'}
              sub="sevkiyat"
            />
            <StatCard
              label="Yeni Müşteri"
              value={formatNumber(ov!.new_customers, 0)}
              icon={<Users className="w-3.5 h-3.5" />}
              variant="primary"
              sub="dönem içinde ilk kez"
            />
            <StatCard
              label="Toplam Ağırlık"
              value={`${formatNumber(ov!.total_weight / 1000, 1)} ton`}
              icon={<Wallet className="w-3.5 h-3.5" />}
              sub={`${formatNumber(ov!.total_quantity, 0)} kap`}
            />
          </div>

          {/* === Ana grafikler grid === */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Aylık trend - 2 kolon kapla */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('statistics.charts.monthly_trend')}</CardTitle>
                <CardDescription>Ciro / Maliyet / Kâr</CardDescription>
              </CardHeader>
              <CardContent>
                {data.financial.monthly_trend.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data.financial.monthly_trend.map(p => ({
                      month: p.month,
                      Ciro: Number(p.revenue || 0),
                      Maliyet: Number(p.cost || 0),
                      Kâr: Number(p.profit || 0),
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
                      <Area type="monotone" dataKey="Ciro" stroke="#10b981" fill="url(#cRev)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Maliyet" stroke="#ef4444" fill="url(#cCost)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Kâr" stroke="#6366f1" fill="url(#cProfit)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Mod dağılımı (pie) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('statistics.charts.mode_distribution')}</CardTitle>
                <CardDescription>Ciroya göre</CardDescription>
              </CardHeader>
              <CardContent>
                {data.modes.breakdown.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.modes.breakdown.map(m => ({
                          name: MODE_LABELS[m.transport_type] || m.transport_type,
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
                <CardDescription>Tüm sevkiyatlar (filtreden bağımsız)</CardDescription>
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
                          <div className="text-[10px] text-muted-foreground">{c.count} sevkiyat</div>
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
                        name: STATUS_LABELS[s.status] || s.status, value: s.count,
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
                  <FileText className="w-3.5 h-3.5" /> Belge Eksiklikleri
                </CardTitle>
                <CardDescription>En çok eksik olan belgeler</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(data.operations.doc_missing_top).length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">Eksik belge yok 🎉</div>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(data.operations.doc_missing_top).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{DOC_LABELS[k] || k}</span>
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
                <CardTitle className="text-sm text-success">⭐ Top 5 Kârlı Sevkiyat</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ShipmentProfitTable items={data.financial.top_profit} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-warning flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Top 5 Düşük Marj
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
                <Clock className="w-3.5 h-3.5" /> Ödenmemiş Faturalar ({data.financial.unpaid_invoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.financial.unpaid_invoices.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Tüm faturalar ödenmiş 💰</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sevkiyat</TableHead>
                      <TableHead>Müşteri</TableHead>
                      <TableHead>Fatura No</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead className="text-right">Yaş</TableHead>
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
                            <Badge variant="destructive">{inv.days_old} gün gecikmiş</Badge>
                          ) : (
                            <span className="text-muted-foreground">{inv.days_old} gün</span>
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
                  <Truck className="w-3.5 h-3.5" /> Araç Performansı
                </CardTitle>
                <CardDescription>Dönem içindeki atamalara göre</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.operations.vehicle_performance.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">Veri yok</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Araç</TableHead>
                        <TableHead>Sürücü</TableHead>
                        <TableHead className="text-right">Atama</TableHead>
                        <TableHead className="text-right">Kap</TableHead>
                        <TableHead className="text-right">Ağırlık</TableHead>
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
                  <WhIcon className="w-3.5 h-3.5" /> Depo Yükü
                </CardTitle>
                <CardDescription>Aktif depo sevkiyatları</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.operations.warehouse_load.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">Depo yok</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Depo</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead className="text-right">Aktif Sevkiyat</TableHead>
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
                <MapPin className="w-3.5 h-3.5" /> Top 10 Güzergah
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.operations.top_routes.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Veri yok</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Güzergah</TableHead>
                      <TableHead className="text-right">Sevkiyat</TableHead>
                      <TableHead className="text-right">Ciro</TableHead>
                      <TableHead className="text-right">Ort. Marj</TableHead>
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
  return (
    <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
      Bu dönem için veri yok
    </div>
  )
}

function CustomerTable({
  items, currency, field,
}: { items: { client_billing: string; shipment_count: number; revenue: number | string; profit: number | string }[]; currency: string; field: 'revenue' | 'profit' }) {
  if (items.length === 0) {
    return <div className="text-center py-6 text-xs text-muted-foreground">Müşteri verisi yok</div>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Müşteri</TableHead>
          <TableHead className="text-right">Sevkiyat</TableHead>
          <TableHead className="text-right">{field === 'revenue' ? 'Ciro' : 'Kâr'}</TableHead>
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
  if (items.length === 0) {
    return <div className="text-center py-6 text-xs text-muted-foreground">Veri yok</div>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dosya</TableHead>
          <TableHead>Müşteri</TableHead>
          <TableHead className="text-right">Kâr</TableHead>
          <TableHead className="text-right">Marj</TableHead>
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

