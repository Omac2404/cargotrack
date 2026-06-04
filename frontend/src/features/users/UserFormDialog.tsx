import { useEffect } from 'react'
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

const schema = z.object({
  username: z.string().min(1, 'Kullanıcı adı zorunludur').optional(),
  full_name: z.string().min(1, 'Ad Soyad zorunludur'),
  email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  role: z.enum(['super_admin', 'admin', 'user']),
  status: z.enum(['active', 'inactive']),
  password: z.string().optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  user?: User | null
}

export function UserFormDialog({ open, onOpenChange, user }: Props) {
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
        toast.success(isEdit ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu')
        onOpenChange(false)
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `${user.full_name} düzenle` : 'Yeni Kullanıcı'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `@${user?.username}` : 'Sisteme erişimi olan yeni kullanıcı oluştur.'}
          </DialogDescription>
        </DialogHeader>

        <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="username">Kullanıcı Adı *</Label>
              <Input id="username" {...register('username')} autoComplete="off" />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="full_name">Ad Soyad *</Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="admin">Yönetici</SelectItem>
                  <SelectItem value="super_admin">Süper Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Durum</Label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FormValues['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t">
            <Label htmlFor="password">
              {isEdit ? 'Yeni Şifre (boş bırakırsan değişmez)' : 'Şifre *'}
            </Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              autoComplete="new-password"
              placeholder={isEdit ? '••••••••' : 'Min 6 karakter'}
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button type="submit" form="user-form" disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
