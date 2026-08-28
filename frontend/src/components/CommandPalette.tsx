import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Truck, Ship, Plane, Package, Building2, Warehouse, ArrowRightLeft, FileText,
  Users, BarChart3, User, LogOut, Plus, Settings, BookOpen,
} from 'lucide-react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  CommandSeparator, CommandShortcut,
} from '@/components/ui/command'
import { useAuth } from '@/stores/auth'

interface CmdItem {
  icon: React.ReactNode
  label: string
  description?: string
  shortcut?: string
  action: () => void
  visible?: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hasRole = useAuth((s) => s.hasRole)
  const logout = useAuth((s) => s.logout)

  const go = (path: string) => {
    navigate(path)
    onOpenChange(false)
  }

  const navigation: CmdItem[] = [
    { icon: <BarChart3 />, label: t('nav.dashboard'), shortcut: 'g i', action: () => go('/') },
    { icon: <Truck />, label: t('ui.cmd_road_shipments'), shortcut: 'g r', action: () => go('/shipments/road') },
    { icon: <Ship />, label: t('ui.cmd_maritime_shipments'), shortcut: 'g m', action: () => go('/shipments/maritime') },
    { icon: <Plane />, label: t('ui.cmd_air_shipments'), shortcut: 'g a', action: () => go('/shipments/air') },
    { icon: <Package />, label: t('nav.storage'), shortcut: 'g s', action: () => go('/shipments/storage') },
    { icon: <Building2 />, label: t('nav.partners'), shortcut: 'g p', action: () => go('/partners') },
    { icon: <Warehouse />, label: t('nav.warehouses'), shortcut: 'g w', action: () => go('/warehouses') },
    { icon: <Truck />, label: t('nav.vehicles'), shortcut: 'g v', action: () => go('/vehicles') },
    { icon: <ArrowRightLeft />, label: t('nav.assignments'), action: () => go('/assignments') },
    { icon: <FileText />, label: t('nav.documents'), action: () => go('/documents') },
    { icon: <BookOpen />, label: t('ui.cmd_guide'), action: () => go('/guide') },
  ]

  const create: CmdItem[] = [
    { icon: <Plus />, label: t('ui.cmd_new_road'), shortcut: 'n r', action: () => go('/shipments/road/new') },
    { icon: <Plus />, label: t('ui.cmd_new_maritime'), action: () => go('/shipments/maritime/new') },
    { icon: <Plus />, label: t('ui.cmd_new_air'), action: () => go('/shipments/air/new') },
    { icon: <Plus />, label: t('ui.cmd_new_storage'), action: () => go('/shipments/storage/new') },
  ]

  const admin: CmdItem[] = [
    { icon: <Users />, label: t('nav.users'), visible: hasRole('super_admin'), action: () => go('/users') },
    { icon: <Settings />, label: t('nav.settings'), action: () => go('/settings') },
  ].filter((i) => i.visible !== false)

  const account: CmdItem[] = [
    { icon: <User />, label: t('auth.profile'), action: () => go('/profile') },
    { icon: <LogOut />, label: t('auth.logout'), action: () => { logout(); navigate('/login') } },
  ]

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('ui.komut_yazin_veya_ara')} />
      <CommandList>
        <CommandEmpty>{t('ui.sonuc_bulunamadi')}</CommandEmpty>

        <CommandGroup heading={t('ui.cmd_group_navigation')}>
          {navigation.map((item) => (
            <CommandItem key={item.label} onSelect={item.action}>
              {item.icon}
              <span>{item.label}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('ui.cmd_group_create')}>
          {create.map((item) => (
            <CommandItem key={item.label} onSelect={item.action}>
              {item.icon}
              <span>{item.label}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('nav.management')}>
          {admin.map((item) => (
            <CommandItem key={item.label} onSelect={item.action}>
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('ui.cmd_group_account')}>
          {account.map((item) => (
            <CommandItem key={item.label} onSelect={item.action}>
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

/** Global Ctrl+K / Cmd+K hook'u */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
