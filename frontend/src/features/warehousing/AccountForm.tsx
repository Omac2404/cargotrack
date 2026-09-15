import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/shared/Combobox'
import { CurrencyCombobox } from '@/components/shared/CurrencyCombobox'
import { usePartners } from '@/features/partners/hooks'
import { useWarehouses } from '@/features/warehouses/hooks'
import type { WhAccount, ExtraService, StorageBilling } from './types'
import { STORAGE_BILLINGS } from './types'

type FormState = Omit<WhAccount, 'id' | 'account_code' | 'current_stock' | 'movement_count'>

const EMPTY: FormState = {
  client_name: '', warehouse: '', contact_person: '', contact_email: '', contact_phone: '',
  start_date: null, end_date: null, status: 'active', currency_code: 'EUR', vat_rate: 20,
  storage_billing: 'pallet_day', storage_rate: '', fixed_monthly_fee: '', min_monthly_fee: '',
  in_rate: '', out_rate: '', order_prep_rate: '', order_line_rate: '', label_rate: '',
  filming_rate: '', palletizing_rate: '', unloading_rate: '',
  extra_services: [], payment_terms: '', notes: '',
}

/** Sayısal alanlar ekranda boş görünsün; 0 kaydedilmiş değer "tarife yok" demektir */
// DECIMAL kolonlar "0.4200" döner; ekranda sade sayı (0.42) gösterilir
const blankZero = (v: unknown) => (v === null || v === undefined || Number(v) === 0 ? '' : String(Number(v)))

function fromAccount(a?: WhAccount | null): FormState {
  if (!a) return { ...EMPTY }
  return {
    ...EMPTY,
    ...a,
    storage_rate: blankZero(a.storage_rate),
    fixed_monthly_fee: blankZero(a.fixed_monthly_fee),
    min_monthly_fee: blankZero(a.min_monthly_fee),
    in_rate: blankZero(a.in_rate),
    out_rate: blankZero(a.out_rate),
    order_prep_rate: blankZero(a.order_prep_rate),
    order_line_rate: blankZero(a.order_line_rate),
    label_rate: blankZero(a.label_rate),
    filming_rate: blankZero(a.filming_rate),
    palletizing_rate: blankZero(a.palletizing_rate),
    unloading_rate: blankZero(a.unloading_rate),
    vat_rate: a.vat_rate === null || a.vat_rate === undefined ? 20 : Number(a.vat_rate),
    extra_services: Array.isArray(a.extra_services) ? a.extra_services : [],
  }
}

interface Props {
  account?: WhAccount | null
  onSubmit: (data: Partial<WhAccount>) => void
  isPending: boolean
  readOnly?: boolean
  submitLabel: string
}

/**
 * Depo hesabı (sözleşme + tarife) formu — yeni hesap diyaloğunda ve
 * hesap sayfasının "Sözleşme & Tarifeler" sekmesinde ortak kullanılır.
 */
// Farklı bir hesap için yeniden kurulması gerektiğinde çağıran taraf `key={account.id}` verir
export function AccountForm({ account, onSubmit, isPending, readOnly = false, submitLabel }: Props) {
  const { t } = useTranslation()
  const [f, setF] = useState<FormState>(() => fromAccount(account))
  const [error, setError] = useState('')

  const { data: partners = [] } = usePartners('')
  const { data: warehouses = [] } = useWarehouses()
  const partnerOptions = useMemo(
    () => partners.map((p) => ({ value: p.company_name, label: p.company_name, description: [p.partner_code, p.city].filter(Boolean).join(' · ') })),
    [partners]
  )
  const warehouseOptions = useMemo(
    () => warehouses.filter((w) => w.status === 'active').map((w) => ({ value: w.name, label: w.name, description: [w.warehouse_code, w.city].filter(Boolean).join(' · ') })),
    [warehouses]
  )

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setF((prev) => ({ ...prev, [key]: value }))

  const numInput = (key: keyof FormState, label: string, hint?: string, step = '0.0001') => (
    <div className="space-y-1.5">
      <Label htmlFor={`wh-${String(key)}`}>{label}</Label>
      <Input
        id={`wh-${String(key)}`}
        type="number"
        min="0"
        step={step}
        value={(f[key] as string | number | null) ?? ''}
        onChange={(e) => set(key, e.target.value as never)}
        disabled={readOnly}
        placeholder="0"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )

  const updateExtra = (i: number, patch: Partial<ExtraService>) =>
    set('extra_services', f.extra_services.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))

  const submit = () => {
    if (!f.client_name.trim()) {
      setError(t('whs.err_client_required'))
      return
    }
    setError('')
    onSubmit({
      ...(account ? { id: account.id } : {}),
      ...f,
      extra_services: f.extra_services.filter((x) => String(x.label || '').trim()),
    })
  }

  const rateLabel: Record<StorageBilling, string> = {
    pallet_day: t('whs.rate_pallet_day'),
    pallet_month_avg: t('whs.rate_pallet_month'),
    pallet_month_peak: t('whs.rate_pallet_month'),
    pallet_month_started: t('whs.rate_pallet_month'),
    fixed_month: t('whs.rate_fixed'),
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('whs.section_client')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('whs.client')} *</Label>
            <Combobox
              value={f.client_name}
              onChange={(v) => set('client_name', v)}
              options={partnerOptions}
              placeholder={t('whs.client_ph')}
              allowCustom
              disabled={readOnly}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t('whs.warehouse')}</Label>
            <Combobox
              value={f.warehouse}
              onChange={(v) => set('warehouse', v)}
              options={warehouseOptions}
              placeholder={t('whs.warehouse_ph')}
              allowCustom
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-contact">{t('whs.contact_person')}</Label>
            <Input id="wh-contact" value={f.contact_person} onChange={(e) => set('contact_person', e.target.value)} disabled={readOnly} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wh-email">{t('partner.email')}</Label>
              <Input id="wh-email" type="email" value={f.contact_email} onChange={(e) => set('contact_email', e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-phone">{t('partner.phone')}</Label>
              <Input id="wh-phone" value={f.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} disabled={readOnly} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="wh-start">{t('whs.start_date')}</Label>
            <Input id="wh-start" type="date" value={f.start_date || ''} onChange={(e) => set('start_date', e.target.value || null)} disabled={readOnly} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-end">{t('whs.end_date')}</Label>
            <Input id="wh-end" type="date" value={f.end_date || ''} onChange={(e) => set('end_date', e.target.value || null)} disabled={readOnly} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('common.status')}</Label>
            <Select value={f.status} onValueChange={(v) => set('status', v as FormState['status'])} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('whs.status_active')}</SelectItem>
                <SelectItem value="suspended">{t('whs.status_suspended')}</SelectItem>
                <SelectItem value="closed">{t('whs.status_closed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('shipment.fields.currency')}</Label>
            <CurrencyCombobox value={f.currency_code} onChange={(v) => set('currency_code', v || 'EUR')} disabled={readOnly} />
          </div>
          {numInput('vat_rate', t('whs.vat_rate'), undefined, '0.01')}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('whs.section_storage')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label>{t('whs.storage_billing')}</Label>
            <Select value={f.storage_billing} onValueChange={(v) => set('storage_billing', v as StorageBilling)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORAGE_BILLINGS.map((b) => (
                  <SelectItem key={b} value={b}>{t(`whs.billing_${b}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">{t(`whs.billing_${f.storage_billing}_hint`)}</p>
          </div>
          {f.storage_billing === 'fixed_month'
            ? numInput('fixed_monthly_fee', rateLabel.fixed_month, undefined, '0.01')
            : numInput('storage_rate', rateLabel[f.storage_billing])}
          {numInput('min_monthly_fee', t('whs.min_monthly_fee'), t('whs.min_monthly_fee_hint'), '0.01')}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('whs.section_handling')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {numInput('in_rate', t('whs.in_rate'))}
          {numInput('out_rate', t('whs.out_rate'))}
          {numInput('order_prep_rate', t('whs.svc_order_prep_rate'))}
          {numInput('order_line_rate', t('whs.svc_order_line_rate'))}
          {numInput('label_rate', t('whs.svc_labeling_rate'))}
          {numInput('filming_rate', t('whs.svc_filming_rate'))}
          {numInput('palletizing_rate', t('whs.svc_palletizing_rate'))}
          {numInput('unloading_rate', t('whs.svc_unloading_rate'))}
        </div>

        <div className="space-y-2 pt-3 border-t">
          <div className="flex items-center justify-between">
            <Label>{t('whs.extra_services')}</Label>
            {!readOnly && (
              <Button type="button" variant="outline" size="sm" className="h-7"
                      onClick={() => set('extra_services', [...f.extra_services, { label: '', unit: '', price: '' }])}>
                <Plus className="w-3.5 h-3.5" /> {t('whs.add_extra_service')}
              </Button>
            )}
          </div>
          {f.extra_services.length === 0 && <p className="text-xs text-muted-foreground">{t('whs.extra_services_hint')}</p>}
          {f.extra_services.map((x, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_120px_36px] gap-2 items-center">
              <Input value={x.label} onChange={(e) => updateExtra(i, { label: e.target.value })} placeholder={t('whs.extra_label_ph')} className="h-8" disabled={readOnly} />
              <Input value={x.unit} onChange={(e) => updateExtra(i, { unit: e.target.value })} placeholder={t('whs.unit')} className="h-8" disabled={readOnly} />
              <Input type="number" min="0" step="0.0001" value={x.price} onChange={(e) => updateExtra(i, { price: e.target.value })} placeholder={t('whs.unit_price')} className="h-8" disabled={readOnly} />
              {!readOnly && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => set('extra_services', f.extra_services.filter((_, idx) => idx !== i))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="wh-terms">{t('whs.payment_terms')}</Label>
            <Input id="wh-terms" value={f.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} placeholder={t('whs.payment_terms_ph')} disabled={readOnly} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-notes">{t('ui.asg_notes')}</Label>
            <Textarea id="wh-notes" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} disabled={readOnly} />
          </div>
        </div>
      </Card>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="button" onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {submitLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
