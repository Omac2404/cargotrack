import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Arama karsilastirmasi icin normalize: kucuk harf + aksan/nokta kaldirma.
 * "İNCİ" ile "inci", "Faïence" ile "faience" eslesir.
 */
function norm(v: string): string {
  return (v || '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
}

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface Props {
  value?: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  emptyMessage?: string
  searchPlaceholder?: string
  allowClear?: boolean
  className?: string
  disabled?: boolean
  /** Eşleşme yoksa direkt yazılan değeri kabul et (free-text input) */
  allowCustom?: boolean
}

export function Combobox({
  value, onChange, options, placeholder,
  emptyMessage, searchPlaceholder,
  allowClear = true, className, disabled = false, allowCustom = false,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Varsayılan metinler çeviriden gelir — sabit Türkçe metinler Fransızca
  // arayüze sızıyordu (ör. araç formundaki arama kutusunda "Ara...")
  const phText = placeholder ?? t('ui.cb_select')
  const searchText = searchPlaceholder ?? t('ui.cb_search')
  const emptyText = emptyMessage ?? t('ui.cb_empty')

  // Yazılan yeni değer: listede satır olarak görünür; böylece Enter ile de
  // seçilebilir. Önceden yalnızca hiçbir sonuç yokken bir buton çıkıyordu;
  // kullanıcı yazıp Enter'a basınca ya da dışarı tıklayınca yazdığı kayboluyor,
  // "kaydettim ama listede yok" durumu oluşuyordu.
  const typed = search.trim()
  const hasExact = options.some((o) => norm(o.label) === norm(typed) || norm(o.value) === norm(typed))
  const showTyped = allowCustom && !!typed && !hasExact

  // Filtrelemeyi kendimiz yapiyoruz: cmdk'nin bulanik eslestirmesi Turkce
  // karakterlerde sasiyor ve alakasiz satirlari da listede tutuyordu.
  const filtered = typed
    ? options.filter((o) => {
        const hay = norm(`${o.label} ${o.description ?? ''}`)
        return norm(typed).split(/\s+/).every((tok) => hay.includes(tok))
      })
    : options

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  const selected = options.find((o) => o.value === value)
  // value var ama options'ta yoksa (örneğin eski text input value'su) onu göster
  const displayLabel = selected?.label ?? value ?? ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between h-9 font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate text-left">{displayLabel || phText}</span>
          <div className="flex items-center gap-1">
            {allowClear && value && (
              <X
                className="h-3.5 w-3.5 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onChange('')
                }}
              />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={false}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchText}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !showTyped && <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.description ?? ''}`}
                  onSelect={() => pick(opt.value)}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{opt.label}</div>
                    {opt.description && (
                      <div className="text-[10px] text-muted-foreground truncate">{opt.description}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
              {/* Yazilan yeni deger en sonda: listede eslesme varsa Enter once
                  onu secer, boylece "NEW" yazip NEWAGE yerine "NEW" kaydedilmez */}
              {showTyped && (
                <CommandItem value={`__typed__${typed}`} onSelect={() => pick(typed)} className="text-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="truncate">{t('ui.use_typed_value', { value: typed })}</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
