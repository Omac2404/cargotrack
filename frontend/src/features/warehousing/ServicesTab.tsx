import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Pencil, Trash2, Loader2, Save, X, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ExportButton } from '@/components/shared/ExportButton'
import { cn, formatDate, formatMoney, formatNumber } from '@/lib/utils'
import { useCan } from '@/hooks/useCan'
import { useWhServices, useSaveWhService, useDeleteWhService } from './hooks'
import type { WhAccount, WhService, ServiceType } from './types'
import { SERVICE_TYPES, SERVICE_RATE_COL, todayISO, periodRange, currentPeriod } from './types'

interface Draft {
  id?: number
  service_date: string
  /** 'custom' ya da sözleşmedeki özel hizmetin 'extra:<index>' anahtarı */
  choice: string
  label: string
  unit: string
  quantity: string
  unit_price: string
  reference: string
  notes: string
}

const emptyDraft = (): Draft => ({
  service_date: todayISO(), choice: 'order_prep', label: '', unit: '', quantity: '', unit_price: '', reference: '', notes: '',
})

export function ServicesTab({ account }: { account: WhAccount }) {
  const { t } = useTranslation()
  const canOperate = useCan('warehousing.operate')
  const { data: services = [], isLoading } = useWhServices(account.id)
  const saveMut = useSaveWhService(account.id)
  const deleteMut = useDeleteWhService(account.id)
  const cur = account.currency_code || 'EUR'

  const extras = Array.isArray(account.extra_services) ? account.extra_services : []

  /** Seçime göre tarifeden birim fiyat */
  const tariffFor = (choice: string): { price: string; label: string; unit: string } => {
    if (choice.startsWith('extra:')) {
      const x = extras[Number(choice.slice(6))]
      return { price: x ? String(Number(x.price) || '') : '', label: x?.label || '', unit: x?.unit || '' }
    }
    if (choice === 'custom') return { price: '', label: '', unit: '' }
    const col = SERVICE_RATE_COL[choice as Exclude<ServiceType, 'custom'>]
    const v = Number(account[col]) || 0
    return { price: v ? String(v) : '', label: '', unit: '' }
  }

  const [draft, setDraft] = useState<Draft>(() => ({ ...emptyDraft(), unit_price: tariffFor('order_prep').price }))
  const [period, setPeriod] = useState(currentPeriod())
  const [allPeriods, setAllPeriods] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WhService | null>(null)

  const rows = useMemo(() => {
    const list = [...services].reverse()
    if (allPeriods) return list
    const { from, to } = periodRange(period)
    return list.filter((s) => s.service_date >= from && s.service_date <= to)
  }, [services, period, allPeriods])

  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0), [rows])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const choose = (choice: string) => {
    const tf = tariffFor(choice)
    setDraft((d) => ({ ...d, choice, unit_price: tf.price, label: tf.label, unit: tf.unit }))
  }

  const isCustom = draft.choice === 'custom' || draft.choice.startsWith('extra:')
  const amount = (Number(draft.quantity) || 0) * (Number(draft.unit_price) || 0)

  const submit = () => {
    if (!draft.service_date) return toast.error(t('whs.err_date'))
    if (!(Number(draft.quantity) > 0)) return toast.error(t('whs.err_quantity'))
    if (isCustom && !draft.label.trim()) return toast.error(t('whs.err_label'))
    saveMut.mutate({
      ...(draft.id ? { id: draft.id } : {}),
      service_date: draft.service_date,
      service_type: isCustom ? 'custom' : draft.choice,
      label: isCustom ? draft.label : '',
      unit: isCustom ? draft.unit : '',
      quantity: draft.quantity,
      unit_price: draft.unit_price === '' ? undefined : draft.unit_price,
      reference: draft.reference,
      notes: draft.notes,
    }, {
      onSuccess: () => {
        toast.success(draft.id ? t('whs.service_updated') : t('whs.service_saved'))
        setDraft((d) => {
          const keepChoice = d.id ? 'order_prep' : d.choice
          const tf = tariffFor(keepChoice)
          return { ...emptyDraft(), service_date: d.service_date, choice: keepChoice, unit_price: tf.price, label: tf.label, unit: tf.unit }
        })
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  const edit = (s: WhService) => {
    let choice: string = s.service_type
    if (s.service_type === 'custom') {
      const idx = extras.findIndex((x) => x.label === s.label)
      choice = idx >= 0 ? `extra:${idx}` : 'custom'
    }
    setDraft({
      id: s.id, service_date: s.service_date, choice, label: s.label || '', unit: s.unit || '',
      quantity: String(s.quantity), unit_price: String(s.unit_price), reference: s.reference || '', notes: s.notes || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const serviceName = (s: WhService) => (s.service_type === 'custom' ? s.label : t(`whs.svc_${s.service_type}`))

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success(t('whs.service_deleted')); setDeleteTarget(null) },
      onError: (err: Error) => { toast.error(err.message); setDeleteTarget(null) },
    })
  }

  return (
    <div className="space-y-4">
      {canOperate && (
        <Card className={cn('p-4 space-y-3', draft.id && 'ring-2 ring-primary/40')}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {draft.id ? t('whs.edit_service') : t('whs.new_service')}
            </h3>
            {draft.id && (
              <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setDraft({ ...emptyDraft(), unit_price: tariffFor('order_prep').price })}>
                <X className="w-3.5 h-3.5" /> {t('common.cancel')}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="sv-date">{t('common.date')}</Label>
              <Input id="sv-date" type="date" value={draft.service_date} onChange={(e) => set('service_date', e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-3">
              <Label>{t('whs.service')}</Label>
              <Select value={draft.choice} onValueChange={choose}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.filter((s) => s !== 'custom').map((s) => (
                    <SelectItem key={s} value={s}>{t(`whs.svc_${s}`)}</SelectItem>
                  ))}
                  {extras.map((x, i) => (
                    <SelectItem key={`extra:${i}`} value={`extra:${i}`}>{x.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">{t('whs.svc_custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isCustom && (
              <>
                <div className="space-y-1.5 md:col-span-3">
                  <Label htmlFor="sv-label">{t('whs.service_label')} *</Label>
                  <Input id="sv-label" value={draft.label} onChange={(e) => set('label', e.target.value)} />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <Label htmlFor="sv-unit">{t('whs.unit')}</Label>
                  <Input id="sv-unit" value={draft.unit} onChange={(e) => set('unit', e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="sv-qty">{t('whs.quantity')} *</Label>
              <Input id="sv-qty" type="number" min="0" step="0.01" value={draft.quantity} onChange={(e) => set('quantity', e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="sv-price">{t('whs.unit_price')} ({cur})</Label>
              <Input id="sv-price" type="number" min="0" step="0.0001" value={draft.unit_price} onChange={(e) => set('unit_price', e.target.value)} placeholder={t('whs.from_tariff')} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="sv-ref">{t('whs.reference')}</Label>
              <Input id="sv-ref" value={draft.reference} onChange={(e) => set('reference', e.target.value)} placeholder={t('whs.order_ref_ph')} />
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-7">
              <Label htmlFor="sv-notes">{t('whs.note')}</Label>
              <Input id="sv-notes" value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <div className="col-span-1 md:col-span-3 text-sm">
              <span className="text-muted-foreground">{t('whs.amount_ht')}: </span>
              <span className="font-bold tabular-nums">{formatMoney(amount, cur)}</span>
            </div>
            <div className="col-span-1 md:col-span-2">
              <Button type="button" className="w-full" onClick={submit} disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {draft.id ? t('common.update') : t('common.save')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Input type="month" className="h-8 w-[160px]" value={period} disabled={allPeriods} onChange={(e) => e.target.value && setPeriod(e.target.value)} />
        <Button type="button" variant={allPeriods ? 'default' : 'outline'} size="sm" className="h-8" onClick={() => setAllPeriods((v) => !v)}>
          {t('whs.all_periods')}
        </Button>
        <div className="text-xs text-muted-foreground px-2">
          {rows.length} {t('common.records')} · <span className="font-semibold text-foreground">{formatMoney(total, cur)} HT</span>
        </div>
        <div className="ml-auto">
          <ExportButton
            data={[...rows].reverse()}
            filename={`prestations_${account.account_code || account.id}`}
            sheetName={t('whs.tab_services')}
            label={t('common.export_excel')}
            columns={[
              { header: t('common.date'), key: 'service_date' },
              { header: t('whs.service'), key: 'service_type', format: (_v, r) => serviceName(r) },
              { header: t('whs.quantity'), key: 'quantity' },
              { header: t('whs.unit'), key: 'unit' },
              { header: t('whs.unit_price'), key: 'unit_price' },
              { header: t('whs.amount_ht'), key: 'amount' },
              { header: t('whs.reference'), key: 'reference' },
              { header: t('whs.note'), key: 'notes' },
            ]}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Inbox className="w-9 h-9 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('whs.no_services')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('common.date')}</TableHead>
                <TableHead>{t('whs.service')}</TableHead>
                <TableHead className="text-right w-[90px]">{t('whs.quantity')}</TableHead>
                <TableHead className="text-right w-[110px]">{t('whs.unit_price')}</TableHead>
                <TableHead className="text-right w-[120px]">{t('whs.amount_ht')}</TableHead>
                <TableHead>{t('whs.reference')}</TableHead>
                {canOperate && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id} className={cn(draft.id === s.id && 'bg-primary/5')}>
                  <TableCell className="tabular-nums text-xs">{formatDate(s.service_date)}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline" className="font-normal">{serviceName(s)}</Badge>
                    {s.notes && <div className="text-[10px] text-muted-foreground mt-0.5">{s.notes}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatNumber(s.quantity, Number.isInteger(Number(s.quantity)) ? 0 : 2)} {s.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{formatMoney(s.unit_price, cur)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatMoney(s.amount, cur)}</TableCell>
                  <TableCell className="text-xs font-mono">{s.reference || '—'}</TableCell>
                  {canOperate && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => edit(s)} title={t('common.edit')}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(s)} title={t('common.delete')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('whs.delete_service_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `${formatDate(deleteTarget.service_date)} — ${serviceName(deleteTarget)} × ${deleteTarget.quantity}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
