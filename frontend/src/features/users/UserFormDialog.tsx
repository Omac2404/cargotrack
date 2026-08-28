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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useSaveUser } from './hooks'
import type { User, UserRole } from '@/types/api'

// Hata mesajları i18n'den gelir — şema bileşen içinde t() ile kurulur
const buildSchema = (t: (k: string) => string) => z.object({
  username: z.string().min(1, t('ui.usr_err_username_required')).optional(),
  full_name: z.string().min(1, t('ui.usr_err_fullname_required')),
  email: z.string().email(t('partner.err.invalid_email')).optional().or(z.literal('')),
  role: z.enum(['super_admin', 'admin', 'user']),
  status: z.enum(['active', 'inactive']),
  password: z.string().optional().or(z.literal('')),
})
type FormValues = z.infer<ReturnType<typeof buildSchema>>

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  user?: User | null
}

export function UserFormDialog({ open, onOpenChange, user }: Props) {
  const { t } = useTranslation()
  const schema = useMemo(() => buildSchema(t), [t])
  const isEdit = !!user
  const saveMut = useSaveUser()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'admin', status: 'active', full_name: '', username: '' },
  })
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = form

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          username: user.username,
          full_name: user.full_name,
          email: user.email || '',
          role: user.role,
          status: user.status || 'active',
          password: '',
        })
      } else {
        reset({ role: 'admin', status: 'active', full_name: '', username: '', email: '', password: '' })
      }
    }
  }, [open, user, reset])

  const onSubmit = (values: FormValues) => {
    // Edit'te password boş olabilir (değiştirme yok)
    const payload: Record<string, unknown> = {
      full_name: values.full_name,
      email: values.email,
      role: values.role,
      status: values.status,
    }
    if (values.password) payload.password = values.password
    if (isEdit) {
      payload.user_id = user.id
    } else {
      payload.username = values.username
      payload.password = values.password
    }

    saveMut.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? t('ui.usr_updated') : t('ui.usr_created'))
        onOpenChange(false)
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('ui.usr_edit_title', { name: user.full_name }) : t('users.new')}</DialogTitle>
          <DialogDescription>
            {isEdit ? `@${user?.username}` : t('ui.usr_new_hint')}
          </DialogDescription>
        </DialogHeader>

        <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="username">{t('ui.kullanici_adi')}</Label>
              <Input id="username" {...register('username')} autoComplete="off" />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="full_name">{t('ui.usr_full_name_req')}</Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t('shipment.fields.email')}</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('auth.role')}</Label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('auth.roles.user')}</SelectItem>
                  <SelectItem value="admin">{t('auth.roles.admin')}</SelectItem>
                  <SelectItem value="super_admin">{t('auth.roles.super_admin')}</SelectItem>
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

          <div className="space-y-1.5 pt-2 border-t">
            <Label htmlFor="password">
              {isEdit ? t('ui.usr_new_password_optional') : t('ui.usr_password_req')}
            </Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              autoComplete="new-password"
              placeholder={isEdit ? '••••••••' : t('ui.usr_password_ph')}
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button type="submit" form="user-form" disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? t('common.update') : t('audit.actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
