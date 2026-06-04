import { useMemo } from 'react'
import { Combobox } from './Combobox'
import {
  PACKAGE_TYPES,
  PACKAGE_CATEGORY_LABELS,
  type PackageTypeInfo,
  findPackageType,
} from '@/lib/constants/customs/packageTypes'

interface Props {
  value?: string
  onChange: (value: string, info?: PackageTypeInfo) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** Kategori filtresi (örn. sadece bag ve box göster) */
  filterCategories?: PackageTypeInfo['category'][]
  /** Kullanıcı kendi metin girebilsin (UN R21 dışı) */
  allowCustom?: boolean
}

/**
 * Ambalaj tipi seçici — UN Recommendation 21 standart kodları (377 tip).
 * Kategorize edilmiş, Türkçe + Fransızca açıklamalı.
 */
export function PackageTypeCombobox({
  value, onChange, placeholder = 'Ambalaj tipi seçin...',
  className, disabled = false, filterCategories, allowCustom = true,
}: Props) {
  const options = useMemo(() => {
    const filtered = filterCategories
      ? PACKAGE_TYPES.filter((p) => filterCategories.includes(p.category))
      : PACKAGE_TYPES
    return filtered.map((p) => ({
      value: p.code,
      label: `${p.code} — ${p.tr}`,
      description: `${PACKAGE_CATEGORY_LABELS[p.category]} · ${p.fr}`,
    }))
  }, [filterCategories])

  // value bir kod ise (örn "4G") - Combobox value olarak kod kullanır
  // ama kullanıcı eski tarz serbest metin de girmiş olabilir (örn "Karton Kutu")
  // Combobox allowCustom ile bunu da kabul eder
  const handleChange = (v: string) => {
    const info = findPackageType(v)
    onChange(v, info)
  }

  return (
    <Combobox
      value={value || ''}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Kod veya isim ara (örn: 4G, karton, varil, çuval)..."
      emptyMessage="Ambalaj tipi bulunamadı"
      className={className}
      disabled={disabled}
      allowCustom={allowCustom}
    />
  )
}
