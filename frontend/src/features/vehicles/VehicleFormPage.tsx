import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Loader2, Truck, Ship, Plane, AlertCircle, FileText, Package,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useVehicle, useVehicles, useSaveVehicle, EQUIPMENT_BY_MODE } from './hooks'
import { usePartners } from '@/features/partners/hooks'
import { Combobox } from '@/components/shared/Combobox'
import { VehicleLoadPanel } from './VehicleLoadPanel'
import type { VehicleTransport } from '@/types/api'

// Hata mesajları i18n'den gelir — şema bileşen içinde t() ile kurulur
const buildSchema = (t: (k: string) => string) => z.object({
  transport_type: z.enum(['road', 'sea', 'air']),
  plate: z.string().min(1, t('ui.veh_err_plate_required')),
  trailer_plate: z.string().optional().or(z.literal('')),
  equipment_type: z.string().min(1),
  volume_m3: z.union([z.string(), z.number()]).optional(),
  capacity_kg: z.union([z.string(), z.number()]).optional(),
  brand_model: z.string().optional().or(z.literal('')),
  carrier_name: z.string().optional().or(z.literal('')),
  container_numbers: z.string().optional().or(z.literal('')),
  containers_data: z.string().optional().or(z.literal('')),
  container_count: z.union([z.string(), z.number()]).optional(),
  bl_number: z.string().optional().or(z.literal('')),
  total_packages: z.union([z.string(), z.number()]).optional(),
  driver_name: z.string().optional().or(z.literal('')),
  driver_phone: z.string().optional().or(z.literal('')),
  registration_date: z.string().optional().or(z.literal('')),
  adr_certified: z.boolean(),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'maintenance']),
})
type FormValues = z.infer<ReturnType<typeof buildSchema>>

// label = i18n key (t() ile çevrilir)
const MODE_CONFIG: Record<VehicleTransport, { label: string; icon: React.ReactNode; gradient: string }> = {
  road: { label: 'transport.modes.road', icon: <Truck className="w-5 h-5" />, gradient: 'from-blue-500 to-indigo-600' },
  sea:  { label: 'transport.modes.sea',  icon: <Ship className="w-5 h-5" />,  gradient: 'from-cyan-500 to-blue-600' },
  air:  { label: 'transport.modes.air',  icon: <Plane className="w-5 h-5" />, gradient: 'from-sky-500 to-cyan-600' },
}

export function VehicleFormPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const schema = useMemo(() => buildSchema(t), [t])

  const { data: existing, isLoading: loadingExisting } = useVehicle(isEdit ? id : undefined)
  const saveMut = useSaveVehicle()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      transport_type: 'road',
      status: 'active',
      equipment_type: EQUIPMENT_BY_MODE.road[0].value,
      adr_certified: false,
      plate: '',
    },
  })
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = form

  // Nakliyeci onerileri iki kaynaktan gelir:
  //   1) Partenaires > Agents altina kaydedilen acenteler (musteri tasiyicilari
  //      oraya kaydediyor; onceden bu liste hic gorunmuyordu)
  //   2) daha once araclara yazilmis nakliyeci adlari
  // Ayni ad iki kaynakta varsa bir kez gosterilir (buyuk/kucuk harf duyarsiz).
  const { data: allVehicles = [] } = useVehicles()
  const { data: allPartners = [] } = usePartners('')
  const carrierOptions = useMemo(() => {
    const byKey = new Map<string, { value: string; label: string; description: string }>()
    const add = (name: string, description: string) => {
      const n = (name || '').trim()
      if (!n) return
      const key = n.toLocaleLowerCase('tr')
      const prev = byKey.get(key)
      if (!prev) byKey.set(key, { value: n, label: n, description })
      // Ayni ad birden fazla kayitta varsa ilk aciklama korunur (tekrar eklenmez)
      else if (!prev.description && description) prev.description = description
    }
    for (const pr of allPartners) {
      const roles = Array.isArray(pr.extra_roles)
        ? pr.extra_roles
        : typeof pr.extra_roles === 'string' ? pr.extra_roles.split(',').map((r) => r.trim()) : []
      if (pr.type === 'agent' || roles.includes('agent')) {
        add(pr.company_name, [t('partner.types.agent'), pr.partner_code, pr.city].filter(Boolean).join(' · '))
      }
    }
    for (const v of allVehicles) add(v.carrier_name || '', t('ui.veh_carrier_src_vehicle'))
    return Array.from(byKey.values()).sort((x, y) => x.label.localeCompare(y.label, 'tr'))
  }, [allVehicles, allPartners, t])
  const currentMode = watch('transport_type')
  const equipmentOptions = EQUIPMENT_BY_MODE[currentMode] || []
  const modeCfg = MODE_CONFIG[currentMode]

  useEffect(() => {
    if (existing) {
      reset({
        transport_type: existing.transport_type,
        plate: existing.plate || '',
        trailer_plate: existing.trailer_plate || '',
        equipment_type: existing.equipment_type,
        volume_m3: existing.volume_m3 || '',
        capacity_kg: existing.capacity_kg || '',
        brand_model: existing.brand_model || '',
        carrier_name: existing.carrier_name || '',
        container_numbers: existing.container_numbers || '',
        containers_data: typeof existing.containers_data === 'string'
          ? existing.containers_data
          : (existing.containers_data ? JSON.stringify(existing.containers_data) : ''),
        container_count: existing.container_count || '',
        bl_number: existing.bl_number || '',
        total_packages: existing.total_packages || '',
        driver_name: existing.driver_name || '',
        driver_phone: existing.driver_phone || '',
        registration_date: existing.registration_date || '',
        adr_certified: !!existing.adr_certified,
        notes: existing.notes || '',
        status: existing.status,
      })
    }
  }, [existing, reset])

  const handleModeChange = (m: VehicleTransport) => {
    setValue('transport_type', m)
    setValue('equipment_type', EQUIPMENT_BY_MODE[m][0].value)
  }

  const onSubmit = (values: FormValues) => {
    // adr_certified boolean → 0|1 (Vehicle tipiyle uyumlu)
    const payload = {
      ...values,
      adr_certified: (values.adr_certified ? 1 : 0) as 0 | 1,
      vehicle_id: isEdit ? Number(id) : undefined,
    }
    saveMut.mutate(payload, {
      onSuccess: (data) => {
        toast.success(isEdit ? t('ui.veh_updated') : t('ui.veh_added', { code: data.vehicle_code || '' }))
        if (!isEdit && data.id) {
          navigate(`/vehicles/${data.id}/edit`)
        } else {
          navigate('/vehicles')
        }
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </div>
    )
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ margin: 0, padding: 0 }}>
      <Tabs defaultValue="info" className="w-full" style={{ margin: 0 }}>
        {/* FIXED header — ShipmentFormPage ile aynı pattern (mobile responsive) */}
        <div
          className="z-20 bg-background/95 backdrop-blur border-b fixed top-14 right-0 left-0 md:left-56"
        >
          <div className="px-6 flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button asChild type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <Link to="/vehicles">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br text-white flex items-center justify-center shrink-0', modeCfg.gradient)}>
                {modeCfg.icon}
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight truncate">
                  {isEdit ? `${existing?.plate || ''} ${t('common.edit')}` : `${t('common.new')} ${t(modeCfg.label)} ${t('nav.vehicles')}`}
                </h1>
                {existing?.vehicle_code && (
                  <div className="text-xs text-muted-foreground font-mono">{existing.vehicle_code}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasErrors && (
                <span className="hidden md:flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t('shipment.errors_present')}
                </span>
              )}
              <Button asChild type="button" variant="outline" size="sm">
                <Link to="/vehicles">{t('common.cancel')}</Link>
              </Button>
              <Button type="submit" size="sm" disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEdit ? t('common.update') : t('common.save')}
              </Button>
            </div>
          </div>

          {/* Sekmeler */}
          <div className="overflow-x-auto px-6 pb-2">
            <TabsList className="inline-flex h-9 w-auto">
              <TabsTrigger value="info"><FileText className="w-3.5 h-3.5" /> {t('vehicle.vehicle_info')}</TabsTrigger>
              <TabsTrigger value="load" disabled={!isEdit}>
                <Package className="w-3.5 h-3.5" /> {t('vehicle.load_pool')}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab içerikleri */}
        <div className="p-6 space-y-4" style={{ paddingTop: '7rem' }}>
          {/* === ARAÇ BİLGİLERİ === */}
          <TabsContent value="info" className="mt-0">
            <Card className="p-5 space-y-4">
              <SectionTitle>{t('ui.tip_ve_ekipman')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('ui.tasima_tipi')}</Label>
                  <Select
                    value={currentMode}
                    onValueChange={(v) => handleModeChange(v as VehicleTransport)}
                    disabled={isEdit}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="road">{t('nav.road')}</SelectItem>
                      <SelectItem value="sea">{t('nav.maritime')}</SelectItem>
                      <SelectItem value="air">{t('nav.air')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {isEdit && <p className="text-[10px] text-muted-foreground">{t('ui.duzenleme_sirasinda_degistirilemez')}</p>}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>{t('ui.veh_equipment_type_req')}</Label>
                  <Select value={watch('equipment_type')} onValueChange={(v) => setValue('equipment_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {equipmentOptions.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{t(e.label)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {currentMode === 'sea' && (
                <ContainersEditor
                  value={(watch('containers_data') as string) || ''}
                  legacyNumbers={(watch('container_numbers') as string) || ''}
                  onChange={(json) => setValue('containers_data', json, { shouldDirty: true })}
                />
              )}
            </Card>

            <Card className="p-5 mt-4 space-y-4">
              <SectionTitle>{t('ui.plaka_ve_kapasite')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plate">
                    {currentMode === 'road' ? t('ui.veh_plate_req') : currentMode === 'sea' ? t('ui.veh_vessel_name_req') : t('ui.veh_flight_tail_req')}
                  </Label>
                  <Input id="plate" {...register('plate')} />
                  {errors.plate && <p className="text-xs text-destructive">{errors.plate.message}</p>}
                </div>
                {currentMode === 'road' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="trailer_plate">{t('vehicle.trailer_plate')}</Label>
                    <Input id="trailer_plate" {...register('trailer_plate')} />
                  </div>
                )}
                {currentMode === 'sea' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="bl_number">{t('ui.veh_bl_number')}</Label>
                    <Input id="bl_number" {...register('bl_number')} placeholder="ISB2044474" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {currentMode === 'sea' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="total_packages">{t('ui.veh_total_packages')}</Label>
                    <Input id="total_packages" type="number" {...register('total_packages')} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="capacity_kg">{t('transport.vehicle_labels.capacity')}</Label>
                  <Input id="capacity_kg" type="number" step="0.01" {...register('capacity_kg')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="volume_m3">{t('transport.vehicle_labels.volume')}</Label>
                  <Input id="volume_m3" type="number" step="0.01" {...register('volume_m3')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('common.status')}</Label>
                  <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FormValues['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('vehicle.status.active')}</SelectItem>
                      <SelectItem value="inactive">{t('vehicle.status.inactive')}</SelectItem>
                      <SelectItem value="maintenance">{t('vehicle.status.maintenance')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-5 mt-4 space-y-4">
              <SectionTitle>{t('ui.veh_brand_registration')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('vehicle.brand_model')} name="brand_model" register={register} errors={errors} />
                <Field label={t('vehicle.registration_date')} name="registration_date" register={register} errors={errors} type="date" />
                {/* Yukleme listesinin (feuille de chargement) baslik satirinda gorunur */}
                <div className="md:col-span-2 space-y-1.5">
                  <Label>{t('vehicle.carrier_name')}</Label>
                  {/* Kayitli nakliyecilerden secilir; listede yoksa yazilan ad aynen kaydedilir */}
                  <Combobox
                    value={watch('carrier_name') || ''}
                    onChange={(v) => setValue('carrier_name', v, { shouldDirty: true })}
                    options={carrierOptions}
                    placeholder={t('vehicle.carrier_ph')}
                    searchPlaceholder={t('ui.veh_carrier_search')}
                    allowCustom
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {t('ui.veh_carrier_hint2', { count: carrierOptions.length })}
                  </p>
                </div>
              </div>
            </Card>

            {currentMode !== 'air' && (
              <Card className="p-5 mt-4 space-y-4">
                <SectionTitle>{currentMode === 'sea' ? t('ui.veh_captain') : t('vehicle.driver')}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={currentMode === 'sea' ? t('ui.veh_captain') : t('ui.veh_driver_name')} name="driver_name" register={register} errors={errors} />
                  <Field label={t('shipment.fields.phone')} name="driver_phone" register={register} errors={errors} />
                </div>
              </Card>
            )}

            {currentMode === 'road' && (
              <Card className="p-5 mt-4 space-y-3">
                <SectionTitle>{t('shipment.sections.special_conditions')}</SectionTitle>
                <div className="flex items-center gap-2 h-9">
                  <Checkbox
                    id="adr_certified"
                    checked={watch('adr_certified')}
                    onCheckedChange={(c) => setValue('adr_certified', !!c)}
                  />
                  <Label htmlFor="adr_certified" className="cursor-pointer">{t('ui.adr_tehlikeli_madde_sertifikali')}</Label>
                </div>
              </Card>
            )}

            <Card className="p-5 mt-4 space-y-3">
              <SectionTitle>{t('ui.asg_notes')}</SectionTitle>
              <Textarea rows={3} {...register('notes')} />
            </Card>

            <TabSaveBar isEdit={isEdit} isPending={saveMut.isPending} hasErrors={hasErrors} />
          </TabsContent>

          {/* === YÜK HAVUZU === */}
          <TabsContent value="load" className="mt-0">
            {isEdit && id ? (
              <VehicleLoadPanel vehicleId={Number(id)} />
            ) : (
              <Card className="p-4 bg-warning/10 border-warning/30">
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    {t('ui.save_first_for_vehicle_load')}
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </form>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  )
}

type FieldProps = {
  label: string
  name: keyof FormValues
  register: UseFormRegister<FormValues>
  errors: FieldErrors<FormValues>
  type?: string
  step?: string
  placeholder?: string
}

function Field({ label, name, register, errors, ...rest }: FieldProps) {
  const err = (errors as Record<string, { message?: string } | undefined>)[name as string]
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name as string}>{label}</Label>
      <Input id={name as string} {...register(name as never)} {...rest} />
      {err && <p className="text-xs text-destructive">{String(err.message ?? '')}</p>}
    </div>
  )
}

function TabSaveBar({ isEdit, isPending, hasErrors }: { isEdit: boolean; isPending: boolean; hasErrors: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 pt-4 border-t flex items-center justify-end gap-2">
      {hasErrors && (
        <span className="hidden md:flex items-center gap-1 text-xs text-destructive mr-auto">
          <AlertCircle className="w-3.5 h-3.5" />
          {t('shipment.errors_present')}
        </span>
      )}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isEdit ? t('common.update') : t('common.save')}
      </Button>
    </div>
  )
}


// ============================================================
// Konteyner tablosu — konteyner basina No / Kap / Kilo girilir.
// JSON string olarak containers_data alaninda saklanir; B/L bu satirlari
// kap/kilolariyla birlikte basar. Eski kayitlardaki duz numara listesi
// (container_numbers) ilk acilista satirlara donusturulur.
// ============================================================
interface CtrRow { no: string; packages: string; weight: string }

function parseCtrRows(json: string, legacyNumbers: string): CtrRow[] {
  if (json) {
    try {
      const arr = JSON.parse(json)
      if (Array.isArray(arr)) {
        return arr.map((r) => ({
          no: String(r?.no ?? ''),
          packages: r?.packages == null ? '' : String(r.packages),
          weight: r?.weight == null ? '' : String(r.weight),
        }))
      }
    } catch { /* bozuk JSON — legacy'e dus */ }
  }
  const nos = legacyNumbers.split(/[,;]+/).map((x) => x.trim()).filter(Boolean)
  return nos.map((no) => ({ no, packages: '', weight: '' }))
}

function ContainersEditor({ value, legacyNumbers, onChange }: {
  value: string
  legacyNumbers: string
  onChange: (json: string) => void
}) {
  const { t } = useTranslation()
  const rows = useMemo(() => parseCtrRows(value, legacyNumbers), [value, legacyNumbers])

  const commit = (next: CtrRow[]) => {
    onChange(next.length ? JSON.stringify(next.map((r) => ({
      no: r.no, packages: r.packages, weight: r.weight,
    }))) : '')
  }
  const update = (i: number, patch: Partial<CtrRow>) =>
    commit(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('ui.veh_containers_title')}</Label>
        <Button type="button" variant="outline" size="sm" className="h-7"
                onClick={() => commit([...rows, { no: '', packages: '', weight: '' }])}>
          + {t('ui.veh_add_container')}
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">{t('ui.veh_containers_hint')}</p>
      )}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_110px_130px_36px] gap-2 items-center">
          <Input value={r.no} onChange={(e) => update(i, { no: e.target.value })}
                 placeholder="CMAU3913395" className="h-8 font-mono text-xs" />
          <Input value={r.packages} onChange={(e) => update(i, { packages: e.target.value })}
                 type="number" placeholder={t('ui.veh_ctr_packages')} className="h-8 text-xs" />
          <Input value={r.weight} onChange={(e) => update(i, { weight: e.target.value })}
                 type="number" step="0.01" placeholder={t('ui.veh_ctr_weight')} className="h-8 text-xs" />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                  onClick={() => commit(rows.filter((_, idx) => idx !== i))}>
            ×
          </Button>
        </div>
      ))}
      {rows.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {t('ui.veh_ctr_totals', {
            count2: rows.length,
            pk: rows.reduce((s2, r) => s2 + (Number(r.packages) || 0), 0),
            kg: rows.reduce((s2, r) => s2 + (Number(r.weight) || 0), 0).toFixed(1),
          })}
        </p>
      )}
    </div>
  )
}
