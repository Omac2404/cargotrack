import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Truck, Ship, Plane, Package, Building2, Warehouse, ArrowRightLeft, FileText,
  Users, BarChart3, User, LogOut, Plus, Settings,
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
  const navigate = useNavigate()
  const hasRole = useAuth((s) => s.hasRole)
  const logout = useAuth((s) => s.logout)

  const go = (path: string) => {
    navigate(path)
    onOpenChange(false)
  }

  const navigation: CmdItem[] = [
    { icon: <BarChart3 />, label: 'İstatistikler', shortcut: 'g i', action: () => go('/') },
    { icon: <Truck />, label: 'Karayolu Sevkiyatları', shortcut: 'g r', action: () => go('/shipments/road') },
    { icon: <Ship />, label: 'Denizyolu Sevkiyatları', shortcut: 'g m', action: () => go('/shipments/maritime') },
    { icon: <Plane />, label: 'Havayolu Sevkiyatları', shortcut: 'g a', action: () => go('/shipments/air') },
    { icon: <Package />, label: 'Depolama', shortcut: 'g s', action: () => go('/shipments/storage') },
    { icon: <Building2 />, label: 'Partnerlar', shortcut: 'g p', action: () => go('/partners') },
    { icon: <Warehouse />, label: 'Depolar', shortcut: 'g w', action: () => go('/warehouses') },
    { icon: <Truck />, label: 'Araçlar', shortcut: 'g v', action: () => go('/vehicles') },
    { icon: <ArrowRightLeft />, label: 'Atamalar', action: () => go('/assignments') },
    { icon: <FileText />, label: 'Belgeler', action: () => go('/documents') },
  ]

  const create: CmdItem[] = [
    { icon: <Plus />, label: 'Yeni Karayolu Sevkiyatı', shortcut: 'n r', action: () => go('/shipments/road/new') },
    { icon: <Plus />, label: 'Yeni Denizyolu Sevkiyatı', action: () => go('/shipments/maritime/new') },
    { icon: <Plus />, label: 'Yeni Havayolu Sevkiyatı', action: () => go('/shipments/air/new') },
    { icon: <Plus />, label: 'Yeni Depolama', action: () => go('/shipments/storage/new') },
  ]

  const admin: CmdItem[] = [
    { icon: <Users />, label: 'Kullanıcılar', visible: hasRole('super_admin'), action: () => go('/users') },
    { icon: <Settings />, label: 'Ayarlar', action: () => go('/settings') },
  ].filter((i) => i.visible !== false)

  const account: CmdItem[] = [
    { icon: <User />, label: 'Profil', action: () => go('/profile') },
    { icon: <LogOut />, label: 'Çıkış Yap', action: () => { logout(); navigate('/login') } },
  ]

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Komut yazın veya ara..." />
      <CommandList>
        <CommandEmpty>Sonuç bulunamadı</CommandEmpty>

        <CommandGroup heading="Gezinme">
          {navigation.map((item) => (
            <CommandItem key={item.label} onSelect={item.action}>
              {item.icon}
              <span>{item.label}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Hızlı Oluştur">
          {create.map((item) => (
            <CommandItem key={item.label} onSelect={item.action}>
              {item.icon}
              <span>{item.label}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Yönetim">
          {admin.map((item) => (
            <CommandItem key={item.label} onSelect={item.action}>
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Hesap">
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
