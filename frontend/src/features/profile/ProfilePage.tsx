import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  User as UserIcon, Save, Loader2, Shield, KeyRound, Info, AlertTriangle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import { ROLE_LABELS } from '@/features/users/hooks'
import { formatDate } from '@/lib/utils'

type TFn = (k: string, opts?: Record<string, unknown>) => string

// Hata mesajları i18n'den gelir — şema bileşen içinde t() ile kurulur
const buildPasswordSchema = (t: TFn) => z.object({
  current_password: z.string().min(1, t('ui.prof_err_current_required')),
  new_password: z.string().min(12, t('ui.prof_err_new_min')),
  confirm_password: z.string().min(1, t('ui.prof_err_confirm_required')),
}).refine((d) => d.new_password === d.confirm_password, {
  message: t('ui.prof_err_mismatch'),
  path: ['confirm_password'],
})
type PasswordValues = z.infer<ReturnType<typeof buildPasswordSchema>>

/** Şifre kuvvet skoru — backend ile aynı mantık (basit subset) */
function calcStrength(password: string, username: string | undefined, t: TFn): { score: number; tips: string[] } {
  const tips: string[] = []
  if (!password) return { score: 0, tips: [t('ui.prof_tip_enter')] }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  else tips.push(t('ui.prof_tip_min12'))
  if (password.length >= 16) score++
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSym = /[^a-zA-Z0-9]/.test(password)
  const types = [hasLower, hasUpper, hasDigit, hasSym].filter(Boolean).length
  if (types >= 3) score++
  if (types === 4 && password.length >= 12) score++
  if (!hasLower) tips.push(t('ui.prof_tip_lower'))
  if (!hasUpper) tips.push(t('ui.prof_tip_upper'))
  if (!hasDigit) tips.push(t('ui.prof_tip_digit'))
  if (!hasSym) tips.push(t('ui.prof_tip_symbol'))
  if (/(.)\1{3,}/.test(password)) { tips.push(t('ui.prof_tip_repeat')); score = Math.max(0, score - 1) }
  const lower = password.toLowerCase()
  if (username && username.length >= 3 && lower.includes(username.toLowerCase())) {
    tips.push(t('ui.prof_tip_username'))
    score = Math.max(0, score - 2)
  }
  const blacklistSubstrings = ['password', 'admin', 'qwerty', '123456', 'cargotrack', 'welcome', 'letmein']
  for (const b of blacklistSubstrings) {
    if (lower.includes(b)) { tips.push(t('ui.prof_tip_common', { word: b })); score = 0; break }
  }
  return { score: Math.min(4, Math.max(0, score)), tips }
}

export function ProfilePage() {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)
  const role = user ? ROLE_LABELS[user.role] : null
  const passwordSchema = useMemo(() => buildPasswordSchema(t), [t])

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })
  const { register, handleSubmit, reset, watch, formState: { errors } } = form
  const newPwd = watch('new_password')
  const strength = calcStrength(newPwd || '', user?.username, t)

  const login = useAuth((s) => s.login)
  const passwordMut = useMutation({
    mutationFn: (d: { current_password: string; new_password: string }) =>
      api.post<{ message: string }>('/api/auth/change-password', d),
    onSuccess: async () => {
      toast.success(t('ui.sifre_guncellendi'))
      reset()
      // /me'i tekrar çağırıp must_change_password=false'u store'a yansıt
      try {
        const me = await api.get<{ user: typeof user }>('/api/auth/me')
        const token = localStorage.getItem('ct_token') || ''
        if (me.user && token) login(token, me.user as never)
      } catch { /* sessiz */ }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const initials = user?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'CT'

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center">
          <UserIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t('auth.profile')}</h1>
          <p className="text-xs text-muted-foreground">{t('ui.hesap_bilgileriniz_ve_sifre_yonetimi')}</p>
        </div>
      </div>

      {/* Şifre değişimi zorunlu — kırmızı banner */}
      {user?.must_change_password && (
        <div className="p-4 rounded-lg border-2 border-destructive bg-destructive/10 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-destructive">{t('ui.sifre_degisimi_zorunlu')}</div>
            <div className="text-muted-foreground mt-1">
              {t('ui.must_change_password_body')}
            </div>
          </div>
        </div>
      )}

      {/* Hesap bilgisi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            {t('ui.prof_account_info')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="text-lg font-semibold">{user?.full_name}</div>
              <div className="text-sm text-muted-foreground">@{user?.username}</div>
              {role && (
                <Badge variant={role.variant} className="mt-1">
                  <Shield className="w-3 h-3" />
                  {t(role.label)}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t">
            <InfoRow label={t('shipment.fields.email')} value={user?.email || '—'} />
            <InfoRow label={t('auth.role')} value={role ? t(role.label) : user?.role} />
            <InfoRow label={t('common.status')} value={user?.status === 'active' ? t('users.status_active') : t('users.status_inactive')} />
            <InfoRow label={t('users.last_login')} value={user?.last_login ? formatDate(user.last_login, true) : '—'} />
          </div>

          <div className="p-3 rounded-md bg-muted/30 border text-xs flex items-start gap-2 text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{t('ui.prof_contact_admin_hint')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Şifre değiştir */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            {t('auth.change_password')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => passwordMut.mutate({
            current_password: v.current_password,
            new_password: v.new_password,
          }))} className="space-y-4 max-w-sm">
            <div className="space-y-1.5">
              <Label htmlFor="current_password">{t('ui.mevcut_sifre')}</Label>
              <Input
                id="current_password"
                type="password"
                autoComplete="current-password"
                {...register('current_password')}
              />
              {errors.current_password && (
                <p className="text-xs text-destructive">{errors.current_password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_password">{t('ui.yeni_sifre')}</Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                placeholder={t('ui.prof_new_password_ph')}
                {...register('new_password')}
              />
              {errors.new_password && (
                <p className="text-xs text-destructive">{errors.new_password.message}</p>
              )}

              {/* Şifre kuvvet bar + ipuçları */}
              {newPwd && newPwd.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-4 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-full transition-colors ${
                            strength.score > i
                              ? strength.score === 1 ? 'bg-destructive'
                                : strength.score === 2 ? 'bg-warning'
                                : strength.score === 3 ? 'bg-primary'
                                : 'bg-success'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-semibold ${
                      strength.score === 0 ? 'text-muted-foreground'
                        : strength.score === 1 ? 'text-destructive'
                        : strength.score === 2 ? 'text-warning'
                        : strength.score === 3 ? 'text-primary'
                        : 'text-success'
                    }`}>
                      {['', t('ui.prof_strength_1'), t('ui.prof_strength_2'), t('ui.prof_strength_3'), t('ui.prof_strength_4')][strength.score]}
                    </span>
                  </div>
                  {strength.tips.length > 0 && (
                    <ul className="text-[10px] text-muted-foreground space-y-0.5">
                      {strength.tips.slice(0, 4).map((tip, i) => (
                        <li key={i}>• {tip}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">{t('ui.yeni_sifre_tekrar')}</Label>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                {...register('confirm_password')}
              />
              {errors.confirm_password && (
                <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={passwordMut.isPending}>
              {passwordMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('ui.prof_update_password_btn')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm mt-0.5">{value || '—'}</div>
    </div>
  )
}
