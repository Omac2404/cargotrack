import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { useVehicleUtilization } from './hooks'
import { ReportLoading, ReportError } from './ReportsPage'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'
import { cn, formatNumber } from '@/lib/utils'

function defaultDates() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 30)
  return {
    start: start.toISOString().slice(0, 10),
    end: today.toISOString().slice(0, 10),
  }
}

// i18n anahtarları — t() render anında çağrılır
const MODE_LABEL_KEYS: Record<string, string> = {
  road: 'transport.modes.road', sea: 'transport.modes.sea', air: 'transport.modes.air',
}

export function VehicleUtilReport() {
  const { t } = useTranslation()
  const [{ start, end }, setRange] = useState(defaultDates())
  const { data, isLoading, error } = useVehicleUtilization(start, end)

  if (isLoading) return <ReportLoading />
  if (error) return <ReportError error={error} />
  if (!data) return null

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[10px]">{t('reports.start')}</Label>
          <Input type="date" value={start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} className="h-8 w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">{t('reports.end')}</Label>
          <Input type="date" value={end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} className="h-8 w-[160px]" />
        </div>
        <div className="text-xs text-muted-foreground">
          {t('ui.rep_vehicles_summary', { vehicles: data.vehicles.length, count: data.vehicles.reduce((s, v) => s + v.assignment_count, 0) })}
        </div>
        <div className="ml-auto">
          <ExportButton
            data={data.vehicles as unknown as Record<string, unknown>[]}
            filename={`arac_doluluk_${start}_${end}`}
            sheetName={t('reports.vehicle_utilization')}
            columns={[
              { header: t('archive.columns.code'), key: 'vehicle_code' },
              { header: t('vehicle.plate'), key: 'plate' },
              { header: t('reports.mode'), key: 'transport_type', format: (v) => { const k = MODE_LABEL_KEYS[v as string]; return k ? t(k) : String(v ?? '') } },
              { header: t('transport.vehicle_labels.capacity'), key: 'capacity_kg', format: (v) => exportFormatters.number(v) },
              { header: t('ui.atama_sayisi'), key: 'assignment_count' },
              { header: t('ui.toplam_kap'), key: 'total_quantity' },
              { header: t('ui.rep_total_weight_kg'), key: 'total_weight', format: (v) => exportFormatters.number(v) },
              { header: t('ui.rep_avg_util_pct'), key: 'avg_utilization', format: (v) => exportFormatters.number(v, 1) },
            ]}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('statistics.table.vehicle')}</TableHead>
              <TableHead>{t('reports.mode')}</TableHead>
              <TableHead className="text-right">{t('vehicle.capacity')}</TableHead>
              <TableHead className="text-right">{t('statistics.table.assignment')}</TableHead>
              <TableHead className="text-right">{t('ui.toplam_kap')}</TableHead>
              <TableHead className="text-right">{t('ui.toplam_agirlik')}</TableHead>
              <TableHead className="w-[180px]">{t('ui.rep_avg_util')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.vehicles.map((v) => {
              const pct = v.avg_utilization
              const barColor = pct > 90 ? 'bg-warning' : pct > 50 ? 'bg-success' : pct > 0 ? 'bg-primary' : 'bg-muted'
              return (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-mono text-xs font-medium">{v.plate}</div>
                    <div className="text-[10px] text-muted-foreground">{v.vehicle_code}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{MODE_LABEL_KEYS[v.transport_type] ? t(MODE_LABEL_KEYS[v.transport_type]) : v.transport_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{formatNumber(v.capacity_kg, 0)} kg</TableCell>
                  <TableCell className="text-right tabular-nums">{v.assignment_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.total_quantity}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{formatNumber(v.total_weight, 0)} kg</TableCell>
                  <TableCell>
                    {v.assignment_count > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs tabular-nums font-semibold text-right">%{pct.toFixed(1)}</div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full transition-all', barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">{t('ui.atama_yok')}</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
