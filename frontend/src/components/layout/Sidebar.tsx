import { NavLink, useLocation } from 'react-router-dom'
import {
  Truck, Ship, Plane, Warehouse, Package, Users, BarChart3,
  Settings, Building2, FileText, ArrowRightLeft, ChevronDown, Truck as TruckIcon,
  History, Boxes, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'
import { useUI } from '@/stores/ui'
import { useSidebarAlerts } from '@/features/lookup/hooks'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  badge?: string | number
}

interface NavGroup {
  label: string
  items: NavItem[]
  defaultOpen?: boolean
}

// i18n key'leri ile NAV (label artık t() ile çevrilir)
function buildNav(t: (k: string) => string): NavGroup[] {
  return [
    {
      label: t('nav.dashboard'),
      defaultOpen: true,
      items: [
        { label: t('nav.dashboard'), to: '/', icon: <BarChart3 className="w-4 h-4" /> },
      ],
    },
    {
      label: t('nav.transport'),
      defaultOpen: true,
      items: [
        { label: t('nav.road'), to: '/shipments/road', icon: <Truck className="w-4 h-4" /> },
        { label: t('nav.maritime'), to: '/shipments/maritime', icon: <Ship className="w-4 h-4" /> },
        { label: t('nav.air'), to: '/shipments/air', icon: <Plane className="w-4 h-4" /> },
        { label: t('nav.storage'), to: '/shipments/storage', icon: <Package className="w-4 h-4" /> },
      ],
    },
    {
      label: t('nav.operation'),
      defaultOpen: true,
      items: [
        { label: t('nav.partners'), to: '/partners', icon: <Building2 className="w-4 h-4" /> },
        { label: t('nav.warehouses'), to: '/warehouses', icon: <Warehouse className="w-4 h-4" /> },
        { label: t('nav.storage_orders'), to: '/storage-orders', icon: <Boxes className="w-4 h-4" /> },
        { label: t('nav.vehicles'), to: '/vehicles', icon: <TruckIcon className="w-4 h-4" /> },
        { label: t('nav.assignments'), to: '/assignments', icon: <ArrowRightLeft className="w-4 h-4" /> },
        { label: t('nav.documents'), to: '/documents', icon: <FileText className="w-4 h-4" /> },
      ],
    },
    {
      label: t('nav.management'),
      defaultOpen: true,
      items: [
        { label: t('nav.reports'), to: '/reports', icon: <BarChart3 className="w-4 h-4" /> },
        { label: t('nav.users'), to: '/users', icon: <Users className="w-4 h-4" /> },
        { label: t('nav.audit'), to: '/audit', icon: <History className="w-4 h-4" /> },
        { label: t('nav.settings'), to: '/settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ]
}

export function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const can = useAuth((s) => s.can)
  const { data: alerts } = useSidebarAlerts()
  const mobileOpen = useUI((s) => s.mobileSidebarOpen)
  const setMobileOpen = useUI((s) => s.setMobileSidebarOpen)
  const NAV = buildNav(t)

  // Sayfa değişince mobile drawer'ı otomatik kapat
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, setMobileOpen])

  // Esc ile drawer'ı kapat
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mobileOpen, setMobileOpen])

  // Badge eklemek için item'lara alert sayılarını dağıt
  const navWithAlerts = NAV.map((g) => ({
    ...g,
    items: g.items.map((it) => {
      if (it.to === '/documents' && alerts?.docs_missing_shipments) {
        return { ...it, badge: alerts.docs_missing_shipments }
      }
      if (it.to === '/storage-orders' && alerts?.transit_warnings) {
        return { ...it, badge: alerts.transit_warnings }
      }
      return it
    }),
  }))

  // Permission'a göre filtreleme (rol değil): UI gating
  const PERM_BY_ROUTE: Record<string, string> = {
    '/users': 'users.read',
    '/audit': 'audit.view',
    '/storage-orders': 'warehouses.read',
    '/reports': 'reports.view',
  }
  const filteredNav = navWithAlerts.map(g => ({
    ...g,
    items: g.items.filter(it => {
      const required = PERM_BY_ROUTE[it.to]
      if (required) return can(required)
      return true
    }),
  })).filter(g => g.items.length > 0)

  return (
    <>
      {/* Mobil overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Sidebar kapat"
        />
      )}

      <aside
        className={cn(
          'border-r bg-card flex flex-col h-screen z-50',
          // Desktop: sticky, w-56
          'md:sticky md:top-0 md:w-56 md:shrink-0 md:translate-x-0',
          // Mobile: fixed overlay drawer, w-64, transition
          'fixed inset-y-0 left-0 w-64 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Logo + mobile close button */}
        <div className="h-14 flex items-center gap-2 px-4 border-b">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div className="font-bold text-base tracking-tight">
            Cargo<span className="font-light">Track</span>
          </div>
          {/* Mobile only close */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden p-1 hover:bg-accent rounded"
            aria-label="Sidebar kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {filteredNav.map((group) => (
            <NavGroupBlock key={group.label} group={group} currentPath={location.pathname} />
          ))}
        </nav>

        {/* Versiyon */}
        <div className="px-4 py-2.5 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>v3.0.0</span>
          <span className="px-1.5 py-0.5 rounded bg-success/10 text-success font-medium text-[10px]">Beta</span>
        </div>
      </aside>
    </>
  )
}

function NavGroupBlock({ group, currentPath }: { group: NavGroup; currentPath: string }) {
  const [open, setOpen] = useState(group.defaultOpen ?? true)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span>{group.label}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                )
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge != null && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
