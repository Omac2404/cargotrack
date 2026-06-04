import { useState, useRef, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CITY_COUNTRY, getCountryFromCity } from '@/lib/constants/cityCountry'
import { cn } from '@/lib/utils'

interface Props {
  value?: string
  onChange: (value: string) => void
  /** Şehir tanınırsa ülke bilgisi de iletilir */
  onCountryDetected?: (country: string) => void
  placeholder?: string
  className?: string
  id?: string
}

const KNOWN_CITIES = Object.keys(CITY_COUNTRY).sort()

export function CityInput({
  value, onChange, onCountryDetected,
  placeholder = 'İstanbul', className, id,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside kapatma
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (newVal: string) => {
    onChange(newVal)
    const q = newVal.trim().toLowerCase()
    if (q.length >= 2) {
      const matched = KNOWN_CITIES
        .filter((city) => city.startsWith(q))
        .slice(0, 8)
      setSuggestions(matched)
      setShowSuggestions(matched.length > 0)
      setHighlightedIdx(-1)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }

    // Bilinen şehirse ülkeyi tanı
    const country = getCountryFromCity(newVal)
    if (country && onCountryDetected) onCountryDetected(country)
  }

  const acceptSuggestion = (suggestion: string) => {
    // İlk harfi büyük yap
    const formatted = suggestion.charAt(0).toUpperCase() + suggestion.slice(1)
    onChange(formatted)
    setShowSuggestions(false)
    const country = getCountryFromCity(suggestion)
    if (country && onCountryDetected) onCountryDetected(country)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault()
      acceptSuggestion(suggestions[highlightedIdx])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => value && value.length >= 2 && setShowSuggestions(suggestions.length > 0)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-8"
          autoComplete="off"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((city, i) => {
            const country = CITY_COUNTRY[city]
            return (
              <button
                key={city}
                type="button"
                onClick={() => acceptSuggestion(city)}
                onMouseEnter={() => setHighlightedIdx(i)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-accent transition-colors',
                  i === highlightedIdx && 'bg-accent'
                )}
              >
                <span className="capitalize">{city}</span>
                <span className="text-xs text-muted-foreground">{country}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
