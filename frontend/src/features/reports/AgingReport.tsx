import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { modeSlug } from '@/features/shipments/modeConfig'
import { useAging } from './hooks'
import { ReportLoading, ReportError } from './ReportsPage'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'
import { formatMoney, formatDate } from '@/lib/utils'

const BUCKET_COLORS: Record<string, string> = {
  current: 'hsl(var(--success))',
  d30_60: 'hsl(var(--primary))',
  d60_90: 'hsl(var(--warning))',
  d90_plus: 'hsl(var(--destructive))',
}

const BUCKET_VARIANTS: Record<string, 'success' | 'default' | 'warning' | 'destructive'> = {
  current: 'success',
  d30_60: 'default',
  d60_90: 'warning',
  d90_plus: 'destructive',
}

export function AgingReport() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useAging()

  if (isLoading) return <ReportLoading />
  if (error) return <ReportError error={error} />
  if (!data) return null

  // Tüm item'ları düz liste haline getir (export için)
  const allItems = data.buckets.flatMap((b) =>
    b.items.map((it) => ({ ...it, bucket: b.label }))
  )

  // Pie chart data
  const pieData = data.buckets
    .filter((b) => b.total > 0)
    .map((b) => ({ name: b.label, value: b.total, key: b.key }))

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div className="text-sm">
          <span className="text-muted-foreground">{t('ui.toplam_bekleyen')} </span>
          <strong className="text-destructive text-base">{formatMoney(data.total_unpaid, 'EUR')}</strong>
          <span className="text-muted-foreground ml-2">({data.total_count} fatura)</span>
        </div>
        <div className="ml-auto">
          <ExportButton
            data={allItems as unknown as Record<string, unknown>[]}
            filename="yaslanan_alacak"
            sheetName="Yaşlanan Alacak"
            columns={[
              { header: 'Sevkiyat', key: 'shipment_no' },
              { header: 'Müşteri', key: 'client' },
              { header: 'Fatura No', key: 'invoice_no' },
              { header: 'Fatura Tarihi', key: 'invoice_date', format: exportFormatters.date },
              { header: 'Tutar', key: 'amount', format: (v) => exportFormatters.number(v) },
              { header: 'Para Birimi', key: 'currency' },
              { header: 'Gün', key: 'days_overdue' },
              { header: 'Yaş Grubu', key: 'bucket' },
            ]}
          />
        </div>
      </Card>

      {/* Bucket özet kartları + pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="grid grid-cols-2 gap-3">
          {data.buckets.map((b) => (
            <Card key={b.key} className="p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {b.label}
              </div>
              <div className="text-xl font-bold tabular-nums mt-1" style={{ color: BUCKET_COLORS[b.key] }}>
                {formatMoney(b.total, 'EUR')}
              </div>
              <div className="text-[10px] text-muted-foreground">{b.items.length} fatura</div>
            </Card>
          ))}
        </div>

        <Card className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t('ui.dagilim')}
          </h3>
          {pieData.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">{t('common.no_data')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e: { value: number }) => `${Math.round(e.value / 1000)}K`}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={BUCKET_COLORS[entry.key] || '#888'} />
                  ))}
                </Pie>
                <Tooltip formatter={((v: unknown) => formatMoney(Number(v), 'EUR')) as never} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Detaylı tablo */}
      {data.buckets.map((b) =>
        b.items.length > 0 ? (
          <Card key={b.key} className="overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: BUCKET_COLORS[b.key] }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                {b.label} — {formatMoney(b.total, 'EUR')} ({b.items.length} fatura)
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('statistics.table.shipment')}</TableHead>
                  <TableHead>{t('shipment.client')}</TableHead>
                  <TableHead>{t('statistics.table.invoice_no')}</TableHead>
                  <TableHead>{t('ui.fatura_tarihi')}</TableHead>
                  <TableHead className="text-right">{t('statistics.table.amount')}</TableHead>
                  <TableHead className="text-right">{t('ui.gun')}</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {b.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono text-xs">{it.shipment_no}</TableCell>
                    <TableCell className="text-sm">{it.client}</TableCell>
                    <TableCell className="font-mono text-xs">{it.invoice_no || '—'}</TableCell>
                    <TableCell className="text-xs">{formatDate(it.invoice_date)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatMoney(it.amount, it.currency)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={BUCKET_VARIANTS[b.key]}>{it.days_overdue}g</Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                        <Link to={`/shipments/${modeSlug(it.transport_type)}/${it.id}/edit`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : null
      )}

      {data.total_count === 0 && (
        <Card className="p-12 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto text-success/40 mb-2" />
          <div className="font-semibold text-success">{t('ui.bekleyen_alacak_yok')}</div>
          <div className="text-xs text-muted-foreground">{t('ui.tum_faturalar_odenmis_veya_henuz_faturali_se')}</div>
        </Card>
      )}
    </div>
  )
}
