import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save, AlertCircle, Truck, Package } from 'lucide-react'

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/shared/Combobox'
import { useVehicles } from '@/features/vehicles/hooks'
import { useShipments } from '@/features/shipments/hooks'
import { useAssignments, useSaveAssignment } from './hooks'
import type { Assignment, TransportType, VehicleTransport } from '@/types/api'
import { formatNumber, cn } from '@/lib/utils'

const schema = z.object({
  vehicle_id: z.number().min(1, 'Araç seçilmedi'),
  shipment_id: z.number().min(1, 'Sevkiyat seçilmedi'),
  assigned_quantity: z.number().min(1, 'Miktar > 0 olmalı'),
  assigned_weight: z.number().min(0),
  loading_date: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

// sea ↔ maritime normalize (vehicle: sea, shipment: maritime)
function normalize(t?: string): string {
  if (t === 'sea') return 'maritime'
  return t || ''
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  assignment?: Assignment | null
  /** Preset değerler (örn. yük havuzundan "Atama Yap" tıklandığında) */
  defaultShipmentId?: number
  defaultQuantity?: number
  defaultWeight?: number
  /** Araç sayfasından "Bu araca yük ekle" ile açıldığında aracı hazır seçer */
  defaultVehicleId?: number
}

export function AssignmentFormDialog({
  open, onOpenChange, assignment, defaultShipmentId, defaultQuantity, defaultWeight, defaultVehicleId,
}: Props) {
  const { t } = useTranslation()
  const isEdit = !!assignment
  const saveMut = useSaveAssignment()

  const { data: allVehicles = [] } = useVehicles()
  // Storage hariç tüm sevkiyatlar atama alır (ithalat/ihracat dahil — bunlar
  // yük havuzunda listeleniyordu ama burada seçilemiyordu)
  const { data: roadShipments = [] } = useShipments('road')
  const { data: maritimeShipments = [] } = useShipments('maritime')
  const { data: airShipments = [] } = useShipments('air')
  const { data: importShipments = [] } = useShipments('import')
  const { data: exportShipments = [] } = useShipments('export')
  const allShipments = useMemo(
    () => [...roadShipments, ...maritimeShipments, ...airShipments, ...importShipments, ...exportShipments],
    [roadShipments, maritimeShipments, airShipments, importShipments, exportShipments]
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicle_id: 0,
      shipment_id: 0,
      assigned_quantity: 1,
      assigned_weight: 0,
    },
  })
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = form

  useEffect(() => {
    if (open) {
      if (assignment) {
        reset({
          vehicle_id: assignment.vehicle_id,
          shipment_id: assignment.shipment_id,
          assigned_quantity: Number(assignment.assigned_quantity || 0),
          assigned_weight: Number(assignment.assigned_weight || 0),
          loading_date: assignment.loading_date || '',
          notes: assignment.notes || '',
        })
      } else {
        reset({
          vehicle_id: defaultVehicleId ?? 0,
          shipment_id: defaultShipmentId ?? 0,
          assigned_quantity: defaultQuantity && defaultQuantity > 0 ? defaultQuantity : 1,
          assigned_weight: defaultWeight ?? 0,
          loading_date: '',
          notes: '',
        })
      }
    }
  }, [open, assignment, defaultShipmentId, defaultQuantity, defaultWeight, defaultVehicleId, reset])

  const vehicleId = watch('vehicle_id')
  const shipmentId = watch('shipment_id')

  const selectedVehicle = useMemo(() => allVehicles.find((v) => v.id === vehicleId), [allVehicles, vehicleId])
  const selectedShipment = useMemo(() => allShipments.find((s) => s.id === shipmentId), [allShipments, shipmentId])

  // Mod uyumu kontrolü — ithalat/ihracat gümrük operasyonlarının kendi araç modu
  // olmadığı için her araca atanabilir (backend de böyle davranıyor)
  const shipmentMode = normalize(selectedShipment?.transport_type as string)
  const isCustomsOp = shipmentMode === 'import' || shipmentMode === 'export'
  const modeIncompatible = !!selectedVehicle && !!selectedShipment && !isCustomsOp &&
    normalize(selectedVehicle.transport_type) !== shipmentMode

  // Bu sevkiyata yapılmış diğer atamaların toplamı (mevcut atama hariç)
  const { data: shipmentAssignments = [] } = useAssignments(shipmentId ? { shipment_id: shipmentId } : undefined)
  const usage = useMemo(() => {
    if (!selectedShipment) return { qtyUsed: 0, wgtUsed: 0, qtyTotal: 0, wgtTotal: 0 }
    const others = shipmentAssignments.filter((a) => a.id !== assignment?.id)
    return {
      qtyUsed: others.reduce((s, a) => s + Number(a.assigned_quantity || 0), 0),
      wgtUsed: others.reduce((s, a) => s + Number(a.assigned_weight || 0), 0),
      qtyTotal: Number(selectedShipment.quantity || 0),
      wgtTotal: Number(selectedShipment.gross_weight || 0),
    }
  }, [shipmentAssignments, selectedShipment, assignment])

  // Aracın diğer atamalarındaki toplam yükü (kapasite kontrolü)
  const { data: vehicleAssignments = [] } = useAssignments(vehicleId ? { vehicle_id: vehicleId } : undefined)
  const vehicleUsage = useMemo(() => {
    if (!selectedVehicle) return { wgtUsed: 0, wgtTotal: 0 }
    const others = vehicleAssignments.filter((a) => a.id !== assignment?.id)
    return {
      wgtUsed: others.reduce((s, a) => s + Number(a.assigned_weight || 0), 0),
      wgtTotal: Number(selectedVehicle.capacity_kg || 0),
    }
  }, [vehicleAssignments, selectedVehicle, assignment])

  // Otomatik weight önerisi: sevkiyatın brüt ağırlığı yoksa 0
  const currentQty = Number(watch('assigned_quantity') || 0)
  const currentWgt = Number(watch('assigned_weight') || 0)

  const onSubmit = (values: FormValues) => {
    saveMut.mutate(
      { ...values, assignment_id: assignment?.id },
      {
        onSuccess: () => {
          toast.success(isEdit ? 'Atama güncellendi' : 'Atama eklendi')
          onOpenChange(false)
        },
        onError: (err: Error) => toast.error(err.message),
      }
    )
  }

  const VEHICLE_MODE_LABEL: Record<string, string> = { road: 'Karayolu', sea: 'Denizyolu', air: 'Havayolu' }
  const SHIPMENT_MODE_LABEL: Record<string, string> = { road: 'Karayolu', maritime: 'Denizyolu', air: 'Havayolu', storage: 'Depo', import: 'İthalat', export: 'İhracat' }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Atamayı düzenle' : 'Yeni Atama'}</DialogTitle>
          <DialogDescription>
            {t('ui.bir_araca_bir_sevkiyat_ata_kapasite_ve_mod_u')}
          </DialogDescription>
        </DialogHeader>

        <form id="assignment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Sevkiyat seç */}
          <div className="space-y-1.5">
            <Label>{t('ui.sevkiyat')}</Label>
            <Combobox
              value={shipmentId ? String(shipmentId) : ''}
              onChange={(v) => setValue('shipment_id', Number(v))}
              disabled={isEdit}
              options={allShipments.map((s) => ({
                value: String(s.id),
                label: `${s.shipment_no} [${SHIPMENT_MODE_LABEL[s.transport_type as string] || s.transport_type}]`,
                description: [s.client_billing, s.departure_country && `${s.departure_country} → ${s.arrival_country}`].filter(Boolean).join(' · '),
              }))}
              placeholder={t('ui.sevkiyat_secin')}
              searchPlaceholder={t('ui.dosya_no_musteri_ara')}
              emptyMessage={allShipments.length === 0 ? 'Atanabilir sevkiyat yok' : 'Sonuç yok'}
              allowClear={false}
            />
            {errors.shipment_id && <p className="text-xs text-destructive">{errors.shipment_id.message}</p>}
          </div>

          {/* Sevkiyat detay kartı */}
          {selectedShipment && (
            <div className="p-3 rounded-md bg-muted/40 border text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('shipment.route')}</span>
                <span>{selectedShipment.departure_country || '?'} → {selectedShipment.arrival_country || '?'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('ui.toplam_kap')}</span>
                <span className="font-medium">
                  {usage.qtyUsed} / {usage.qtyTotal} kullanılmış (kalan: <strong>{usage.qtyTotal - usage.qtyUsed}</strong>)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('ui.toplam_agirlik')}</span>
                <span className="font-medium">
                  {formatNumber(usage.wgtUsed, 0)} / {formatNumber(usage.wgtTotal, 0)} kg
                </span>
              </div>
            </div>
          )}

          {/* Araç seç */}
          <div className="space-y-1.5">
            <Label>{t('ui.arac')}</Label>
            <Combobox
              value={vehicleId ? String(vehicleId) : ''}
              onChange={(v) => setValue('vehicle_id', Number(v))}
              disabled={isEdit}
              options={allVehicles.map((v) => ({
                value: String(v.id),
                label: `${v.plate} [${VEHICLE_MODE_LABEL[v.transport_type] || v.transport_type}]`,
                description: `${v.vehicle_code} · ${formatNumber(v.capacity_kg, 0)} kg${v.driver_name ? ' · ' + v.driver_name : ''}`,
              }))}
              placeholder={t('ui.arac_secin')}
              searchPlaceholder={t('ui.plaka_kod_surucu_ara')}
              emptyMessage={allVehicles.length === 0 ? 'Araç tanımlı değil' : 'Sonuç yok'}
              allowClear={false}
            />
            {errors.vehicle_id && <p className="text-xs text-destructive">{errors.vehicle_id.message}</p>}
          </div>

          {/* Mod uyumsuzluğu uyarısı */}
          {modeIncompatible && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-destructive">
                <strong>{t('ui.mod_uyumsuzlugu')}</strong> {SHIPMENT_MODE_LABEL[selectedShipment!.transport_type as string]} sevkiyatı sadece {SHIPMENT_MODE_LABEL[shipmentMode]} aracına atanabilir — seçili araç {VEHICLE_MODE_LABEL[selectedVehicle!.transport_type]}. Kaydetmeye çalışırsan reddedilir.
              </div>
            </div>
          )}

          {/* Araç kapasite gauge */}
          {selectedVehicle && (
            <div className="p-3 rounded-md bg-muted/40 border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> {t('ui.arac_kapasite_kullanimi')}
                </span>
                <span className="font-medium">
                  {formatNumber(vehicleUsage.wgtUsed + currentWgt, 0)} / {formatNumber(vehicleUsage.wgtTotal, 0)} kg
                </span>
              </div>
              <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    vehicleUsage.wgtTotal > 0 && (vehicleUsage.wgtUsed + currentWgt) > vehicleUsage.wgtTotal
                      ? 'bg-destructive'
                      : (vehicleUsage.wgtUsed + currentWgt) > vehicleUsage.wgtTotal * 0.9
                        ? 'bg-warning'
                        : 'bg-success'
                  )}
                  style={{
                    width: vehicleUsage.wgtTotal > 0
                      ? `${Math.min(100, ((vehicleUsage.wgtUsed + currentWgt) / vehicleUsage.wgtTotal) * 100)}%`
                      : '0%',
                  }}
                />
              </div>
              {vehicleUsage.wgtTotal > 0 && (vehicleUsage.wgtUsed + currentWgt) > vehicleUsage.wgtTotal && (
                <p className="text-destructive text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('ui.arac_kapasitesi_asilacak_backend_reddedecek')}
                </p>
              )}
            </div>
          )}

          {/* Miktar / ağırlık */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label htmlFor="assigned_quantity" className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> {t('ui.atanan_kap')}
              </Label>
              <Input
                id="assigned_quantity"
                type="number"
                min="1"
                {...register('assigned_quantity', { valueAsNumber: true })}
              />
              {usage.qtyTotal > 0 && (currentQty + usage.qtyUsed) > usage.qtyTotal && (
                <p className="text-xs text-destructive">{t('ui.sevkiyat_kapasitesi_asiliyor')}</p>
              )}
              {errors.assigned_quantity && <p className="text-xs text-destructive">{errors.assigned_quantity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assigned_weight">{t('ui.atanan_agirlik_kg')}</Label>
              <Input
                id="assigned_weight"
                type="number"
                step="0.01"
                {...register('assigned_weight', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loading_date">{t('assignment.loading_date')}</Label>
            <Input id="loading_date" type="date" {...register('loading_date')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button type="submit" form="assignment-form" disabled={saveMut.isPending || modeIncompatible}>
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Güncelle' : 'Ata'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
