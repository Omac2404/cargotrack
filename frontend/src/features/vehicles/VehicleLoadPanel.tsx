import { Link } from 'react-router-dom'
import { Package, Loader2, AlertCircle, Inbox, ExternalLink, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { cn, formatNumber, formatDate } from '@/lib/utils'
import { useVehicleLoad } from './hooks'

const MODE_SLUG: Record<string, string> = {
  road: 'karayolu', maritime: 'denizyolu', sea: 'denizyolu', air: 'havayolu',
  storage: 'depolama', import: 'ithalat', export: 'ihracat',
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' }> = {
  draft: { label: 'Taslak', variant: 'secondary' },
  in_progress: { label: 'Devam Ediyor', variant: 'default' },
  to_invoice: { label: 'Faturalanacak', variant: 'warning' },
  closed: { label: 'Kapalı', variant: 'success' },
}

interface Props {
  vehicleId: number
}

export function VehicleLoadPanel({ vehicleId }: Props) {
  const { data, isLoading, error } = useVehicleLoad(vehicleId)

  if (isLoading) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </Card>
    )
  }
  if (error) {
    return (
      <Card className="p-6 text-center text-destructive">
        <AlertCircle className="w-6 h-6 mx-auto mb-2" />
        {(error as Error).message}
      </Card>
    )
  }
  if (!data) return null

  const { summary, assignments, vehicle } = data
  const pct = Math.min(100, summary.load_percent)
  const overCapacity = summary.load_percent > 100
  const barColor = overCapacity
    ? 'bg-destructive'
    : pct > 90 ? 'bg-warning' : pct > 50 ? 'bg-success' : 'bg-primary'

  return (
    <div className="space-y-4">
      {/* Özet kart — kapasite kullanımı */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
          <Stat
            label="Atama Sayısı"
            value={String(summary.assignment_count)}
            sub={summary.assignment_count === 0 ? 'Henüz yük yok' : 'sevkiyat'}
          />
          <Stat
            label="Toplam Kap"
            value={formatNumber(summary.total_quantity, 0)}
            sub="kap"
          />
          <Stat
            label="Toplam Ağırlık"
            value={formatNumber(summary.total_weight, 0)}
            sub={`/ ${formatNumber(vehicle.capacity_kg, 0)} kg`}
          />
          <Stat
            label="Kalan Kapasite"
            value={formatNumber(summary.remaining_capacity_kg, 0)}
            sub="kg"
            highlight={overCapacity ? 'destructive' : undefined}
          />
        </div>

        {/* Progress bar */}
        {vehicle.capacity_kg > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Kapasite Kullanımı</span>
              <span className={cn('font-semibold tabular-nums', overCapacity && 'text-destructive')}>
                %{summary.load_percent.toFixed(1)}
                {overCapacity && ' (aşıldı!)'}
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full transition-all', barColor)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </Card>

      {/* Atamalar tablosu */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Yüklenen Sevkiyatlar ({assignments.length})
          </h3>
        </div>

        {assignments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">Bu araca henüz yük atanmamış.</div>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/assignments">
                <ExternalLink className="w-3.5 h-3.5" />
                Atamalar sayfasına git
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sevkiyat No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Güzergah</TableHead>
                <TableHead>Yükleme</TableHead>
                <TableHead className="text-right">Atanan Kap</TableHead>
                <TableHead className="text-right">Atanan Ağırlık</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-[60px] text-right">Aç</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => {
                const status = a.shipment_status ? STATUS_LABELS[a.shipment_status] : null
                const slug = a.shipment_transport ? MODE_SLUG[a.shipment_transport] : null
                const editLink = slug && a.shipment_id ? `/shipments/${slug}/${a.shipment_id}/edit` : null
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs font-medium">{a.shipment_no || '—'}</TableCell>
                    <TableCell className="text-xs">{a.client_billing || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.departure_country || '?'} → {a.arrival_country || '?'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.loading_date ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(a.loading_date)}
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      <div className="font-semibold">{a.assigned_quantity}</div>
                      <div className="text-[10px] text-muted-foreground">/ {a.shipment_total_quantity || '?'}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      <div className="font-semibold">{formatNumber(a.assigned_weight, 0)} kg</div>
                      <div className="text-[10px] text-muted-foreground">/ {formatNumber(a.shipment_total_weight, 0)} kg</div>
                    </TableCell>
                    <TableCell>
                      {status && <Badge variant={status.variant}>{status.label}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {editLink && (
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                          <Link to={editLink} title="Sevkiyatı aç">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}

function Stat({
  label, value, sub, highlight,
}: { label: string; value: string; sub?: string; highlight?: 'destructive' | 'warning' }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      <div className={cn(
        'text-2xl font-bold tabular-nums',
        highlight === 'destructive' && 'text-destructive',
        highlight === 'warning' && 'text-warning',
      )}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  )
}
