import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2, AlertCircle, Inbox, Plus, Truck, Ship, Plane, Search, ExternalLink, Package,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn, formatNumber } from '@/lib/utils'
import { useLoadPool, type LoadPoolItem, type LoadPoolStatus } from './hooks'
import { AssignmentFormDialog } from './AssignmentFormDialog'

const TRANSPORT_ICON: Record<string, React.ReactNode> = {
  road: <Truck className="w-3.5 h-3.5" />,
  maritime: <Ship className="w-3.5 h-3.5" />,
  sea: <Ship className="w-3.5 h-3.5" />,
  air: <Plane className="w-3.5 h-3.5" />,
}

const TRANSPORT_LABEL: Record<string, string> = {
  road: 'Karayolu', maritime: 'Denizyolu', sea: 'Denizyolu', air: 'Havayolu',
}

const TRANSPORT_SLUG: Record<string, string> = {
  road: 'karayolu', maritime: 'denizyolu', sea: 'denizyolu', air: 'havayolu',
}

const STATUS_FILTERS: Array<{ value: LoadPoolStatus; label: string; description: string }> = [
  { value: 'partial', label: 'Atama Bekleyenler', description: 'Hiç atanmamış + kısmen atanmış' },
  { value: 'unassigned', label: 'Hiç Atanmamış', description: 'Henüz hiç araç atanmamış' },
  { value: 'all', label: 'Tümü', description: 'Kapalı olmayan tüm sevkiyatlar' },
]

export function LoadPoolPanel() {
  const [status, setStatus] = useState<LoadPoolStatus>('partial')
  const [transportType, setTransportType] = useState<string>('')
  const [search, setSearch] = useState('')
  const [presetFor, setPresetFor] = useState<LoadPoolItem | null>(null)

  const { data: items = [], isLoading, error } = useLoadPool({
    status,
    transport_type: transportType || undefined,
    q: search.trim() || undefined,
  })

  const total = items.length
  const totalUnassigned = items.filter((i) => i.is_unassigned).length
  const totalPartial = items.filter((i) => !i.is_unassigned && !i.is_fully_assigned).length

  return (
    <div className="space-y-4">
      {/* Özet */}
      <Card className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Listelenen</div>
          <div className="text-xl font-bold">{total}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hiç Atanmamış</div>
          <div className="text-xl font-bold text-destructive">{totalUnassigned}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kısmen Atanmış</div>
          <div className="text-xl font-bold text-warning">{totalPartial}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mod Filtresi</div>
          <div className="text-xl font-bold">{transportType ? TRANSPORT_LABEL[transportType] : 'Tümü'}</div>
        </div>
      </Card>

      {/* Filtreler */}
      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[10px]">Durum</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as LoadPoolStatus)}>
            <SelectTrigger className="h-8 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  <div>
                    <div>{f.label}</div>
                    <div className="text-[10px] text-muted-foreground">{f.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Taşıma Modu</Label>
          <Select value={transportType || '__all__'} onValueChange={(v) => setTransportType(v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tümü</SelectItem>
              <SelectItem value="road">Karayolu</SelectItem>
              <SelectItem value="maritime">Denizyolu</SelectItem>
              <SelectItem value="air">Havayolu</SelectItem>
              <SelectItem value="import">İthalat</SelectItem>
              <SelectItem value="export">İhracat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <Label className="text-[10px]">Ara</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Sevkiyat No veya Müşteri..."
              className="pl-8 h-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{total} sevkiyat</div>
      </Card>

      {/* Tablo */}
      <Card className="overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">
              {status === 'unassigned'
                ? 'Hiç atanmamış sevkiyat yok 🎉'
                : status === 'partial'
                  ? 'Atama bekleyen sevkiyat yok 🎉'
                  : 'Sevkiyat bulunamadı'}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sevkiyat</TableHead>
                <TableHead>Müşteri / Güzergah</TableHead>
                <TableHead className="text-right">Toplam Kap</TableHead>
                <TableHead className="text-right">Atanan</TableHead>
                <TableHead className="text-right">Kalan</TableHead>
                <TableHead className="text-right">Toplam Ağırlık</TableHead>
                <TableHead className="text-right">Kalan Ağırlık</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-[180px] text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const slug = item.transport_type ? TRANSPORT_SLUG[item.transport_type] : null
                const editLink = slug ? `/shipments/${slug}/${item.id}/edit` : null
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="gap-1">
                          {item.transport_type && TRANSPORT_ICON[item.transport_type]}
                        </Badge>
                        <span className="font-mono text-xs font-medium">{item.shipment_no || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{item.client_billing || '—'}</div>
                      <div className="text-muted-foreground">
                        {item.departure_country || '?'} → {item.arrival_country || '?'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {item.total_quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                      {item.assigned_quantity}
                      <div className="text-[10px]">({item.assignment_count} atama)</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      <span className={cn(
                        'font-bold',
                        item.remaining_quantity > 0 && item.is_unassigned && 'text-destructive',
                        item.remaining_quantity > 0 && !item.is_unassigned && 'text-warning',
                      )}>
                        {item.remaining_quantity}
                      </span>
                      <div className="text-[10px] text-muted-foreground">kap</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                      {formatNumber(item.total_weight, 0)} kg
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      <span className={cn(
                        'font-bold',
                        item.remaining_weight > 0 && item.is_unassigned && 'text-destructive',
                        item.remaining_weight > 0 && !item.is_unassigned && 'text-warning',
                      )}>
                        {formatNumber(item.remaining_weight, 0)}
                      </span>
                      <div className="text-[10px] text-muted-foreground">kg</div>
                    </TableCell>
                    <TableCell>
                      {item.is_unassigned ? (
                        <Badge variant="destructive">Hiç atanmamış</Badge>
                      ) : item.is_fully_assigned ? (
                        <Badge variant="success">Tamamen atanmış</Badge>
                      ) : (
                        <Badge variant="warning">Kısmen</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editLink && (
                          <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Sevkiyatı aç">
                            <Link to={editLink}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => setPresetFor(item)}
                          disabled={item.is_fully_assigned}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Atama Yap
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

      {/* Bilgi */}
      <Card className="p-3 text-xs text-muted-foreground flex items-start gap-2">
        <Package className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          "Atama Yap" tıklayınca açılan formda araç + miktar seçersin; kalan kap/ağırlık otomatik dolacak ama düzenleyebilirsin.
          Kapalı sevkiyatlar ve depolama işlemleri burada listelenmez.
        </span>
      </Card>

      <AssignmentFormDialog
        open={!!presetFor}
        onOpenChange={(o) => !o && setPresetFor(null)}
        defaultShipmentId={presetFor?.id}
        defaultQuantity={presetFor?.remaining_quantity}
        defaultWeight={presetFor?.remaining_weight}
      />
    </div>
  )
}
