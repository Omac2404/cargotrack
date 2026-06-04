import { useNavigate, Link } from 'react-router-dom'
import { LogOut, Search, Sun, Moon, User as UserIcon, Keyboard, Menu } from 'lucide-react'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/stores/auth'
import { useTheme } from '@/stores/theme'
import { useUI } from '@/stores/ui'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'

export function Topbar() {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const toggleMobileSidebar = useUI((s) => s.toggleMobileSidebar)

  const ROLE_LABELS: Record<string, string> = {
    super_admin: t('auth.roles.super_admin'),
    admin: t('auth.roles.admin'),
    user: t('auth.roles.user'),
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials =
    user?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'CT'

  return (
    <header className="h-14 sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="h-full flex items-center justify-between px-3 md:px-4 gap-2 md:gap-4">
        {/* Mobil hamburger butonu */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 shrink-0"
          onClick={toggleMobileSidebar}
          title={t('common.menu')}
          aria-label={t('common.menu')}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Sol: arama tetikleyici (gerçek arama Ctrl+K palette'inde) */}
        <div className="flex-1 max-w-md">
          <button
            type="button"
            onClick={() => {
              // Programatik Ctrl+K simülasyonu
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
            }}
            className="w-full relative group cursor-pointer"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <div className="pl-9 pr-12 h-9 flex items-center text-sm text-muted-foreground bg-muted/40 border border-transparent rounded-md group-hover:bg-muted group-hover:border-input transition-colors">
              {t('topbar.search_placeholder')}
            </div>
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Sağ */}
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />

          <Button variant="ghost" size="icon" onClick={toggle} title={theme === 'dark' ? t('common.theme_light') : t('common.theme_dark')}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            title={t('common.shortcuts') + ' (?)'}
            onClick={() => {
              // ShortcutsHelp dialog'unu açmak için ? tuşunu emule et
              document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
            }}
          >
            <Keyboard className="w-4 h-4" />
          </Button>

          <NotificationsBell />

          <div className="w-px h-6 bg-border mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-accent rounded-md py-1 px-2 transition-colors">
                <Avatar className="w-7 h-7">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start leading-tight">
                  <span className="text-xs font-medium">{user?.full_name}</span>
                  <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[user?.role || ''] || user?.role}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.full_name}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">@{user?.username}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserIcon className="w-4 h-4" />
                  {t('auth.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
