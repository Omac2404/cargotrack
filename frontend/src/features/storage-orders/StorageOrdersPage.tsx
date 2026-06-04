import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, Search, Loader2, Inbox, AlertCircle, FileSpreadsheet, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Tabs, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { useStorageOrders } from './hooks'
import { useWarehouses } from '@/features/warehouses/hooks'
import { computeTransitAlert } from '@/lib/constants/storage'
import { getStorageReportUrl, openPdf } from '@/features/pdf/hooks'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Shipment } from '@/types/api'

export function StorageOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | 'all'>('active')
  const [search, setSearch] = useState('')

  const { data: orders = [], isLoading, error } = useStorageOrders({ status: statusFilter })
  const { data: warehouses = [] } = useWarehouses()
  const whMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.name, w])), [warehouses])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((s) =>
      [s.shipment_no, s.depo_musteri, s.client_billing, s.warehouse]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [orders, search])

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Depolama Siparişleri</h1>
            <p className="text-xs text-muted-foreground">Aktif depo sevkiyatları + transit süre uyarıları</p>
          </div>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'active' | 'closed' | 'all')}>
        <TabsList>
          <TabsTrigger value="active">Aktif</TabsTrigger>
          <TabsTrigger value="closed">Kapalı</TabsTrigger>
          <TabsTrigger value="all">Tümü</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-3 flex items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Dosya, müşteri, depo ara..."
            className="pl-8 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground px-2">{filtered.length} sipariş</div>
      </Card>

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
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            Sonuç yok
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dosya No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Depo</TableHead>
                <TableHead>Giriş / Çıkış</TableHead>
                <TableHead className="text-right">Kap</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Transit</TableHead>
                <TableHead className="w-[100px] text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: Shipment) => {
                const wh = s.warehouse ? whMap[s.warehouse] : undefined
                const transit = computeTransitAlert({
                  warehouse_type: wh?.type_code,
                  entry_date: s.entry_date,
                })
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link to={`/shipments/storage/${s.id}/edit`} className="font-mono font-medium text-primary hover:underline">
                        {s.shipment_no}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{s.depo_musteri || s.client_billing || '—'}</TableCell>
                    <TableCell className="text-xs">
                      <div>{s.warehouse || '—'}</div>
                      {wh && <div className="text-muted-foreground">{wh.warehouse_code} · {wh.type_code}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1 text-success">
                        <Calendar className="w-3 h-3" />{formatDate(s.entry_date)}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />{formatDate(s.exit_date) || 'devam'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(s.depo_kap_sayisi, 0)}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'closed' ? 'secondary' : 'success'}>
                        {s.status === 'closed' ? 'Kapalı' : 'Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {transit.active ? (
                        <Badge variant={transit.severity === 'danger' ? 'destructive' : transit.severity === 'warning' ? 'warning' : 'default'}>
                          {transit.days_remaining !== null && transit.days_remaining > 0
                            ? `${transit.days_remaining} gün`
                            : `${Math.abs(transit.days_remaining ?? 0)} gün geçti`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => openPdf(getStorageReportUrl(s.id))} title="Depo Raporu PDF">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </Button>
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
