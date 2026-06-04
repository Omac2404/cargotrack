import { useEffect } from 'react'

export interface ShortcutHandler {
  /** Klavye tuş kombinasyonu, örn. 'mod+s', 'mod+n', 'esc', '?', 'g h', 'j', 'k' */
  combo: string
  /** Tetiklenince çağrılır. event.preventDefault() otomatik yapılır */
  handler: (event: KeyboardEvent) => void
  /** Input/textarea/contentEditable üzerinde çalışsın mı (default: false) */
  allowInInput?: boolean
}

/**
 * Global klavye kısayolları kaydeder.
 * `mod` = Mac'te Cmd, Windows/Linux'ta Ctrl.
 *
 * Desteklenen kombinasyon formatları:
 *   - 'mod+s'        — Ctrl/Cmd + S
 *   - 'mod+shift+k'  — Ctrl/Cmd + Shift + K
 *   - 'esc'          — Escape
 *   - '?'            — soru işareti (Shift+/)
 *   - 'j' / 'k'      — tek tuş (sadece input dışında)
 */
export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]): void {
  useEffect(() => {
    const isInputElement = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false
      if (el.isContentEditable) return true
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    }

    const matches = (event: KeyboardEvent, combo: string): boolean => {
      const parts = combo.toLowerCase().split('+').map((p) => p.trim())
      const wantMod = parts.includes('mod')
      const wantShift = parts.includes('shift')
      const wantAlt = parts.includes('alt')
      const keyPart = parts.filter((p) => !['mod', 'shift', 'alt'].includes(p))[0] || ''

      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const modPressed = isMac ? event.metaKey : event.ctrlKey
      if (wantMod !== modPressed) return false
      if (wantShift !== event.shiftKey) return false
      if (wantAlt !== event.altKey) return false

      // Tek tuş: key veya code karşılaştır
      const k = event.key.toLowerCase()
      if (keyPart === 'esc') return k === 'escape'
      if (keyPart === '?') return k === '?'
      if (keyPart === '/') return k === '/'
      return k === keyPart
    }

    const handler = (event: KeyboardEvent) => {
      for (const sc of shortcuts) {
        if (!matches(event, sc.combo)) continue
        if (!sc.allowInInput && isInputElement(event.target)) continue
        event.preventDefault()
        sc.handler(event)
        break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [shortcuts])
}
