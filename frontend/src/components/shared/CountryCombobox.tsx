import { useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { COUNTRIES, findCountry, type Country } from '@/lib/constants/countries'

interface Props {
  value?: string
  onChange: (value: string, country?: Country) => void
  placeholder?: string
  allowClear?: boolean
  className?: string
  disabled?: boolean
}

export function CountryCombobox({
  value, onChange, placeholder = 'Ülke seçin...',
  allowClear = true, className, disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = findCountry(value)
  const displayLabel = selected ? `${selected.flag} ${selected.name}` : (value || '')

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
                  onChange('', undefined)
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
            placeholder="Ülke ara..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search ? (
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
                'Ülke bulunamadı'
              )}
            </CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code}`}
                  onSelect={() => {
                    onChange(c.name, c)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === c.name ? 'opacity-100' : 'opacity-0')} />
                  <span className="mr-2 text-lg">{c.flag}</span>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.code} · {c.phone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
