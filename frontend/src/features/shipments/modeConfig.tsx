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

// label ve description i18n key'leri olarak saklanır — UI'de t() ile çevrilir
export const MODE_CONFIGS: Record<string, ModeConfig> = {
  road: {
    key: 'road',
    label: 'transport.modes.road',
    slug: 'road',
    icon: <Truck className="w-4 h-4" />,
    description: 'transport.descriptions.road',
    prefix: 'ROU',
    gradient: 'from-blue-500 to-indigo-600',
  },
  maritime: {
    key: 'maritime',
    label: 'transport.modes.maritime',
    slug: 'maritime',
    icon: <Ship className="w-4 h-4" />,
    description: 'transport.descriptions.maritime',
    prefix: 'SEA',
    gradient: 'from-cyan-500 to-blue-600',
  },
  air: {
    key: 'air',
    label: 'transport.modes.air',
    slug: 'air',
    icon: <Plane className="w-4 h-4" />,
    description: 'transport.descriptions.air',
    prefix: 'AIR',
    gradient: 'from-sky-500 to-cyan-600',
  },
  storage: {
    key: 'storage',
    label: 'transport.modes.storage',
    slug: 'storage',
    icon: <Package className="w-4 h-4" />,
    description: 'transport.descriptions.storage',
    prefix: 'STO',
    gradient: 'from-orange-500 to-amber-600',
  },
  import: {
    key: 'import',
    label: 'transport.modes.import',
    slug: 'import',
    icon: <ArrowDownToLine className="w-4 h-4" />,
    description: 'transport.descriptions.import',
    prefix: 'IMP',
    gradient: 'from-emerald-500 to-green-600',
  },
  export: {
    key: 'export',
    label: 'transport.modes.export',
    slug: 'export',
    icon: <ArrowUpFromLine className="w-4 h-4" />,
    description: 'transport.descriptions.export',
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

// label i18n key — UI'de t(STATUS_LABELS[s].label) ile çevrilir
export const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  draft:       { label: 'shipment.status.draft',       variant: 'secondary' },
  in_progress: { label: 'shipment.status.in_progress', variant: 'default'   },
  to_invoice:  { label: 'shipment.status.to_invoice',  variant: 'warning'   },
  closed:      { label: 'shipment.status.closed',      variant: 'success'   },
}
