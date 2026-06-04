import { Globe, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { LANGUAGES, type LanguageCode } from '@/i18n'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = (i18n.resolvedLanguage || i18n.language || 'tr') as LanguageCode
  const currentLang = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t('common.language')}>
          <span className="text-base leading-none" aria-hidden>{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className="cursor-pointer flex items-center gap-2"
          >
            <span className="text-base">{lang.flag}</span>
            <span className="flex-1">{lang.label}</span>
            {current === lang.code && <Check className="w-3.5 h-3.5 text-success" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
