import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CURRENCIES, COMMON_CURRENCY_CODES, findCurrency } from '@/lib/constants/currencies'

interface Props {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  className?: string
  disabled?: boolean
}

export function CurrencyCombobox({
  value, onChange, placeholder = 'Para birimi seçin...',
  allowClear = false, className, disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)

  const selected = findCurrency(value)
  const displayLabel = selected ? `${selected.symbol} ${selected.code} — ${selected.name}` : (value || '')

  const grouped = useMemo(() => {
    const common = COMMON_CURRENCY_CODES
      .map((code) => CURRENCIES.find((c) => c.code === code))
      .filter(Boolean) as typeof CURRENCIES
    const rest = CURRENCIES
      .filter((c) => !COMMON_CURRENCY_CODES.includes(c.code))
      .sort((a, b) => a.code.localeCompare(b.code))
    return { common, rest }
  }, [])

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
        className="w-[var(--radix-popover-trigger-width)] min-w-[340px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={false}
      >
        <Command shouldFilter={true}>
          <CommandInput placeholder="Para birimi ara (kod, isim, ülke)..." />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>Para birimi bulunamadı</CommandEmpty>

            <CommandGroup heading="Sık Kullanılan">
              {grouped.common.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.code} ${c.name} ${c.country}`}
                  onSelect={() => {
                    onChange(c.code)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === c.code ? 'opacity-100' : 'opacity-0')} />
                  <span className="w-12 font-mono text-sm font-semibold">{c.code}</span>
                  <span className="w-8 text-center text-sm">{c.symbol}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground truncate ml-2">{c.country}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading={`Tüm Para Birimleri (${grouped.rest.length})`}>
              {grouped.rest.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.code} ${c.name} ${c.country}`}
                  onSelect={() => {
                    onChange(c.code)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === c.code ? 'opacity-100' : 'opacity-0')} />
                  <span className="w-12 font-mono text-sm font-semibold">{c.code}</span>
                  <span className="w-8 text-center text-sm">{c.symbol}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground truncate ml-2">{c.country}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
