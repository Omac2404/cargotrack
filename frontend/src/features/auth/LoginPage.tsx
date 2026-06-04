import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, User as UserIcon, AlertCircle, Truck, Plane, Ship, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/auth'
import type { LoginResponse } from '@/types/api'

const schema = z.object({
  username: z.string().min(1, 'Kullanıcı adı zorunludur'),
  password: z.string().min(1, 'Şifre zorunludur'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginStore = useAuth((s) => s.login)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } })

  const loginMutation = useMutation({
    mutationFn: (values: FormValues) => api.post<LoginResponse>('/api/auth/login', values),
    onSuccess: (data) => {
      loginStore(data.token, data.user)
      const redirect = (location.state as { from?: string } | null)?.from || '/'
      navigate(redirect, { replace: true })
    },
    onError: (err: Error) => setServerError(err.message),
  })

  const onSubmit = (values: FormValues) => {
    setServerError(null)
    loginMutation.mutate(values)
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* SOL: brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-indigo-900">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, white 0%, transparent 50%), radial-gradient(circle at 80% 70%, white 0%, transparent 40%)`,
        }} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div className="text-xl font-bold tracking-tight">
              Cargo<span className="font-light">Track</span>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs">
              <Lock className="w-3 h-3" />
              Güvenli & Şifreli Bağlantı
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Lojistik operasyonlarınız<br />
              <span className="font-light opacity-80">tek panel altında</span>
            </h1>
            <p className="text-white/70 leading-relaxed">
              Sevkiyatlar, müşteriler, depolar ve araçlar — tüm operasyonu gerçek zamanlı yönetin.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-4">
              <FeatureCard icon={<Truck className="w-4 h-4" />} label="Karayolu" />
              <FeatureCard icon={<Ship className="w-4 h-4" />} label="Denizyolu" />
              <FeatureCard icon={<Plane className="w-4 h-4" />} label="Havayolu" />
            </div>
          </div>

          <div className="text-xs text-white/40">
            © 2026 Webreta — Tüm hakları saklıdır
          </div>
        </div>
      </div>

      {/* SAĞ: form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-muted/30">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold">CargoTrack</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Hoş geldiniz</h2>
            <p className="text-sm text-muted-foreground">Hesabınıza giriş yaparak devam edin.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  className="pl-9"
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-10" disabled={loginMutation.isPending}>
              {loginMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {loginMutation.isPending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <span className="font-medium text-foreground">WEBRETA</span> tarafından geliştirilmektedir
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-white/5 backdrop-blur border border-white/10 flex flex-col items-start gap-1.5">
      <div className="text-white/80">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  )
}
