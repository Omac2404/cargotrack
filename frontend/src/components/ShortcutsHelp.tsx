import { useState } from 'react'
import { Keyboard } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useTranslation } from 'react-i18next'

interface ShortcutEntry {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  title: string
  items: ShortcutEntry[]
}

// i18n key kullanan dinamik builder (component içinde t() ile çağrılır)
function buildShortcuts(t: (k: string) => string): ShortcutGroup[] {
  return [
    {
      title: t('shortcuts.general'),
      items: [
        { keys: ['Ctrl', 'K'], description: 'Komut paleti' },
        { keys: ['?'], description: t('shortcuts.title') },
        { keys: ['Esc'], description: t('common.close') },
      ],
    },
    {
      title: t('shortcuts.navigation'),
      items: [
        { keys: ['G', t('shortcuts.then'), 'H'], description: t('nav.dashboard') },
        { keys: ['G', t('shortcuts.then'), 'S'], description: t('nav.shipments') + ' (' + t('nav.road') + ')' },
        { keys: ['G', t('shortcuts.then'), 'P'], description: t('nav.partners') },
        { keys: ['G', t('shortcuts.then'), 'A'], description: t('nav.assignments') },
        { keys: ['G', t('shortcuts.then'), 'V'], description: t('nav.vehicles') },
        { keys: ['G', t('shortcuts.then'), 'D'], description: t('nav.documents') },
      ],
    },
    {
      title: t('shortcuts.forms'),
      items: [
        { keys: ['Ctrl', 'S'], description: t('common.save') },
        { keys: ['Ctrl', 'N'], description: t('common.new') },
      ],
    },
    {
      title: t('shortcuts.list_table'),
      items: [
        { keys: ['J'], description: '↓' },
        { keys: ['K'], description: '↑' },
        { keys: ['Enter'], description: t('common.open') },
        { keys: ['/'], description: t('common.search') },
      ],
    },
  ]
}

// Eski SHORTCUTS (geriye dönük; artık kullanılmıyor, build için import dependency kalması)
const SHORTCUTS_LEGACY: ShortcutGroup[] = [
  {
    title: 'Genel',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Komut paleti (sayfaya git, ara)' },
      { keys: ['?'], description: 'Bu yardımı aç/kapat' },
      { keys: ['Esc'], description: 'Açık modal / dialog / arama kapat' },
    ],
  },
  {
    title: 'Navigasyon',
    items: [
      { keys: ['G', 'sonra', 'H'], description: 'Ana sayfa (Dashboard)' },
      { keys: ['G', 'sonra', 'S'], description: 'Sevkiyatlar (karayolu)' },
      { keys: ['G', 'sonra', 'P'], description: 'Partnerler' },
      { keys: ['G', 'sonra', 'A'], description: 'Atamalar' },
      { keys: ['G', 'sonra', 'V'], description: 'Araçlar' },
      { keys: ['G', 'sonra', 'D'], description: 'Belgeler' },
    ],
  },
  {
    title: 'Formlar',
    items: [
      { keys: ['Ctrl', 'S'], description: 'Kaydet (sevkiyat / araç / partner formunda)' },
      { keys: ['Ctrl', 'N'], description: 'Yeni kayıt (bulunduğun sayfada)' },
    ],
  },
  {
    title: 'Liste / Tablo',
    items: [
      { keys: ['J'], description: 'Sonraki satır' },
      { keys: ['K'], description: 'Önceki satır' },
      { keys: ['Enter'], description: 'Seçili satırı aç' },
      { keys: ['/'], description: 'Arama kutusuna odaklan' },
    ],
  },
]

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
}

export function ShortcutsHelpDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const SHORTCUTS = buildShortcuts(t)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            {t('shortcuts.title')}
          </DialogTitle>
          <DialogDescription>
            {t('shortcuts.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {SHORTCUTS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group.title}
              </h3>
              <div className="rounded-md border divide-y">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-foreground">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, j) =>
                        k === 'sonra' || k === t('shortcuts.then') ? (
                          <span key={j} className="text-xs text-muted-foreground italic mx-1">{t('shortcuts.then')}</span>
                        ) : (
                          <kbd key={j} className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold rounded border border-border bg-muted text-foreground shadow-sm">
                            {k}
                          </kbd>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground pt-2 border-t">
            💡 {t('shortcuts.tip')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Uygulama-genelinde klavye kısayollarını dinler.
 * App'in en üstünde bir kez render edilir.
 */
export function GlobalShortcutsProvider() {
  const [helpOpen, setHelpOpen] = useState(false)
  const [gPressed, setGPressed] = useState(false)

  // "g sonra X" navigasyon kombosu için state
  useKeyboardShortcuts([
    // Yardım
    { combo: '?', handler: () => setHelpOpen((v) => !v) },

    // Ctrl+N - aktif sayfanın "yeni" butonuna odaklan/tıkla
    {
      combo: 'mod+n',
      handler: () => {
        const path = window.location.pathname
        if (path.startsWith('/shipments/') && !path.includes('/new') && !path.includes('/edit')) {
          // /shipments/karayolu → /shipments/karayolu/new
          window.location.href = `${path}/new`
        } else if (path === '/vehicles') {
          window.location.href = '/vehicles/new'
        } else {
          // Genel: "Yeni" butonunu ara ve tıkla
          const btn = Array.from(document.querySelectorAll('button')).find((b) =>
            /yeni/i.test(b.textContent || '')
          )
          btn?.click()
        }
      },
    },

    // Esc — modal/dialog kapatır (Radix zaten bunu yapıyor, biz arama kutusunu da temizleyelim)
    {
      combo: 'esc',
      allowInInput: true,
      handler: (e) => {
        const target = e.target as HTMLElement
        if (target instanceof HTMLInputElement && target.type !== 'submit') {
          target.blur()
        }
      },
    },

    // / — arama kutusuna odaklan
    {
      combo: '/',
      handler: () => {
        const search = document.querySelector<HTMLInputElement>('input[placeholder*="ara" i], input[type="search"]')
        search?.focus()
      },
    },

    // J/K — tablo navigasyonu (mevcut row'u highlight et)
    {
      combo: 'j',
      handler: () => navigateTable(1),
    },
    {
      combo: 'k',
      handler: () => navigateTable(-1),
    },

    // Enter — vurgulu satıra tıkla
    {
      combo: 'enter',
      handler: () => {
        const highlighted = document.querySelector<HTMLElement>('[data-row-focused="true"]')
        highlighted?.click()
      },
    },

    // G + X navigasyon — g'ye basıldığında flag aç, 1 saniye içinde X gelirse git
    {
      combo: 'g',
      handler: () => {
        setGPressed(true)
        window.setTimeout(() => setGPressed(false), 1500)
      },
    },
    { combo: 'h', handler: () => { if (gPressed) { window.location.href = '/'; setGPressed(false) } } },
    { combo: 's', handler: () => { if (gPressed) { window.location.href = '/shipments/karayolu'; setGPressed(false) } } },
    { combo: 'p', handler: () => { if (gPressed) { window.location.href = '/partners'; setGPressed(false) } } },
    { combo: 'a', handler: () => { if (gPressed) { window.location.href = '/assignments'; setGPressed(false) } } },
    { combo: 'v', handler: () => { if (gPressed) { window.location.href = '/vehicles'; setGPressed(false) } } },
    { combo: 'd', handler: () => { if (gPressed) { window.location.href = '/documents'; setGPressed(false) } } },
  ])

  return <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
}

/** Tablo satırları arasında J/K navigasyonu — kabaca aktif satırı işaretler */
function navigateTable(dir: 1 | -1): void {
  const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>('tbody tr'))
  if (rows.length === 0) return
  const currentIdx = rows.findIndex((r) => r.getAttribute('data-row-focused') === 'true')
  let nextIdx = currentIdx + dir
  if (nextIdx < 0) nextIdx = 0
  if (nextIdx >= rows.length) nextIdx = rows.length - 1

  rows.forEach((r) => r.removeAttribute('data-row-focused'))
  const next = rows[nextIdx]
  if (next) {
    next.setAttribute('data-row-focused', 'true')
    next.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}
