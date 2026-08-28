import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { useMonthlyRevenue } from './hooks'
import { ReportLoading, ReportError } from './ReportsPage'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'
import { formatMoney, formatNumber } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

// i18n anahtarları — t() render anında çağrılır
const MODES = [
  { value: '__all__', labelKey: 'reports.all_modes' },
  { value: 'road', labelKey: 'transport.modes.road' },
  { value: 'maritime', labelKey: 'transport.modes.maritime' },
  { value: 'air', labelKey: 'transport.modes.air' },
  { value: 'storage', labelKey: 'transport.modes.storage' },
  { value: 'import', labelKey: 'transport.modes.import' },
  { value: 'export', labelKey: 'transport.modes.export' },
]

export function MonthlyRevenueReport() {
  const { t } = useTranslation()
  const [year, setYear] = useState(CURRENT_YEAR)
  const [mode, setMode] = useState<string>('__all__')

  const { data, isLoading, error } = useMonthlyRevenue(year, mode === '__all__' ? undefined : mode)

  if (isLoading) return <ReportLoading />
  if (error) return <ReportError error={error} />
  if (!data) return null

  const { series, totals } = data

  return (
    <div className="space-y-4">
      {/* Filtreler + Özet */}
      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[10px]">{t('reports.year')}</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">{t('reports.mode')}</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODES.map((m) => <SelectItem key={m.value} value={m.value}>{t(m.labelKey)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <ExportButton
            data={series as unknown as Record<string, unknown>[]}
            filename={`aylik_ciro_${year}_${mode === '__all__' ? 'tumu' : mode}`}
            sheetName={t('reports.monthly_revenue')}
            columns={[
              { header: t('ui.rep_month'), key: 'month_name' },
              { header: t('ui.rep_shipment_count'), key: 'shipment_count' },
              { header: t('ui.rep_total_sale_eur'), key: 'total_sale', format: (v) => exportFormatters.number(v) },
              { header: t('ui.rep_total_purchase_eur'), key: 'total_purchase', format: (v) => exportFormatters.number(v) },
              { header: t('ui.rep_profit_eur'), key: 'profit', format: (v) => exportFormatters.number(v) },
              { header: t('transport.columns.margin'), key: 'margin', format: (v) => exportFormatters.number(v, 2) },
            ]}
          />
        </div>
      </Card>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label={t('statistics.table.shipment')} value={String(totals.shipment_count)} sub={t('ui.rep_unit_pcs')} />
        <SummaryCard label={t('statistics.table.revenue')} value={formatMoney(totals.total_sale, 'EUR')} variant="success" />
        <SummaryCard label={t('ui.rep_cost')} value={formatMoney(totals.total_purchase, 'EUR')} variant="destructive" />
        <SummaryCard label={t('statistics.table.profit')} value={formatMoney(totals.profit, 'EUR')} variant={totals.profit >= 0 ? 'success' : 'destructive'} />
        <SummaryCard label={t('statistics.summary.margin')} value={`%${formatNumber(totals.margin, 1)}`} variant={totals.margin >= 15 ? 'success' : totals.margin >= 5 ? 'warning' : 'destructive'} />
      </div>

      {/* Bar grafik: aylık ciro vs maliyet */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t('ui.rep_monthly_rev_cost_profit', { year })}
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month_name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
            <Tooltip formatter={((v: unknown) => formatMoney(Number(v), 'EUR')) as never} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="total_sale" name={t('statistics.table.revenue')} fill="hsl(var(--primary))" />
            <Bar dataKey="total_purchase" name={t('ui.rep_cost')} fill="hsl(var(--destructive) / 0.7)" />
            <Bar dataKey="profit" name={t('statistics.table.profit')} fill="hsl(var(--success))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Line grafik: marj trendi */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t('ui.rep_margin_trend', { year })}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month_name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `%${v.toFixed(0)}`} />
            <Tooltip formatter={((v: unknown) => `%${Number(v).toFixed(2)}`) as never} />
            <Line type="monotone" dataKey="margin" name={t('statistics.summary.margin')} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Detaylı tablo */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ui.rep_month')}</TableHead>
              <TableHead className="text-right">{t('statistics.table.shipment')}</TableHead>
              <TableHead className="text-right">{t('statistics.table.revenue')}</TableHead>
              <TableHead className="text-right">{t('ui.rep_cost')}</TableHead>
              <TableHead className="text-right">{t('statistics.table.profit')}</TableHead>
              <TableHead className="text-right">{t('statistics.summary.margin')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((m) => (
              <TableRow key={m.month}>
                <TableCell className="font-medium">{m.month_name}</TableCell>
                <TableCell className="text-right tabular-nums">{m.shipment_count}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(m.total_sale, 'EUR')}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(m.total_purchase, 'EUR')}</TableCell>
                <TableCell className={`text-right tabular-nums font-medium ${m.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatMoney(m.profit, 'EUR')}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  %{formatNumber(m.margin, 1)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value, sub, variant }: {
  label: string; value: string; sub?: string; variant?: 'success' | 'destructive' | 'warning'
}) {
  const cls = variant === 'success' ? 'text-success border-success/30 bg-success/5'
    : variant === 'destructive' ? 'text-destructive border-destructive/30 bg-destructive/5'
    : variant === 'warning' ? 'text-warning border-warning/30 bg-warning/5'
    : ''
  return (
    <Card className={`p-3 ${cls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-1">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </Card>
  )
}
