import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import tr from './locales/tr.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import de from './locales/de.json'

export const LANGUAGES = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
      fr: { translation: fr },
      de: { translation: de },
    },
    fallbackLng: 'tr',
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false }, // React XSS koruması zaten var
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ct_lang',
      caches: ['localStorage'],
    },
  })

export default i18n
