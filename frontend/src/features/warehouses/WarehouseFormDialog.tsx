import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useSaveWarehouse, WAREHOUSE_TYPES } from './hooks'
import type { Warehouse } from '@/types/api'

// Hata mesajları i18n'den gelir — şema bileşen içinde t() ile kurulur
const buildSchema = (t: (k: string) => string) => z.object({
  name: z.string().min(1, t('ui.wh_err_name_required')),
  type_code: z.enum(['R', 'S', 'T', 'U', 'V', 'Y', 'Z']),
  address: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  capacity_info: z.string().optional().or(z.literal('')),
  responsible_person: z.string().optional().or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
  contact_email: z.string().email(t('partner.err.invalid_email')).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
})
type FormValues = z.infer<ReturnType<typeof buildSchema>>

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  warehouse?: Warehouse | null
}

export function WarehouseFormDialog({ open, onOpenChange, warehouse }: Props) {
  const { t } = useTranslation()
  const schema = useMemo(() => buildSchema(t), [t])
  const isEdit = !!warehouse
  const saveMut = useSaveWarehouse()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type_code: 'U', status: 'active', name: '' },
  })
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = form

  useEffect(() => {
    if (open) {
      if (warehouse) {
        reset({
          name: warehouse.name || '',
          type_code: warehouse.type_code || 'U',
          address: warehouse.address || '',
          postal_code: warehouse.postal_code || '',
          city: warehouse.city || '',
          country: warehouse.country || '',
          capacity_info: warehouse.capacity_info || '',
          responsible_person: warehouse.responsible_person || '',
          contact_phone: warehouse.contact_phone || '',
          contact_email: warehouse.contact_email || '',
          notes: warehouse.notes || '',
          status: warehouse.status || 'active',
        })
      } else {
        reset({ type_code: 'U', status: 'active', name: '' })
      }
    }
  }, [open, warehouse, reset])

  const onSubmit = (values: FormValues) => {
    saveMut.mutate(
      { ...values, warehouse_id: warehouse?.id },
      {
        onSuccess: () => {
          toast.success(isEdit ? t('ui.wh_updated') : t('ui.wh_created'))
          onOpenChange(false)
        },
        onError: (err: Error) => toast.error(err.message),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('ui.wh_edit_title', { name: warehouse.name }) : t('warehouse.new')}</DialogTitle>
          <DialogDescription>
            {isEdit ? `${t('warehouse.code')}: ${warehouse?.warehouse_code}` : t('ui.wh_new_hint')}
          </DialogDescription>
        </DialogHeader>

        <form id="warehouse-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t('ui.depo_adi')}</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('ui.depo_tipi')}</Label>
              <Select value={watch('type_code')} onValueChange={(v) => setValue('type_code', v as FormValues['type_code'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(WAREHOUSE_TYPES).map((wt) => (
                    <SelectItem key={wt.code} value={wt.code}>
                      <span className="font-mono">{wt.code}</span> · {t(wt.label)} <span className="text-muted-foreground text-xs">({t(wt.description)})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('common.status')}</Label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FormValues['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('vehicle.status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('vehicle.status.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">{t('partner.address')}</Label>
            <Textarea id="address" rows={2} {...register('address')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="postal_code">{t('partner.postal_code')}</Label>
              <Input id="postal_code" {...register('postal_code')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">{t('partner.city')}</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">{t('partner.country')}</Label>
              <Input id="country" {...register('country')} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="capacity_info">{t('ui.wh_capacity_info')}</Label>
              <Input id="capacity_info" placeholder={t('ui.wh_capacity_ph')} {...register('capacity_info')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="responsible_person">{t('ui.sorumlu_kisi')}</Label>
              <Input id="responsible_person" {...register('responsible_person')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_phone">{t('shipment.fields.phone')}</Label>
              <Input id="contact_phone" {...register('contact_phone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_email">{t('shipment.fields.email')}</Label>
              <Input id="contact_email" type="email" {...register('contact_email')} />
              {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t('ui.asg_notes')}</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button type="submit" form="warehouse-form" disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? t('common.update') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
