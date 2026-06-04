import { useEffect } from 'react'
import { useForm, type UseFormRegister, type FieldErrors } from 'react-hook-form'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useSavePartner, PARTNER_TYPE_LABELS } from './hooks'
import type { Partner, PartnerType } from '@/types/api'

const schema = z.object({
  type: z.enum(['customer', 'receiver', 'sender', 'agent']),
  extra_roles: z.array(z.string()),
  company_name: z.string().min(1, 'Şirket adı zorunludur'),
  physical_address: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  contact_person: z.string().optional().or(z.literal('')),
  contact_email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
  tax_number: z.string().optional().or(z.literal('')),
  mersis_number: z.string().optional().or(z.literal('')),
  eori_number: z.string().optional().or(z.literal('')),
  billing_address: z.string().optional().or(z.literal('')),
  billing_email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  partner?: Partner | null
  defaultType?: PartnerType
}

export function PartnerFormDialog({ open, onOpenChange, partner, defaultType = 'customer' }: Props) {
  const isEdit = !!partner
  const saveMut = useSavePartner()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, extra_roles: [], company_name: '' },
  })
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = form

  useEffect(() => {
    if (open) {
      if (partner) {
        const extras = Array.isArray(partner.extra_roles)
          ? partner.extra_roles
          : typeof partner.extra_roles === 'string' && partner.extra_roles
            ? partner.extra_roles.split(',')
            : []
        reset({
          type: partner.type,
          extra_roles: extras,
          company_name: partner.company_name || '',
          physical_address: partner.physical_address || '',
          postal_code: partner.postal_code || '',
          city: partner.city || '',
          country: partner.country || '',
          contact_person: partner.contact_person || '',
          contact_email: partner.contact_email || '',
          contact_phone: partner.contact_phone || '',
          tax_number: partner.tax_number || '',
          mersis_number: partner.mersis_number || '',
          eori_number: partner.eori_number || '',
          billing_address: partner.billing_address || '',
          billing_email: partner.billing_email || '',
        })
      } else {
        reset({ type: defaultType, extra_roles: [], company_name: '' })
      }
    }
  }, [open, partner, defaultType, reset])

  const currentType = watch('type')
  const extraRoles = watch('extra_roles') || []

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, partner_id: partner?.id }
    saveMut.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? 'Partner güncellendi' : 'Partner oluşturuldu')
        onOpenChange(false)
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `${partner.company_name} düzenle` : 'Yeni Partner'}</DialogTitle>
          <DialogDescription>
            {isEdit ? partner?.partner_code : 'Müşteri, gönderici, alıcı veya acente kaydı oluştur.'}
          </DialogDescription>
        </DialogHeader>

        <form id="partner-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ana Rol *</Label>
              <Select value={currentType} onValueChange={(v) => setValue('type', v as PartnerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PARTNER_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Ek Roller (opsiyonel)</Label>
              <div className="flex flex-wrap gap-3 h-9 items-center">
                {(Object.keys(PARTNER_TYPE_LABELS) as PartnerType[])
                  .filter((t) => t !== currentType)
                  .map((t) => (
                    <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={extraRoles.includes(t)}
                        onCheckedChange={(c) => {
                          const next = c ? [...extraRoles, t] : extraRoles.filter((r) => r !== t)
                          setValue('extra_roles', next)
                        }}
                      />
                      {PARTNER_TYPE_LABELS[t]}
                    </label>
                  ))}
              </div>
            </div>
          </div>

          <Section>Şirket</Section>
          <Field label="Şirket Adı *" name="company_name" register={register} errors={errors} required />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Şehir" name="city" register={register} errors={errors} />
            <Field label="Posta Kodu" name="postal_code" register={register} errors={errors} />
            <Field label="Ülke" name="country" register={register} errors={errors} className="md:col-span-2" />
          </div>
          <FieldArea label="Fiziksel Adres" name="physical_address" register={register} errors={errors} />

          <Section>Vergi / Tanıtıcı</Section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Vergi No" name="tax_number" register={register} errors={errors} />
            <Field label="MERSİS" name="mersis_number" register={register} errors={errors} />
            <Field label="EORI" name="eori_number" register={register} errors={errors} />
          </div>

          <Section>İletişim</Section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="İletişim Kişi" name="contact_person" register={register} errors={errors} />
            <Field label="Telefon" name="contact_phone" register={register} errors={errors} />
            <Field label="E-posta" name="contact_email" register={register} errors={errors} type="email" />
          </div>

          <Section>Faturalama</Section>
          <FieldArea label="Faturalama Adresi" name="billing_address" register={register} errors={errors} />
          <Field label="Fatura E-postası" name="billing_email" register={register} errors={errors} type="email" />
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button type="submit" form="partner-form" disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-2 border-t first:border-t-0 first:pt-0">
      {children}
    </h4>
  )
}

type FieldProps = {
  label: string
  name: keyof FormValues
  register: UseFormRegister<FormValues>
  errors: FieldErrors<FormValues>
  type?: string
  className?: string
  required?: boolean
}

function Field({ label, name, register, errors, className, required, ...rest }: FieldProps) {
  const err = errors[name as keyof FieldErrors<FormValues>]
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={name as string}>{label}</Label>
      <Input id={name as string} {...register(name as never)} {...rest} />
      {err && <p className="text-xs text-destructive">{String((err as { message?: string }).message)}</p>}
    </div>
  )
}

function FieldArea({ label, name, register, errors }: Omit<FieldProps, 'type' | 'required'>) {
  const err = errors[name as keyof FieldErrors<FormValues>]
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name as string}>{label}</Label>
      <Textarea id={name as string} rows={2} {...register(name as never)} />
      {err && <p className="text-xs text-destructive">{String((err as { message?: string }).message)}</p>}
    </div>
  )
}
