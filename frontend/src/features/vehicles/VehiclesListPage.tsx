import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  Plus, Search, Pencil, Trash2, Loader2, Truck, Ship, Plane, Inbox, AlertCircle,
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useVehicles, useDeleteVehicle, EQUIPMENT_BY_MODE, VEHICLE_STATUS_LABELS } from './hooks'
import { useVehicleSummary } from '@/features/lookup/hooks'
import { cn, formatNumber } from '@/lib/utils'
import type { Vehicle, VehicleTransport } from '@/types/api'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'

const MODE_TAB_DEFS: Array<{ value: VehicleTransport | 'all'; key: string; icon: React.ReactNode; gradient: string }> = [
  { value: 'all', key: 'common.all', icon: <Truck className="w-4 h-4" />, gradient: 'from-slate-500 to-slate-700' },
  { value: 'road', key: 'nav.road', icon: <Truck className="w-4 h-4" />, gradient: 'from-blue-500 to-indigo-600' },
  { value: 'sea', key: 'nav.maritime', icon: <Ship className="w-4 h-4" />, gradient: 'from-cyan-500 to-blue-600' },
  { value: 'air', key: 'nav.air', icon: <Plane className="w-4 h-4" />, gradient: 'from-sky-500 to-cyan-600' },
]

export function VehiclesListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<VehicleTransport | 'all'>('all')
  const MODE_TABS = MODE_TAB_DEFS.map((m) => ({ ...m, label: t(m.key) }))
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)

  const { data: vehicles = [], isLoading, error } = useVehicles(mode === 'all' ? undefined : mode)
  const { data: summaries = [] } = useVehicleSummary()
  const summaryMap = useMemo(() => Object.fromEntries(summaries.map((s) => [s.id, s])), [summaries])
  const deleteMut = useDeleteVehicle()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter((v) =>
      [v.plate, v.vehicle_code, v.trailer_plate, v.driver_name, v.brand_model]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [vehicles, search])

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`${deleteTarget.plate} silindi`)
        setDeleteTarget(null)
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  const currentTab = MODE_TABS.find((t) => t.value === mode)!

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br text-white flex items-center justify-center', currentTab.gradient)}>
            {currentTab.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('vehicle.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('nav.road')} / {t('nav.maritime')} / {t('nav.air')}</p>
          </div>
        </div>
        <Button onClick={() => navigate('/vehicles/new')}>
          <Plus className="w-4 h-4" />
          {t('vehicle.new')}
        </Button>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as VehicleTransport | 'all')}>
        <TabsList>
          {MODE_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.icon} {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('vehicle.search_placeholder')}
            className="pl-8 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground px-2">{filtered.length} {t('common.records')}</div>
        <ExportButton
          data={filtered}
          filename="araclar"
          sheetName="Araçlar"
          columns={[
            { header: 'Kod', key: 'vehicle_code' },
            { header: 'Plaka', key: 'plate' },
            { header: 'Dorse Plakası', key: 'trailer_plate' },
            { header: 'Mod', key: 'transport_type', format: (v) => ({road:'Karayolu',sea:'Denizyolu',air:'Havayolu'}[v as string] || String(v ?? '')) },
            { header: 'Ekipman Tipi', key: 'equipment_type' },
            { header: 'Kapasite (kg)', key: 'capacity_kg', format: (v) => exportFormatters.number(v) },
            { header: 'Hacim (m³)', key: 'volume_m3', format: (v) => exportFormatters.number(v, 3) },
            { header: 'Marka / Model', key: 'brand_model' },
            { header: 'Sürücü', key: 'driver_name' },
            { header: 'Telefon', key: 'driver_phone' },
            { header: 'Tescil Tarihi', key: 'registration_date', format: exportFormatters.date },
            { header: 'ADR Sertifikalı', key: 'adr_certified', format: exportFormatters.yesNo },
            { header: 'Durum', key: 'status', format: (v) => VEHICLE_STATUS_LABELS[v as string]?.label || String(v ?? '') },
            { header: 'Notlar', key: 'notes' },
          ]}
        />
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            {t('common.error')}: {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">
              {vehicles.length === 0 ? t('common.no_data') : t('common.no_results')}
            </div>
            {vehicles.length === 0 && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/vehicles/new')}>
                {t('vehicle.new')}
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{t('vehicle.equipment_type')}</TableHead>
                <TableHead>{t('vehicle.plate')}</TableHead>
                <TableHead>{t('reports.mode')}</TableHead>
                <TableHead>{t('vehicle.equipment_type')}</TableHead>
                <TableHead className="text-right">{t('vehicle.capacity')}</TableHead>
                <TableHead className="w-[160px]">{t('common.status')}</TableHead>
                <TableHead>{t('vehicle.driver')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const equipment = EQUIPMENT_BY_MODE[v.transport_type]?.find((e) => e.value === v.equipment_type)
                const status = VEHICLE_STATUS_LABELS[v.status]
                const modeBadge = MODE_TABS.find((m) => m.value === v.transport_type)
                return (
                  <TableRow key={v.id} className="cursor-pointer" onClick={() => navigate(`/vehicles/${v.id}/edit`)}>
                    <TableCell className="font-mono text-xs">{v.vehicle_code}</TableCell>
                    <TableCell className="font-medium font-mono">
                      {v.plate}
                      {v.trailer_plate && <div className="text-[10px] text-muted-foreground">+ {v.trailer_plate}</div>}
                    </TableCell>
                    <TableCell>
                      {modeBadge && (
                        <Badge variant="outline" className="gap-1">
                          {modeBadge.icon}
                          {modeBadge.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {equipment?.label || v.equipment_type}
                      {v.adr_certified ? (
                        <Badge variant="warning" className="ml-1.5">ADR</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      <div>{formatNumber(v.capacity_kg, 0)} kg</div>
                      <div className="text-muted-foreground">{formatNumber(v.volume_m3, 1)} m³</div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const sum = summaryMap[v.id]
                        if (!sum || !sum.assignment_count) {
                          return <span className="text-xs text-muted-foreground italic">Boş</span>
                        }
                        const pct = Math.min(100, sum.load_percent || 0)
                        const color = pct > 100 ? 'bg-destructive' : pct > 90 ? 'bg-warning' : pct > 50 ? 'bg-success' : 'bg-primary'
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] tabular-nums">
                              <span className="text-muted-foreground">{sum.assignment_count} atama</span>
                              <span className={cn('font-semibold', pct > 100 && 'text-destructive')}>%{pct.toFixed(0)}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={cn('h-full transition-all', color)} style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground tabular-nums">
                              {formatNumber(sum.total_weight, 0)} / {formatNumber(v.capacity_kg, 0)} kg
                            </div>
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {v.driver_name || '—'}
                      {v.driver_phone && <div className="text-muted-foreground">{v.driver_phone}</div>}
                    </TableCell>
                    <TableCell>
                      {status && <Badge variant={status.variant}>{status.label}</Badge>}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/vehicles/${v.id}/edit`)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(v)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aracı sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="font-mono text-foreground">{deleteTarget?.plate}</strong> ({deleteTarget?.vehicle_code}) silinecek.
              Aracın atamaları varsa silme reddedilecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
