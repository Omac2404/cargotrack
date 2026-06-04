import { useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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
  value, onChange, options, placeholder = 'Seçim yapın...',
  emptyMessage = 'Sonuç bulunamadı', searchPlaceholder = 'Ara...',
  allowClear = true, className, disabled = false, allowCustom = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

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
          <span className="truncate text-left">{displayLabel || placeholder}</span>
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
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustom && search ? (
                <button
                  onClick={() => {
                    onChange(search)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded"
                >
                  "<strong>{search}</strong>" değerini kullan
                </button>
              ) : (
                emptyMessage
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.description ?? ''}`}
                  onSelect={() => {
                    onChange(opt.value)
                    setOpen(false)
                    setSearch('')
                  }}
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
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
