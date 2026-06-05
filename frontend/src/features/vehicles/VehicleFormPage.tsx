import { useEffect } from 'react'
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
import { useVehicle, useSaveVehicle, EQUIPMENT_BY_MODE } from './hooks'
import { VehicleLoadPanel } from './VehicleLoadPanel'
import type { VehicleTransport } from '@/types/api'

const schema = z.object({
  transport_type: z.enum(['road', 'sea', 'air']),
  plate: z.string().min(1, 'Plaka / Tanıtıcı zorunludur'),
  trailer_plate: z.string().optional().or(z.literal('')),
  equipment_type: z.string().min(1),
  volume_m3: z.union([z.string(), z.number()]).optional(),
  capacity_kg: z.union([z.string(), z.number()]).optional(),
  brand_model: z.string().optional().or(z.literal('')),
  driver_name: z.string().optional().or(z.literal('')),
  driver_phone: z.string().optional().or(z.literal('')),
  registration_date: z.string().optional().or(z.literal('')),
  adr_certified: z.boolean(),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'maintenance']),
})
type FormValues = z.infer<typeof schema>

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
        toast.success(isEdit ? 'Araç güncellendi' : `Araç eklendi: ${data.vehicle_code || ''}`)
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
                  Eksik / hatalı alanlar var
                </span>
              )}
              <Button asChild type="button" variant="outline" size="sm">
                <Link to="/vehicles">İptal</Link>
              </Button>
              <Button type="submit" size="sm" disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEdit ? 'Güncelle' : 'Kaydet'}
              </Button>
            </div>
          </div>

          {/* Sekmeler */}
          <div className="overflow-x-auto px-6 pb-2">
            <TabsList className="inline-flex h-9 w-auto">
              <TabsTrigger value="info"><FileText className="w-3.5 h-3.5" /> Araç Bilgileri</TabsTrigger>
              <TabsTrigger value="load" disabled={!isEdit}>
                <Package className="w-3.5 h-3.5" /> Yük Havuzu
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab içerikleri */}
        <div className="p-6 space-y-4" style={{ paddingTop: '7rem' }}>
          {/* === ARAÇ BİLGİLERİ === */}
          <TabsContent value="info" className="mt-0">
            <Card className="p-5 space-y-4">
              <SectionTitle>Tip ve Ekipman</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Taşıma Tipi *</Label>
                  <Select
                    value={currentMode}
                    onValueChange={(v) => handleModeChange(v as VehicleTransport)}
                    disabled={isEdit}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="road">Karayolu</SelectItem>
                      <SelectItem value="sea">Denizyolu</SelectItem>
                      <SelectItem value="air">Havayolu</SelectItem>
                    </SelectContent>
                  </Select>
                  {isEdit && <p className="text-[10px] text-muted-foreground">Düzenleme sırasında değiştirilemez</p>}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Ekipman Tipi *</Label>
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
            </Card>

            <Card className="p-5 mt-4 space-y-4">
              <SectionTitle>Plaka ve Kapasite</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plate">
                    {currentMode === 'road' ? 'Plaka *' : currentMode === 'sea' ? 'Gemi Adı *' : 'Uçuş No / Kuyruk *'}
                  </Label>
                  <Input id="plate" {...register('plate')} />
                  {errors.plate && <p className="text-xs text-destructive">{errors.plate.message}</p>}
                </div>
                {currentMode === 'road' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="trailer_plate">Dorse Plakası</Label>
                    <Input id="trailer_plate" {...register('trailer_plate')} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="capacity_kg">Kapasite (kg)</Label>
                  <Input id="capacity_kg" type="number" step="0.01" {...register('capacity_kg')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="volume_m3">Hacim (m³)</Label>
                  <Input id="volume_m3" type="number" step="0.01" {...register('volume_m3')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Durum</Label>
                  <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FormValues['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Pasif</SelectItem>
                      <SelectItem value="maintenance">Bakımda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-5 mt-4 space-y-4">
              <SectionTitle>Marka / Tescil</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Marka / Model" name="brand_model" register={register} errors={errors} />
                <Field label="Tescil / Kayıt Tarihi" name="registration_date" register={register} errors={errors} type="date" />
              </div>
            </Card>

            {currentMode !== 'air' && (
              <Card className="p-5 mt-4 space-y-4">
                <SectionTitle>{currentMode === 'sea' ? 'Kaptan' : 'Sürücü'}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={currentMode === 'sea' ? 'Kaptan' : 'Sürücü Adı'} name="driver_name" register={register} errors={errors} />
                  <Field label="Telefon" name="driver_phone" register={register} errors={errors} />
                </div>
              </Card>
            )}

            {currentMode === 'road' && (
              <Card className="p-5 mt-4 space-y-3">
                <SectionTitle>Özel Koşullar</SectionTitle>
                <div className="flex items-center gap-2 h-9">
                  <Checkbox
                    id="adr_certified"
                    checked={watch('adr_certified')}
                    onCheckedChange={(c) => setValue('adr_certified', !!c)}
                  />
                  <Label htmlFor="adr_certified" className="cursor-pointer">ADR (Tehlikeli Madde) Sertifikalı</Label>
                </div>
              </Card>
            )}

            <Card className="p-5 mt-4 space-y-3">
              <SectionTitle>Notlar</SectionTitle>
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
                    <strong>Önce aracı kaydet</strong> — yük havuzu, araç kaydedildikten sonra kullanılabilir.
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
  return (
    <div className="mt-4 pt-4 border-t flex items-center justify-end gap-2">
      {hasErrors && (
        <span className="hidden md:flex items-center gap-1 text-xs text-destructive mr-auto">
          <AlertCircle className="w-3.5 h-3.5" />
          Eksik / hatalı alanlar var
        </span>
      )}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isEdit ? 'Güncelle' : 'Kaydet'}
      </Button>
    </div>
  )
}
