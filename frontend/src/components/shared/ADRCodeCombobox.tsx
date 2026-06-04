import { useMemo } from 'react'
import { Combobox } from './Combobox'
import {
  COMMON_ADR_CODES, ADR_CLASS_LABELS, getRecentAdrCodes, findAdrCode,
} from '@/lib/constants/customs/adrCodes'

interface Props {
  value?: string
  onChange: (code: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * ADR / UN tehlikeli madde kodu seçici.
 * - Yaygın UN kodları listesi (sınıfa göre kategorize)
 * - localStorage'dan "son kullanılanlar"
 * - Kullanıcı kendi kodunu serbestçe girebilir (allowCustom)
 */
export function ADRCodeCombobox({
  value, onChange, placeholder = 'UN1202, UN3480 ...',
  disabled = false, className,
}: Props) {
  const options = useMemo(() => {
    const recents = getRecentAdrCodes()
    const recentSet = new Set(recents)

    // Sınıfa göre gruplandır
    const byClass = new Map<string, typeof COMMON_ADR_CODES>()
    for (const code of COMMON_ADR_CODES) {
      const key = code.class.split('.')[0] // Ana sınıf
      if (!byClass.has(key)) byClass.set(key, [])
      byClass.get(key)!.push(code)
    }

    const opts: Array<{ value: string; label: string; description: string }> = []

    // Önce son kullanılanlar
    for (const r of recents) {
      const info = findAdrCode(r)
      if (info) {
        opts.push({
          value: info.code,
          label: `${info.code} — ${info.name}`,
          description: `★ Son kullanılan · ${ADR_CLASS_LABELS[info.class] || `Sınıf ${info.class}`}`,
        })
      }
    }

    // Sonra hepsi
    for (const code of COMMON_ADR_CODES) {
      if (recentSet.has(code.code)) continue
      opts.push({
        value: code.code,
        label: `${code.code} — ${code.name}`,
        description: ADR_CLASS_LABELS[code.class] || `Sınıf ${code.class}`,
      })
    }
    return opts
  }, [])

  return (
    <Combobox
      value={value || ''}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="UN kodu veya madde ismi ara..."
      emptyMessage="Listede yok — kendi kodunuzu yazıp Enter'a basın"
      disabled={disabled}
      className={className}
      allowCustom
    />
  )
}
