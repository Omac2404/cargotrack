import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  Plus, Trash2, Loader2, ArrowRightLeft, Inbox, AlertCircle, Calendar,
  Truck, Ship, Plane, ListChecks, Package,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAssignments, useDeleteAssignment } from './hooks'
import { AssignmentFormDialog } from './AssignmentFormDialog'
import { LoadPoolPanel } from './LoadPoolPanel'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Assignment } from '@/types/api'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'

const TRANSPORT_ICON: Record<string, React.ReactNode> = {
  road: <Truck className="w-3.5 h-3.5" />,
  maritime: <Ship className="w-3.5 h-3.5" />,
  sea: <Ship className="w-3.5 h-3.5" />,
  air: <Plane className="w-3.5 h-3.5" />,
}

export function AssignmentsListPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'list' | 'pool'>('list')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Assignment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null)

  const { data: assignments = [], isLoading, error } = useAssignments()
  const deleteMut = useDeleteAssignment()

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Atama silindi')
        setDeleteTarget(null)
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('assignment.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('nav.vehicles')} ↔ {t('nav.shipments')}</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('assignment.new')}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'list' | 'pool')}>
        <TabsList>
          <TabsTrigger value="list">
            <ListChecks className="w-3.5 h-3.5" /> {t('assignment.list')}
          </TabsTrigger>
          <TabsTrigger value="pool">
            <Package className="w-3.5 h-3.5" /> {t('assignment.load_pool')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          <Card className="p-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div>{t('common.total')} {assignments.length}</div>
            <ExportButton
              data={assignments as unknown as Record<string, unknown>[]}
              filename="atamalar"
              sheetName="Atamalar"
              columns={[
                { header: 'Sevkiyat No', key: 'shipment_no' },
                { header: 'Müşteri', key: 'client_billing' },
                { header: 'Mod', key: 'transport_type', format: (v) => ({road:'Karayolu',maritime:'Denizyolu',sea:'Denizyolu',air:'Havayolu',storage:'Depo',import:'İthalat',export:'İhracat'}[v as string] || String(v ?? '')) },
                { header: 'Çıkış', key: 'departure_country' },
                { header: 'Varış', key: 'arrival_country' },
                { header: 'Araç Kodu', key: 'vehicle_code' },
                { header: 'Plaka', key: 'plate' },
                { header: 'Sürücü', key: 'driver_name' },
                { header: 'Atanan Kap', key: 'assigned_quantity', format: (v) => exportFormatters.number(v, 0) },
                { header: 'Toplam Kap', key: 'shipment_quantity', format: (v) => exportFormatters.number(v, 0) },
                { header: 'Atanan Ağırlık (kg)', key: 'assigned_weight', format: (v) => exportFormatters.number(v) },
                { header: 'Toplam Ağırlık (kg)', key: 'shipment_weight', format: (v) => exportFormatters.number(v) },
                { header: 'Yükleme Tarihi', key: 'loading_date', format: exportFormatters.date },
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
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">{t('common.no_data')}</div>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
              {t('assignment.new')}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('nav.shipments')}</TableHead>
                <TableHead>{t('shipment.client')} / {t('shipment.route')}</TableHead>
                <TableHead>{t('nav.vehicles')}</TableHead>
                <TableHead className="text-right">{t('assignment.assigned_quantity')} / {t('assignment.assigned_weight')}</TableHead>
                <TableHead>{t('assignment.loading_date')}</TableHead>
                <TableHead>{t('common.details')}</TableHead>
                <TableHead className="w-[60px] text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="gap-1">
                        {a.transport_type && TRANSPORT_ICON[a.transport_type]}
                      </Badge>
                      <span className="font-mono text-xs font-medium">{a.shipment_no || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{a.client_billing || '—'}</div>
                    <div className="text-muted-foreground">
                      {a.departure_country || '?'} → {a.arrival_country || '?'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs font-medium">{a.plate || '—'}</div>
                    {a.driver_name && <div className="text-[10px] text-muted-foreground">{a.driver_name}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    <div>
                      <strong>{a.assigned_quantity}</strong> / {a.shipment_quantity || '?'} kap
                    </div>
                    <div className="text-muted-foreground">
                      {formatNumber(a.assigned_weight, 0)} / {formatNumber(a.shipment_weight, 0)} kg
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.loading_date ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(a.loading_date)}
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                    {a.notes || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(a)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
        </TabsContent>

        <TabsContent value="pool" className="mt-4">
          <LoadPoolPanel />
        </TabsContent>
      </Tabs>

      <AssignmentFormDialog
        open={createOpen || !!editTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false)
            setEditTarget(null)
          }
        }}
        assignment={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="font-mono text-foreground">{deleteTarget?.plate}</strong> → <strong className="font-mono text-foreground"> {deleteTarget?.shipment_no}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
