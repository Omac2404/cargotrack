import { useEffect, useMemo, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, type SubmitHandler, type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Loader2, FileText, Users, Package, DollarSign, Receipt, AlertCircle,
  Files, Warehouse, ClipboardList, FileWarning, ExternalLink, History, Search, Plus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/shared/Combobox'
import { cn } from '@/lib/utils'
import { getModeConfig } from './modeConfig'
import { shipmentSchema, type ShipmentFormValues } from './schema'
import { useShipment, useSaveShipment } from './hooks'
import { usePartners } from '@/features/partners/hooks'
import { useWarehouses } from '@/features/warehouses/hooks'
import { useAssignments } from '@/features/assignments/hooks'
import { getTransportMode } from '@/lib/constants/transportModes'
import { getFileCoverUrl, getProformaUrl, getStorageReportUrl, getBarcodesUrl, openPdf } from '@/features/pdf/hooks'
import { FileBadge2, FileCheck2, Barcode, FileSpreadsheet } from 'lucide-react'
import { FinancialTable } from './FinancialTable'
import { StorageSection } from './StorageSection'
import { CratesEditor } from './CratesEditor'
import { DocumentChecklist } from './DocumentChecklist'
import { CountryCombobox } from '@/components/shared/CountryCombobox'
import { CurrencyCombobox } from '@/components/shared/CurrencyCombobox'
import { CityInput } from '@/components/shared/CityInput'
import { PackageTypeCombobox } from '@/components/shared/PackageTypeCombobox'
import { ADRCodeCombobox } from '@/components/shared/ADRCodeCombobox'
import { rememberAdrCode } from '@/lib/constants/customs/adrCodes'
import { INCOTERMS as INCOTERMS_INFO } from '@/lib/constants/customs/incoterms'
import {
  WAREHOUSE_TYPES as WAREHOUSE_TYPES_REF,
  TRANSIT_EXPIRY_WARNING_DAYS as TRANSIT_EXPIRY_WARNING_DAYS_REF,
} from '@/lib/constants/customs/warehouseTypes'
import { HistoryPanel } from './HistoryPanel'
import { PartyInfoCard } from './PartyInfoCard'
import { PartySecondaryFields, type PartiesData, type PartyKey } from './PartySecondaryFields'
import { PartnerFormDialog } from '@/features/partners/PartnerFormDialog'
import type { FinancialData } from '@/lib/constants/finSchemas'
import type { PartnerType, DocumentsData } from '@/types/api'

// Incoterm kodları (sıralı) — açıklamalar customs/incoterms.ts'den gelir
const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DPU', 'DAP', 'DDP']
function incotermLabel(code: string): { code: string; tr: string } {
  const info = INCOTERMS_INFO.find((i) => i.code === code)
  return { code, tr: info?.tr || code }
}
// i18n key'leri — UI'de t() ile çevrilir
const STATUSES = [
  { value: 'draft', label: 'shipment.status.draft' },
  { value: 'in_progress', label: 'shipment.status.in_progress' },
  { value: 'to_invoice', label: 'shipment.status.to_invoice' },
  { value: 'closed', label: 'shipment.status.closed' },
]
const PAYMENT_TYPES = [
  { value: '__none__', label: 'shipment.not_specified' },
  { value: 'havale', label: 'shipment.payment_types.wire' },
  { value: 'cek', label: 'shipment.payment_types.check' },
  { value: 'nakit', label: 'shipment.payment_types.cash' },
  { value: 'kredi_karti', label: 'shipment.payment_types.credit_card' },
  { value: 'akreditif', label: 'shipment.payment_types.letter_of_credit' },
  { value: 'vesaik', label: 'shipment.payment_types.documents' },
  { value: 'diger', label: 'shipment.payment_types.other' },
]
const STORAGE_PRICING = [
  { value: 'gun', label: 'shipment.storage_pricing.daily' },
  { value: 'hafta', label: 'shipment.storage_pricing.weekly' },
  { value: 'ay', label: 'shipment.storage_pricing.monthly' },
]

// Mode'a göre zorunlu belge listesi getTransportMode().docList'ten gelir.
// Genel temel (eski geriye uyumluluk) — i18n keys
const REQUIRED_DOCS_FALLBACK = [
  { key: 'commercial_invoice', label: 'transport.documents.invoice' },
  { key: 'packing_list', label: 'transport.documents.packing_list' },
  { key: 'cmr', label: 'transport.documents.cmr' },
  { key: 'customs_docs', label: 'transport.documents.customs_dec' },
]

export function ShipmentFormPage() {
  const { t } = useTranslation()
  const { mode, id } = useParams<{ mode: string; id?: string }>()
  const navigate = useNavigate()
  const config = getModeConfig(mode)
  const isEdit = !!id

  const { data: existing, isLoading: loadingExisting } = useShipment(isEdit ? id : undefined)
  const saveMut = useSaveShipment()

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      transport_type: config.key,
      status: 'draft',
      currency_code: 'EUR',
      created_date: new Date().toISOString().slice(0, 10),
      depo_ucret_tipi: 'gun',
    },
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = form

  // Mode config (PHP TRANSPORT_MODES port)
  const modeCfg = getTransportMode(config.key)

  // Mode-data parsed state — sea/air alanları için
  const modeDataStr = watch('mode_data') as string | undefined
  const modeData = useMemo(() => {
    if (!modeDataStr) return {} as Record<string, unknown>
    try { return JSON.parse(modeDataStr) || {} } catch { return {} }
  }, [modeDataStr])

  const setModeField = (key: string, value: string | number) => {
    const next = { ...modeData, [key]: value }
    setValue('mode_data', JSON.stringify(next), { shouldDirty: true })
  }

  // Partner ve depo
  const { data: partners = [] } = usePartners('')
  const { data: warehouses = [] } = useWarehouses()
  // Sevk Planı tab'ında bu sevkiyatın atamalarını göstermek için
  const { data: assignments = [] } = useAssignments(isEdit ? { shipment_id: Number(id) } : undefined)

  const partnerOptionsByRole = useMemo(() => {
    const make = (role: PartnerType) => partners
      .filter((p) => {
        const isMain = p.type === role
        const extras = Array.isArray(p.extra_roles)
          ? p.extra_roles
          : (typeof p.extra_roles === 'string' ? p.extra_roles.split(',') : [])
        return isMain || extras.includes(role)
      })
      .map((p) => ({
        value: p.company_name,
        label: p.company_name,
        description: [p.partner_code, p.city, p.country].filter(Boolean).join(' · '),
      }))
    return { customer: make('customer'), sender: make('sender'), receiver: make('receiver'), agent: make('agent') }
  }, [partners])

  const warehouseOptions = useMemo(
    () => warehouses.filter((w) => w.status === 'active').map((w) => ({
      value: w.name,
      label: w.name,
      description: [w.warehouse_code, w.type_code, w.city, w.country].filter(Boolean).join(' · '),
    })),
    [warehouses]
  )

  useEffect(() => {
    if (existing) {
      const values: Partial<ShipmentFormValues> = {}
      for (const k of Object.keys(existing) as Array<keyof typeof existing>) {
        const v = existing[k]
        if (k === 'dangerous_goods' || k === 'temperature_controlled' || k === 'insurance' || k === 'payment_received') {
          ;(values as Record<string, unknown>)[k] = Number(v) === 1
        } else if (v !== null) {
          ;(values as Record<string, unknown>)[k] = v
        }
      }
      reset(values as ShipmentFormValues)
    }
  }, [existing, reset])

  // Belge durumu (varsa) — Belgeler tab'ında özetleme için
  const docStatus = useMemo(() => {
    const raw = (existing as { documents_data?: string | object } | undefined)?.documents_data
    if (!raw) return {}
    try { return typeof raw === 'string' ? JSON.parse(raw) || {} : (raw as Record<string, { status?: string; filename?: string }>) }
    catch { return {} }
  }, [existing])

  // Mode-aware doc list (PHP TRANSPORT_MODES[mode].docList)
  const requiredDocs = modeCfg.docList.length > 0 ? modeCfg.docList : REQUIRED_DOCS_FALLBACK

  // financial_data parse + setter
  const financialDataStr = watch('financial_data') as string | undefined
  const financialData = useMemo<FinancialData>(() => {
    if (!financialDataStr) return {}
    try { return JSON.parse(financialDataStr) || {} } catch { return {} }
  }, [financialDataStr])

  const setFinancialData = (data: FinancialData) => {
    setValue('financial_data', JSON.stringify(data), { shouldDirty: true })
  }

  // parties_data parse + setter (sevkiyata özel ek bilgi paneli için)
  const partiesDataStr = watch('parties_data') as string | undefined
  const partiesData = useMemo<PartiesData>(() => {
    if (!partiesDataStr) return {}
    try { return JSON.parse(partiesDataStr) || {} } catch { return {} }
  }, [partiesDataStr])

  const setPartiesData = (key: PartyKey, val: PartiesData[PartyKey]) => {
    const next: PartiesData = { ...partiesData }
    if (val && Object.values(val).some((v) => v && String(v).trim())) {
      next[key] = val
    } else {
      delete next[key]
    }
    setValue('parties_data', JSON.stringify(next), { shouldDirty: true })
  }

  // Quick-add partner dialog state
  const [quickAddType, setQuickAddType] = useState<PartnerType | null>(null)

  // Müşteri seçilince boş alanları partner kaydından doldur (sadece boşsa)
  const clientBilling = watch('client_billing')
  const lastFilledFor = useRef<string>('')
  useEffect(() => {
    if (!clientBilling || clientBilling === lastFilledFor.current) return
    const partner = partners.find((p) => p.company_name === clientBilling)
    if (!partner) return
    lastFilledFor.current = clientBilling
    // Sadece boş olanları doldur
    if (!watch('client_contact') && partner.contact_person) {
      setValue('client_contact', partner.contact_person, { shouldDirty: true })
    }
    if (!watch('client_phone') && partner.contact_phone) {
      setValue('client_phone', partner.contact_phone, { shouldDirty: true })
    }
    if (!watch('client_email') && partner.contact_email) {
      setValue('client_email', partner.contact_email, { shouldDirty: true })
    }
    if (!watch('client_delivery_address') && partner.physical_address) {
      const full = [partner.physical_address, partner.postal_code, partner.city, partner.country]
        .filter(Boolean).join(', ')
      setValue('client_delivery_address', full, { shouldDirty: true })
    }
  }, [clientBilling, partners, setValue, watch])

  // Lookup seçili partner'ı (her parti için)
  const findPartnerByName = (name: string | undefined) =>
    name ? partners.find((p) => p.company_name === name) : undefined

  const missingRequired = requiredDocs.filter((d) => {
    const entry = (docStatus as Record<string, { status?: string }>)[d.key]
    return !entry || entry.status === 'missing'
  })

  // Atama özeti (Sevk Planı tab'ı için)
  const dispatchSummary = useMemo(() => {
    const totalQty = Number(watch('quantity') || 0)
    const assignedQty = assignments.reduce((s, a) => s + Number(a.assigned_quantity || 0), 0)
    const assignedWgt = assignments.reduce((s, a) => s + Number(a.assigned_weight || 0), 0)
    return {
      totalQty,
      assignedQty,
      unassignedQty: Math.max(0, totalQty - assignedQty),
      assignedWgt,
      progress: totalQty > 0 ? Math.min(100, Math.round((assignedQty / totalQty) * 100)) : 0,
    }
  }, [assignments, watch])

  const onSubmit: SubmitHandler<ShipmentFormValues> = (values) => {
    const payload: Record<string, unknown> = { ...values, transport_type: config.key }
    // __none__ payment_type'ı boşalt
    if (payload.payment_type === '__none__') payload.payment_type = ''
    if (isEdit) payload.id = id
    saveMut.mutate(payload, {
      onSuccess: (data) => {
        toast.success(isEdit ? 'Güncellendi' : `Oluşturuldu: ${data.shipment_no || ''}`)
        if (!isEdit && data.id) {
          // Yeni kayıttan sonra edit moduna geçir (belgeler/atamalar kullanılabilir olsun)
          navigate(`/shipments/${config.slug}/${data.id}/edit`)
        } else {
          navigate(`/shipments/${config.slug}`)
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
      <Tabs defaultValue="general" className="w-full" style={{ margin: 0 }}>
        {/* FIXED header — sidebar offset (md: w-56=14rem, mobile: 0), topbar height (h-14=3.5rem) */}
        <div
          className="z-20 bg-background/95 backdrop-blur border-b fixed top-14 right-0 left-0 md:left-56"
        >
          <div className="px-6 flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button asChild type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <Link to={`/shipments/${config.slug}`}>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br text-white flex items-center justify-center shrink-0', config.gradient)}>
                {config.icon}
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight truncate">
                  {isEdit
                    ? t('shipment.edit')
                    : t('shipment.new_with_mode', { mode: t(`nav.${config.key === 'maritime' ? 'maritime' : config.key === 'air' ? 'air' : config.key === 'storage' ? 'storage' : 'road'}`) })}
                </h1>
                {existing?.shipment_no && (
                  <div className="text-xs text-muted-foreground font-mono">{existing.shipment_no}</div>
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
              {isEdit && id && (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => openPdf(getFileCoverUrl(Number(id)))} title="Dosya Kapağı PDF">
                    <FileBadge2 className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openPdf(getProformaUrl(Number(id)))} title="Proforma Fatura PDF">
                    <FileCheck2 className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openPdf(getBarcodesUrl(Number(id)))} title="Barkod Yaprağı">
                    <Barcode className="w-4 h-4" />
                  </Button>
                  {config.key === 'storage' && (
                    <Button type="button" variant="outline" size="sm" onClick={() => openPdf(getStorageReportUrl(Number(id)))} title="Depo Raporu PDF">
                      <FileSpreadsheet className="w-4 h-4" />
                    </Button>
                  )}
                </>
              )}
              <Button asChild type="button" variant="outline" size="sm">
                <Link to={`/shipments/${config.slug}`}>{t('common.cancel')}</Link>
              </Button>
              <Button type="submit" size="sm" disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEdit ? t('common.update') : t('common.save')}
              </Button>
            </div>
          </div>

          {/* Sekmeler — sticky header'ın alt satırı */}
          <div className="overflow-x-auto px-6 pb-2">
            <TabsList className="inline-flex h-9 w-auto">
              <TabsTrigger value="general"><FileText className="w-3.5 h-3.5" /> {t('shipment.tabs.general')}</TabsTrigger>
              <TabsTrigger value="parties"><Users className="w-3.5 h-3.5" /> {t('shipment.tabs.parties')}</TabsTrigger>
              <TabsTrigger value="cargo"><Package className="w-3.5 h-3.5" /> {t('shipment.tabs.cargo')}</TabsTrigger>
              <TabsTrigger value="financial"><DollarSign className="w-3.5 h-3.5" /> {t('shipment.tabs.financial')}</TabsTrigger>
              <TabsTrigger value="documents">
                <Files className="w-3.5 h-3.5" /> {t('shipment.tabs.documents')}
                {missingRequired.length > 0 && isEdit && (
                  <Badge variant="destructive" className="ml-1">{missingRequired.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="storage"><Warehouse className="w-3.5 h-3.5" /> {t('shipment.tabs.storage')}</TabsTrigger>
              <TabsTrigger value="dispatch">
                <ClipboardList className="w-3.5 h-3.5" /> {t('shipment.tabs.dispatch')}
                {isEdit && assignments.length > 0 && (
                  <Badge variant="success" className="ml-1">{assignments.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="invoice"><Receipt className="w-3.5 h-3.5" /> {t('shipment.tabs.invoice')}</TabsTrigger>
              <TabsTrigger value="history" disabled={!isEdit}>
                <History className="w-3.5 h-3.5" /> {t('shipment.tabs.history')}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab içerikleri — fixed header (~110px) altında kalmasın diye padding-top */}
        <div className="p-6 space-y-4" style={{ paddingTop: '7rem' }}>

          {/* === GENEL === */}
          <TabsContent value="general" className="mt-0">
            <Card className="p-5 space-y-4">
              <SectionTitle>{t('shipment.sections.general_info')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label={t('shipment.fields.created_date')} name="created_date" register={register} errors={errors} type="date" />
                <Field label={t('shipment.fields.responsible_user')} name="responsible_user" register={register} errors={errors} />
                <Field label={t('shipment.fields.client_reference')} name="client_reference" register={register} errors={errors} />

                <div className="space-y-1.5">
                  <Label>{t('common.status')}</Label>
                  <Select value={watch('status') || 'draft'} onValueChange={(v) => setValue('status', v as ShipmentFormValues['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{t(s.label)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>{t('shipment.fields.currency')}</Label>
                  <CurrencyCombobox
                    value={watch('currency_code') || 'EUR'}
                    onChange={(v) => setValue('currency_code', v)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t('shipment.fields.incoterm')}</Label>
                  <Select value={watch('incoterm') || '__none__'} onValueChange={(v) => setValue('incoterm', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder={t('shipment.select_placeholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('shipment.not_specified')}</SelectItem>
                      {INCOTERMS.map((c) => {
                        const info = incotermLabel(c)
                        return (
                          <SelectItem key={c} value={c}>
                            <span className="font-mono font-semibold">{info.code}</span>
                            <span className="text-muted-foreground ml-2">— {info.tr}</span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Field label={t('shipment.fields.incoterm_location')} name="incoterm_location" register={register} errors={errors} className="md:col-span-2" />
              </div>
            </Card>

            {/* Mode-spesifik alanlar (PHP TRANSPORT_MODES.generalFields) */}
            {modeCfg.generalFields.length > 0 && (
              <Card className="p-5 mt-4 space-y-4">
                <SectionTitle>{t('shipment.sections.mode_details', { mode: t(modeCfg.label) })}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {modeCfg.generalFields.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label htmlFor={`mode_${f.key}`}>{t(f.label)}</Label>
                      {f.type === 'select' ? (
                        <Select
                          value={String(modeData[f.key] ?? '__none__')}
                          onValueChange={(v) => setModeField(f.key, v === '__none__' ? '' : v)}
                        >
                          <SelectTrigger><SelectValue placeholder={t('shipment.select_placeholder')} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">{t('shipment.not_specified')}</SelectItem>
                            {(f.options || []).filter((o) => o !== '').map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`mode_${f.key}`}
                          type={f.type}
                          placeholder={f.placeholder}
                          value={String(modeData[f.key] ?? '')}
                          onChange={(e) => setModeField(f.key, f.type === 'number' ? Number(e.target.value) || 0 : e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
            <TabSaveBar isEdit={isEdit} isPending={saveMut.isPending} hasErrors={hasErrors} />
          </TabsContent>

          {/* === TARAFLAR === */}
          <TabsContent value="parties" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5 space-y-4">
                <SectionTitle>{t('shipment.sections.client_billing_section')}</SectionTitle>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t('shipment.fields.client_billing')}</Label>
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <Combobox value={watch('client_billing') || ''} onChange={(v) => setValue('client_billing', v)}
                          options={partnerOptionsByRole.customer} placeholder={t('shipment.fields.select_customer')}
                          searchPlaceholder={t('shipment.fields.company_search')} allowCustom />
                      </div>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                        title={t('shipment.fields.add_new_customer')}
                        onClick={() => setQuickAddType('customer')}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <PartyInfoCard partner={findPartnerByName(watch('client_billing'))} showCustomerExtras />
                  </div>

                  <Field label={t('shipment.fields.contact_person')} name="client_contact" register={register} errors={errors} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('shipment.fields.phone')} name="client_phone" register={register} errors={errors} />
                    <Field label={t('shipment.fields.email')} name="client_email" register={register} errors={errors} type="email" />
                  </div>
                  <FieldArea label={t('shipment.fields.delivery_address')} name="client_delivery_address" register={register} errors={errors} />

                  <PartySecondaryFields
                    partyKey="client"
                    data={partiesData.client || {}}
                    onChange={(v) => setPartiesData('client', v)}
                  />
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <SectionTitle>{t('shipment.sections.parties')}</SectionTitle>
                <div className="space-y-3">
                  {/* Gönderici */}
                  <div className="space-y-1.5">
                    <Label>Gönderici</Label>
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <Combobox value={watch('sender') || ''} onChange={(v) => setValue('sender', v)}
                          options={partnerOptionsByRole.sender} placeholder="Gönderici seçin..." searchPlaceholder="Şirket adı ara..." allowCustom />
                      </div>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                        title="Yeni gönderici ekle"
                        onClick={() => setQuickAddType('sender')}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <PartyInfoCard partner={findPartnerByName(watch('sender'))} />
                    <PartySecondaryFields
                      partyKey="sender"
                      data={partiesData.sender || {}}
                      onChange={(v) => setPartiesData('sender', v)}
                    />
                  </div>

                  {/* Alıcı */}
                  <div className="space-y-1.5">
                    <Label>Alıcı</Label>
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <Combobox value={watch('receiver') || ''} onChange={(v) => setValue('receiver', v)}
                          options={partnerOptionsByRole.receiver} placeholder="Alıcı seçin..." searchPlaceholder="Şirket adı ara..." allowCustom />
                      </div>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                        title="Yeni alıcı ekle"
                        onClick={() => setQuickAddType('receiver')}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <PartyInfoCard partner={findPartnerByName(watch('receiver'))} />
                    <PartySecondaryFields
                      partyKey="receiver"
                      data={partiesData.receiver || {}}
                      onChange={(v) => setPartiesData('receiver', v)}
                    />
                  </div>

                  {/* Acente */}
                  <div className="space-y-1.5">
                    <Label>Acente</Label>
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <Combobox value={watch('agent') || ''} onChange={(v) => setValue('agent', v)}
                          options={partnerOptionsByRole.agent} placeholder="Acente seçin..." searchPlaceholder="Şirket adı ara..." allowCustom />
                      </div>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                        title="Yeni acente ekle"
                        onClick={() => setQuickAddType('agent')}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <PartyInfoCard partner={findPartnerByName(watch('agent'))} />
                    <PartySecondaryFields
                      partyKey="agent"
                      data={partiesData.agent || {}}
                      onChange={(v) => setPartiesData('agent', v)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div className="space-y-1.5">
                      <Label>Çıkış Ülkesi</Label>
                      <CountryCombobox
                        value={watch('departure_country') || ''}
                        onChange={(v) => setValue('departure_country', v)}
                        placeholder="Çıkış ülkesi..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Varış Ülkesi</Label>
                      <CountryCombobox
                        value={watch('arrival_country') || ''}
                        onChange={(v) => setValue('arrival_country', v)}
                        placeholder="Varış ülkesi..."
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <TabSaveBar isEdit={isEdit} isPending={saveMut.isPending} hasErrors={hasErrors} />

            {/* Hızlı partner ekleme dialog'u */}
            <PartnerFormDialog
              open={!!quickAddType}
              onOpenChange={(o) => !o && setQuickAddType(null)}
              defaultType={quickAddType || 'customer'}
            />
          </TabsContent>

          {/* === YÜK === */}
          <TabsContent value="cargo" className="mt-0">
            <Card className="p-5 space-y-4">
              <SectionTitle>{t('shipment.sections.cargo_info')}</SectionTitle>
              <FieldArea label="Mal Tanımı" name="goods_description" register={register} errors={errors} />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* HS Kodu + Fransız Gümrük lookup butonu */}
                <div className="space-y-1.5">
                  <Label htmlFor="hs_code">HS Kodu</Label>
                  <div className="flex items-center gap-1">
                    <Input id="hs_code" {...register('hs_code')} placeholder="örn. 8703.23.10" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      title="Fransız Gümrük HS Kodu Arama (RITA)"
                      onClick={() => {
                        const today = new Date()
                        const d = String(today.getDate()).padStart(2, '0')
                        const m = String(today.getMonth() + 1).padStart(2, '0')
                        const y = today.getFullYear()
                        const url = `https://www.douane.gouv.fr/rita-encyclopedie/public/nomenclatures/popupNomenclature.action?date=${d}%2F${m}%2F${y}&nomenclatureCritere=`
                        window.open(url, '_blank', 'noopener,noreferrer')
                      }}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Mal Değeri + currency suffix */}
                <FieldWithSuffix
                  label="Mal Değeri"
                  name="goods_value"
                  register={register}
                  errors={errors}
                  type="number"
                  step="0.01"
                  suffix={watch('currency_code') || 'EUR'}
                />

                {/* Ağırlıklar */}
                <FieldWithSuffix label="Brüt Ağırlık" name="gross_weight" register={register} errors={errors} type="number" step="0.01" suffix="kg" />
                <FieldWithSuffix label="Net Ağırlık"  name="net_weight"   register={register} errors={errors} type="number" step="0.01" suffix="kg" />

                {/* Hacim + birim seçici (sadece UI; değer m³ olarak saklanır) */}
                <VolumeField form={form} />

                <Field label="Boyutlar" name="dimensions" register={register} errors={errors} placeholder="120x80x100 cm" />
                <Field label="Kap Adedi" name="quantity" register={register} errors={errors} type="number" />
                <Field label="Paket Sayısı" name="package_count" register={register} errors={errors} type="number" />
              </div>

              {/* Paket Tipi — Combobox (UN R21 standart 377 kod) */}
              <div className="space-y-1.5">
                <Label>Paket / Ambalaj Tipi</Label>
                <PackageTypeCombobox
                  value={watch('package_type') as string}
                  onChange={(v) => setValue('package_type', v, { shouldDirty: true })}
                  placeholder="Ambalaj tipi seçin veya yazın (örn. 4G, Karton Kutu)..."
                />
                <p className="text-[10px] text-muted-foreground">
                  UN Recommendation 21 standart kodları (Fransız Gümrük). Listede yoksa kendi etiketinizi yazıp Enter'a basabilirsiniz.
                </p>
              </div>

              <SectionTitle className="pt-4 border-t">Özel Koşullar</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CheckboxField label="Tehlikeli Madde (ADR)" name="dangerous_goods" form={form} />
                <CheckboxField label="Sıcaklık Kontrollü" name="temperature_controlled" form={form} />
                <CheckboxField label="Sigortalı" name="insurance" form={form} />
                {watch('dangerous_goods') ? (
                  <div className="space-y-1.5 md:col-span-3">
                    <Label>ADR / UN Kodu</Label>
                    <ADRCodeCombobox
                      value={watch('adr_code') as string}
                      onChange={(v) => {
                        setValue('adr_code', v, { shouldDirty: true })
                        rememberAdrCode(v)
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Yaygın UN kodlarından seçin veya kendi kodunuzu yazın. Son kullanılanlar üstte işaretli (★) görünür.
                    </p>
                  </div>
                ) : null}
                {watch('temperature_controlled') ? (
                  <>
                    <FieldWithSuffix label="Min Sıcaklık" name="temperature_min" register={register} errors={errors} type="number" step="0.1" suffix="°C" />
                    <FieldWithSuffix label="Max Sıcaklık" name="temperature_max" register={register} errors={errors} type="number" step="0.1" suffix="°C" />
                  </>
                ) : null}
              </div>

              {/* Kap (Crate) listesi */}
              <div className="pt-4 border-t">
                <CratesEditor
                  value={watch('crates_data') as string}
                  onChange={(json) => setValue('crates_data', json, { shouldDirty: true })}
                />
              </div>
            </Card>
            <TabSaveBar isEdit={isEdit} isPending={saveMut.isPending} hasErrors={hasErrors} />
          </TabsContent>

          {/* === FİNANSAL === */}
          <TabsContent value="financial" className="mt-0">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle>{t('shipment.sections.financial_items', { mode: t(modeCfg.label) })}</SectionTitle>
                <div className="text-[10px] text-muted-foreground">
                  Para birimi: <strong className="text-foreground">{watch('currency_code') || 'EUR'}</strong>
                </div>
              </div>
              <FinancialTable
                mode={config.key}
                currency={watch('currency_code') || 'EUR'}
                value={financialData}
                onChange={setFinancialData}
              />

              {/* Eski özet alanlar (geriye uyumluluk - üst seviye satış/maliyet) */}
              <details className="mt-4 pt-4 border-t">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none">
                  Eski Özet Alanlar (geriye uyumluluk)
                </summary>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                  <Field label="Toplam Alış (özet)" name="purchase_price" register={register} errors={errors} type="number" step="0.01" />
                  <Field label="Toplam Satış (özet)" name="sale_price" register={register} errors={errors} type="number" step="0.01" />
                  <ReadonlyField label="Net (otomatik)" value={
                    ((Number(watch('sale_price')) || 0) - (Number(watch('purchase_price')) || 0)).toFixed(2)
                  } currency={watch('currency_code') || 'EUR'} />
                </div>
              </details>
            </Card>
            <TabSaveBar isEdit={isEdit} isPending={saveMut.isPending} hasErrors={hasErrors} />
          </TabsContent>

          {/* === BELGELER === */}
          <TabsContent value="documents" className="mt-0">
            <Card className="p-5 space-y-4">
              <SectionTitle>{t('shipment.sections.document_status')}</SectionTitle>
              {!isEdit ? (
                <div className="p-4 rounded-md bg-warning/10 border border-warning/30 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <strong>Önce sevkiyatı kaydet</strong> — belge yüklemeleri için sevkiyat ID'si gerekli.
                    Sağ üstteki "Kaydet" butonuna bas, sonra bu sekmeye dön.
                  </div>
                </div>
              ) : (
                <>
                  {/* Zorunlu belge özeti */}
                  <div className={cn(
                    'p-3 rounded-md border text-sm',
                    missingRequired.length === 0
                      ? 'bg-success/10 border-success/30 text-success-foreground'
                      : 'bg-destructive/10 border-destructive/30'
                  )}>
                    {missingRequired.length === 0 ? (
                      <div className="flex items-center gap-2">
                        <Files className="w-4 h-4 text-success" />
                        <span>Tüm zorunlu belgeler tamamlanmış 🎉</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <FileWarning className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-destructive">
                            {missingRequired.length} zorunlu belge eksik:
                          </div>
                          <ul className="mt-1 text-xs space-y-0.5">
                            {missingRequired.map((d) => (
                              <li key={d.key}>• {d.label}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3-stage trafik ışıklı belge listesi (mode-aware) */}
                  <DocumentChecklist
                    shipmentId={Number(id)}
                    docList={requiredDocs}
                    documentsData={docStatus as DocumentsData}
                  />

                  <div className="pt-3 border-t">
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link to="/documents" target="_blank">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Belge Yönetim Sayfasını Aç
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </Card>
            <TabSaveBar isEdit={isEdit} isPending={saveMut.isPending} hasErrors={hasErrors} />
          </TabsContent>

          {/* === GEÇİCİ / TRANSİT DEPO === */}
          <TabsContent value="storage" className="mt-0">
            <div className="space-y-4">
              {/* Transit / Geçici Depo Tipi + Belgesi */}
              <TransitStorageCard form={form} warehouseTypeFromDb={warehouses.find((w) => w.name === watch('warehouse'))?.type_code} />

              <Card className="p-5 space-y-4">
                <SectionTitle>{t('shipment.sections.warehouse_info')}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Depo</Label>
                    <Combobox
                      value={watch('warehouse') || ''}
                      onChange={(v) => setValue('warehouse', v)}
                      options={warehouseOptions}
                      placeholder="Depo seçin..."
                      searchPlaceholder="Depo ara..."
                      allowCustom
                    />
                  </div>
                  <Field label="Depo Müşterisi" name="depo_musteri" register={register} errors={errors} />
                  <Field label="Giriş Tarihi" name="entry_date" register={register} errors={errors} type="date" />
                  <Field label="Çıkış Tarihi" name="exit_date" register={register} errors={errors} type="date" />
                  <Field label="Toplam Kap" name="depo_kap_sayisi" register={register} errors={errors} type="number" />
                  <div className="space-y-1.5">
                    <Label>Ücret Tipi</Label>
                    <Select value={watch('depo_ucret_tipi') || 'gun'} onValueChange={(v) => setValue('depo_ucret_tipi', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STORAGE_PRICING.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <Field label="Günlük Ücret" name="depo_gun_ucret" register={register} errors={errors} type="number" step="0.01" />
                  <Field label="Haftalık Ücret" name="depo_hafta_ucret" register={register} errors={errors} type="number" step="0.01" />
                  <Field label="Aylık Ücret" name="depo_ay_ucret" register={register} errors={errors} type="number" step="0.01" />
                </div>
              </Card>

              {/* Stok log + transit alert + handling KDV */}
              <StorageSection
                currency={watch('currency_code') || 'EUR'}
                entryDate={watch('entry_date') as string}
                exitDate={watch('exit_date') as string}
                kapCount={Number(watch('depo_kap_sayisi') || 0)}
                ratePerDay={Number(watch('depo_gun_ucret') || 0)}
                ratePerWeek={Number(watch('depo_hafta_ucret') || 0)}
                ratePerMonth={Number(watch('depo_ay_ucret') || 0)}
                pricingType={(watch('depo_ucret_tipi') as 'gun' | 'hafta' | 'ay') || 'gun'}
                warehouseTypeCode={
                  // Manuel seçim öncelikli; yoksa seçilen warehouse'un type_code'una düş
                  (() => {
                    try {
                      const sd = JSON.parse((watch('storage_data') as string) || '{}')
                      return (sd.warehouse_type_code as string) || warehouses.find((w) => w.name === watch('warehouse'))?.type_code
                    } catch { return warehouses.find((w) => w.name === watch('warehouse'))?.type_code }
                  })()
                }
                storageDataStr={watch('storage_data') as string}
                onChangeStorageData={(json) => setValue('storage_data', json, { shouldDirty: true })}
                stockLogStr={watch('depo_stock_log') as string}
                onChangeStockLog={(json) => setValue('depo_stock_log', json, { shouldDirty: true })}
              />
            </div>
            <TabSaveBar isEdit={isEdit} isPending={saveMut.isPending} hasErrors={hasErrors} />
          </TabsContent>

          {/* === SEVK PLANI === */}
          <TabsContent value="dispatch" className="mt-0">
            <div className="space-y-4">
              {!isEdit ? (
                <Card className="p-4 bg-warning/10 border-warning/30">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <div>
                      <strong>Önce sevkiyatı kaydet</strong> — atama yapmak için sevkiyat oluşturulmuş olmalı.
                    </div>
                  </div>
                </Card>
              ) : (
                <>
                  {/* Sevk özeti */}
                  <Card className="p-4 bg-gradient-to-br from-primary/5 to-success/5 border-primary/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Toplam Adet</div>
                        <div className="text-2xl font-bold">{dispatchSummary.totalQty}</div>
                        <div className="text-[10px] text-muted-foreground">kap</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Atanmış</div>
                        <div className="text-2xl font-bold text-success">{dispatchSummary.assignedQty}</div>
                        <div className="text-[10px] text-muted-foreground">kap</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Atanmamış</div>
                        <div className="text-2xl font-bold text-warning">{dispatchSummary.unassignedQty}</div>
                        <div className="text-[10px] text-muted-foreground">kap</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">İlerleme</div>
                        <div className="text-2xl font-bold text-primary">{dispatchSummary.progress}%</div>
                        <div className="mt-1 h-1.5 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-success" style={{ width: `${dispatchSummary.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <SectionTitle>Araç Atamaları ({assignments.length})</SectionTitle>
                      <Button asChild type="button" size="sm" variant="outline">
                        <Link to="/assignments" target="_blank">
                          <ExternalLink className="w-3.5 h-3.5" />
                          Atama Sayfasını Aç
                        </Link>
                      </Button>
                    </div>
                    {assignments.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground italic">
                        Henüz atama yapılmamış
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {assignments.map((a) => (
                          <div key={a.id} className="flex items-center gap-3 p-3 rounded border bg-muted/30">
                            <Package className="w-4 h-4 text-primary" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-mono font-medium">{a.plate}</div>
                              <div className="text-xs text-muted-foreground">
                                {a.driver_name || '—'} · {a.loading_date || 'Yükleme tarihi yok'}
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <div className="font-medium">{a.assigned_quantity} kap</div>
                              <div className="text-muted-foreground">{Number(a.assigned_weight).toFixed(0)} kg</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              )}
            </div>
            <TabSaveBar isEdit={isEdit} isPending={saveMut.isPending} hasErrors={hasErrors} />
          </TabsContent>

          {/* === FATURALAMA === */}
          <TabsContent value="invoice" className="mt-0">
            <Card className="p-5 space-y-4">
              <SectionTitle>{t('shipment.sections.invoice_info')}</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label={t('invoice.invoice_no', { defaultValue: 'Fatura No' })} name="invoice_no" register={register} errors={errors} />
                <Field label={t('invoice.invoice_date', { defaultValue: 'Fatura Tarihi' })} name="invoice_date" register={register} errors={errors} type="date" />
                <Field label={t('invoice.invoice_amount', { defaultValue: 'Fatura Tutarı' })} name="invoice_amount" register={register} errors={errors} type="number" step="0.01" />
                <div className="space-y-1.5">
                  <Label>{t('shipment.fields.payment_type')}</Label>
                  <Select value={watch('payment_type') || '__none__'} onValueChange={(v) => setValue('payment_type', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{t(p.label)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <CheckboxField label={t('shipment.fields.payment_received')} name="payment_received" form={form} />
              </div>
              <FieldArea label={t('invoice.payment_notes', { defaultValue: 'Ödeme Notları' })} name="payment_notes" register={register} errors={errors} />
            </Card>
            <TabSaveBar isEdit={isEdit} isPending={saveMut.isPending} hasErrors={hasErrors} />
          </TabsContent>

          {/* === GEÇMİŞ === */}
          <TabsContent value="history" className="mt-0">
            {isEdit && id ? (
              <HistoryPanel shipmentId={Number(id)} />
            ) : (
              <Card className="p-4 bg-warning/10 border-warning/30">
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <strong>Önce sevkiyatı kaydet</strong> — geçmiş kaydı sevkiyat oluşturulduktan sonra başlar.
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

// === Form yardımcı component'ları ===

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-xs font-semibold uppercase tracking-wider text-muted-foreground', className)}>
      {children}
    </h3>
  )
}

type FieldProps = {
  label: string
  name: keyof ShipmentFormValues
  register: UseFormRegister<ShipmentFormValues>
  errors: FieldErrors<ShipmentFormValues>
  type?: string
  step?: string
  placeholder?: string
  className?: string
}

function Field({ label, name, register, errors, className, ...rest }: FieldProps) {
  const err = (errors as Record<string, { message?: string } | undefined>)[name as string]
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={name as string}>{label}</Label>
      <Input id={name as string} {...register(name as never)} {...rest} />
      {err && <p className="text-xs text-destructive">{String(err.message ?? '')}</p>}
    </div>
  )
}

function FieldArea({ label, name, register, errors, className }: Omit<FieldProps, 'type' | 'step' | 'placeholder'>) {
  const err = (errors as Record<string, { message?: string } | undefined>)[name as string]
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={name as string}>{label}</Label>
      <Textarea id={name as string} rows={3} {...register(name as never)} />
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
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {t('shipment.save_bar_hint')}
      </span>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isEdit ? t('common.update') : t('common.save')}
      </Button>
    </div>
  )
}

/**
 * Sayı/metin alanı + suffix (örn. "kg", "€", "°C") — input'un sağ iç tarafına yapışık küçük etiket.
 */
function FieldWithSuffix({
  label, name, register, errors, suffix, type, step, placeholder, className,
}: FieldProps & { suffix: string }) {
  const err = (errors as Record<string, { message?: string } | undefined>)[name as string]
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={name as string}>{label}</Label>
      <div className="relative">
        <Input
          id={name as string}
          {...register(name as never)}
          type={type}
          step={step}
          placeholder={placeholder}
          className="pr-12"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium">
          {suffix}
        </span>
      </div>
      {err && <p className="text-xs text-destructive">{String(err.message ?? '')}</p>}
    </div>
  )
}

/**
 * Hacim alanı + birim seçici. Birim m³ harici seçilirse değer otomatik m³'e çevrilir
 * (DB her zaman m³ saklar). UI hangi birimde girildiğini kullanıcıya gösterir.
 */
function VolumeField({ form }: { form: ReturnType<typeof useForm<ShipmentFormValues>> }) {
  const { watch, setValue, register } = form
  const [unit, setUnit] = useState<'m3' | 'litre' | 'ft3'>('m3')
  const currentM3 = Number(watch('volume_cbm') || 0)

  // Birim değişince input'taki gösterilen sayıyı convert et
  const TO_M3: Record<typeof unit, number> = { m3: 1, litre: 0.001, ft3: 0.0283168 }
  const displayValue = unit === 'm3' ? currentM3 : (currentM3 / TO_M3[unit])

  return (
    <div className="space-y-1.5">
      <Label htmlFor="volume_cbm">Hacim</Label>
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <Input
            type="number"
            step="0.01"
            value={Number.isFinite(displayValue) && displayValue > 0 ? Number(displayValue.toFixed(3)) : ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || 0
              const inM3 = v * TO_M3[unit]
              setValue('volume_cbm', inM3 as never, { shouldDirty: true })
            }}
          />
          {/* Görünmez register — RHF tracking için */}
          <input type="hidden" {...register('volume_cbm')} />
        </div>
        <Select value={unit} onValueChange={(v) => setUnit(v as typeof unit)}>
          <SelectTrigger className="w-[80px] h-9 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="m3">m³</SelectItem>
            <SelectItem value="litre">litre</SelectItem>
            <SelectItem value="ft3">ft³</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {unit !== 'm3' && currentM3 > 0 && (
        <p className="text-[10px] text-muted-foreground">
          = {currentM3.toFixed(3)} m³ (depolama)
        </p>
      )}
    </div>
  )
}

/**
 * Transit / Geçici Depo bilgi kartı.
 * - Depo tipi (R/S/T/U/V/Y/Z) — manuel seçim; warehouse'tan otomatik gelirse onu fallback gösterir
 * - Transit evrak no
 * - Transit son geçerlilik tarihi (storage_data.transit_expiry_date — computeTransitAlert ile uyarı)
 *
 * Tüm değerler shipment.storage_data JSON'ında saklanır.
 */
function TransitStorageCard({
  form, warehouseTypeFromDb,
}: {
  form: ReturnType<typeof useForm<ShipmentFormValues>>
  warehouseTypeFromDb?: string | null
}) {
  const { watch, setValue } = form
  const storageDataStr = watch('storage_data') as string | undefined

  const storageData = useMemo(() => {
    if (!storageDataStr) return {} as Record<string, unknown>
    try { return JSON.parse(storageDataStr) || {} } catch { return {} }
  }, [storageDataStr])

  const updateSd = (patch: Record<string, unknown>) => {
    const next = { ...storageData, ...patch }
    setValue('storage_data', JSON.stringify(next), { shouldDirty: true })
  }

  // Etkin depo tipi: manuel öncelikli, yoksa warehouse'tan
  const manualType = (storageData.warehouse_type_code as string) || ''
  const effectiveType = manualType || warehouseTypeFromDb || ''
  const typeInfo = WAREHOUSE_TYPES_REF.find((w) => w.code === effectiveType)

  // Transit uyarısı
  const transitExpiry = (storageData.transit_expiry_date as string) || ''
  const expiryAlert = useMemo(() => {
    if (!transitExpiry) return null
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const expDate = new Date(transitExpiry)
    if (isNaN(expDate.getTime())) return null
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { level: 'expired' as const, daysLeft, expDate }
    if (daysLeft <= TRANSIT_EXPIRY_WARNING_DAYS_REF) return { level: 'warning' as const, daysLeft, expDate }
    return { level: 'ok' as const, daysLeft, expDate }
  }, [transitExpiry])

  return (
    <Card className="p-5 space-y-4">
      <SectionTitle>Transit / Geçici Depo Bilgileri</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Depo Tipi (Gümrük Kodu)</Label>
          <Select
            value={manualType || '__inherit__'}
            onValueChange={(v) => updateSd({ warehouse_type_code: v === '__inherit__' ? null : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seçiniz..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__inherit__">
                {warehouseTypeFromDb
                  ? `Depodan otomatik (${warehouseTypeFromDb})`
                  : 'Belirtilmedi'}
              </SelectItem>
              {WAREHOUSE_TYPES_REF.map((w) => (
                <SelectItem key={w.code} value={w.code}>
                  <span className="font-mono font-semibold">{w.code}</span>
                  <span className="ml-2">— {w.tr}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeInfo && (
            <p className="text-[10px] text-muted-foreground">
              <span className="font-semibold">{typeInfo.code} ({typeInfo.fr}):</span> {typeInfo.description}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transit_doc_no">Transit Evrak No</Label>
          <Input
            id="transit_doc_no"
            value={(storageData.transit_doc_no as string) || ''}
            onChange={(e) => updateSd({ transit_doc_no: e.target.value })}
            placeholder="örn. T1-MRN-2026..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transit_expiry">Transit Son Geçerlilik Tarihi</Label>
          <Input
            id="transit_expiry"
            type="date"
            value={transitExpiry.slice(0, 10)}
            onChange={(e) => updateSd({ transit_expiry_date: e.target.value })}
          />
        </div>
      </div>

      {/* Uyarı kartları */}
      {expiryAlert && expiryAlert.level === 'expired' && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/40 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-destructive">Transit süresi DOLDU!</div>
            <div className="text-muted-foreground">
              Son tarih {formatDateTr(expiryAlert.expDate)} — {Math.abs(expiryAlert.daysLeft)} gün gecikme
            </div>
          </div>
        </div>
      )}
      {expiryAlert && expiryAlert.level === 'warning' && (
        <div className="p-3 rounded-md bg-warning/10 border border-warning/40 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-warning">Transit süresi yakında doluyor!</div>
            <div className="text-muted-foreground">
              {expiryAlert.daysLeft === 0
                ? 'Bugün son gün'
                : `${expiryAlert.daysLeft} gün kaldı`}
              {' '}({formatDateTr(expiryAlert.expDate)})
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function formatDateTr(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function ReadonlyField({ label, value, currency }: { label: string; value: string; currency: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="h-9 px-3 py-1 flex items-center rounded-md border border-dashed bg-muted/30 text-sm font-mono">
        {value} <span className="text-xs text-muted-foreground ml-1">{currency}</span>
      </div>
    </div>
  )
}

type FormType = ReturnType<typeof useForm<ShipmentFormValues>>
function CheckboxField({ label, name, form }: { label: string; name: keyof ShipmentFormValues; form: FormType }) {
  const value = form.watch(name as never) as unknown
  const checked = Number(value) === 1 || value === true
  return (
    <div className="flex items-center gap-2 h-9">
      <Checkbox
        id={name as string}
        checked={checked}
        onCheckedChange={(c) => form.setValue(name as never, (c ? 1 : 0) as never)}
      />
      <Label htmlFor={name as string} className="cursor-pointer">{label}</Label>
    </div>
  )
}
