import { Truck, Ship, Plane, Package, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import type { TransportType } from '@/types/api'

export interface ModeConfig {
  key: TransportType
  label: string
  icon: React.ReactNode
  description: string
  /** URL'de kullanılan slug (sea ↔ maritime normalize) */
  slug: string
  /** Sevkiyat numarası prefix'i (görüntüleme için) */
  prefix: string
  /** Gradient renkler (login splash gibi) */
  gradient: string
}

export const MODE_CONFIGS: Record<string, ModeConfig> = {
  road: {
    key: 'road',
    label: 'Karayolu',
    slug: 'road',
    icon: <Truck className="w-4 h-4" />,
    description: 'TIR / Kamyon sevkiyatları',
    prefix: 'ROU',
    gradient: 'from-blue-500 to-indigo-600',
  },
  maritime: {
    key: 'maritime',
    label: 'Denizyolu',
    slug: 'maritime',
    icon: <Ship className="w-4 h-4" />,
    description: 'Konteyner ve bulk gemi taşımacılığı',
    prefix: 'SEA',
    gradient: 'from-cyan-500 to-blue-600',
  },
  air: {
    key: 'air',
    label: 'Havayolu',
    slug: 'air',
    icon: <Plane className="w-4 h-4" />,
    description: 'Hava kargo (AWB)',
    prefix: 'AIR',
    gradient: 'from-sky-500 to-cyan-600',
  },
  storage: {
    key: 'storage',
    label: 'Depolama',
    slug: 'storage',
    icon: <Package className="w-4 h-4" />,
    description: 'Depo / antrepo işlemleri',
    prefix: 'STO',
    gradient: 'from-orange-500 to-amber-600',
  },
  import: {
    key: 'import',
    label: 'İthalat',
    slug: 'import',
    icon: <ArrowDownToLine className="w-4 h-4" />,
    description: 'Gümrük ithalat operasyonları',
    prefix: 'IMP',
    gradient: 'from-emerald-500 to-green-600',
  },
  export: {
    key: 'export',
    label: 'İhracat',
    slug: 'export',
    icon: <ArrowUpFromLine className="w-4 h-4" />,
    description: 'Gümrük ihracat operasyonları',
    prefix: 'EXP',
    gradient: 'from-violet-500 to-purple-600',
  },
}

export function getModeConfig(slug: string | undefined): ModeConfig {
  if (!slug) return MODE_CONFIGS.road
  // 'sea' alias için
  if (slug === 'sea') return MODE_CONFIGS.maritime
  return MODE_CONFIGS[slug] || MODE_CONFIGS.road
}

export const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  draft: { label: 'Taslak', variant: 'secondary' },
  in_progress: { label: 'Devam Ediyor', variant: 'default' },
  to_invoice: { label: 'Faturalanacak', variant: 'warning' },
  closed: { label: 'Kapalı', variant: 'success' },
}
