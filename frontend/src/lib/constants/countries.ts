/**
 * Ülke listesi — bayrak + telefon kodu (PHP cargotrack.php:11805'ten port).
 * 56 ülke + yardımcı fonksiyonlar.
 */

export interface Country {
  name: string
  code: string
  flag: string
  phone: string
}

export const COUNTRIES: Country[] = [
  { name: 'Türkiye', code: 'TR', flag: '🇹🇷', phone: '+90' },
  { name: 'Almanya', code: 'DE', flag: '🇩🇪', phone: '+49' },
  { name: 'Fransa', code: 'FR', flag: '🇫🇷', phone: '+33' },
  { name: 'İtalya', code: 'IT', flag: '🇮🇹', phone: '+39' },
  { name: 'İspanya', code: 'ES', flag: '🇪🇸', phone: '+34' },
  { name: 'Hollanda', code: 'NL', flag: '🇳🇱', phone: '+31' },
  { name: 'Belçika', code: 'BE', flag: '🇧🇪', phone: '+32' },
  { name: 'Polonya', code: 'PL', flag: '🇵🇱', phone: '+48' },
  { name: 'Romanya', code: 'RO', flag: '🇷🇴', phone: '+40' },
  { name: 'Bulgaristan', code: 'BG', flag: '🇧🇬', phone: '+359' },
  { name: 'Yunanistan', code: 'GR', flag: '🇬🇷', phone: '+30' },
  { name: 'Avusturya', code: 'AT', flag: '🇦🇹', phone: '+43' },
  { name: 'Çekya', code: 'CZ', flag: '🇨🇿', phone: '+420' },
  { name: 'Macaristan', code: 'HU', flag: '🇭🇺', phone: '+36' },
  { name: 'Slovakya', code: 'SK', flag: '🇸🇰', phone: '+421' },
  { name: 'Hırvatistan', code: 'HR', flag: '🇭🇷', phone: '+385' },
  { name: 'Sırbistan', code: 'RS', flag: '🇷🇸', phone: '+381' },
  { name: 'İsviçre', code: 'CH', flag: '🇨🇭', phone: '+41' },
  { name: 'Norveç', code: 'NO', flag: '🇳🇴', phone: '+47' },
  { name: 'İsveç', code: 'SE', flag: '🇸🇪', phone: '+46' },
  { name: 'Danimarka', code: 'DK', flag: '🇩🇰', phone: '+45' },
  { name: 'Finlandiya', code: 'FI', flag: '🇫🇮', phone: '+358' },
  { name: 'Portekiz', code: 'PT', flag: '🇵🇹', phone: '+351' },
  { name: 'İrlanda', code: 'IE', flag: '🇮🇪', phone: '+353' },
  { name: 'İngiltere', code: 'GB', flag: '🇬🇧', phone: '+44' },
  { name: 'Rusya', code: 'RU', flag: '🇷🇺', phone: '+7' },
  { name: 'Ukrayna', code: 'UA', flag: '🇺🇦', phone: '+380' },
  { name: 'Belarus', code: 'BY', flag: '🇧🇾', phone: '+375' },
  { name: 'Gürcistan', code: 'GE', flag: '🇬🇪', phone: '+995' },
  { name: 'Azerbaycan', code: 'AZ', flag: '🇦🇿', phone: '+994' },
  { name: 'İran', code: 'IR', flag: '🇮🇷', phone: '+98' },
  { name: 'Irak', code: 'IQ', flag: '🇮🇶', phone: '+964' },
  { name: 'Suriye', code: 'SY', flag: '🇸🇾', phone: '+963' },
  { name: 'Lübnan', code: 'LB', flag: '🇱🇧', phone: '+961' },
  { name: 'İsrail', code: 'IL', flag: '🇮🇱', phone: '+972' },
  { name: 'Mısır', code: 'EG', flag: '🇪🇬', phone: '+20' },
  { name: 'Libya', code: 'LY', flag: '🇱🇾', phone: '+218' },
  { name: 'Fas', code: 'MA', flag: '🇲🇦', phone: '+212' },
  { name: 'Tunus', code: 'TN', flag: '🇹🇳', phone: '+216' },
  { name: 'Cezayir', code: 'DZ', flag: '🇩🇿', phone: '+213' },
  { name: 'S. Arabistan', code: 'SA', flag: '🇸🇦', phone: '+966' },
  { name: 'BAE', code: 'AE', flag: '🇦🇪', phone: '+971' },
  { name: 'Katar', code: 'QA', flag: '🇶🇦', phone: '+974' },
  { name: 'Kuveyt', code: 'KW', flag: '🇰🇼', phone: '+965' },
  { name: 'ABD', code: 'US', flag: '🇺🇸', phone: '+1' },
  { name: 'Kanada', code: 'CA', flag: '🇨🇦', phone: '+1' },
  { name: 'Meksika', code: 'MX', flag: '🇲🇽', phone: '+52' },
  { name: 'Brezilya', code: 'BR', flag: '🇧🇷', phone: '+55' },
  { name: 'Arjantin', code: 'AR', flag: '🇦🇷', phone: '+54' },
  { name: 'Çin', code: 'CN', flag: '🇨🇳', phone: '+86' },
  { name: 'Japonya', code: 'JP', flag: '🇯🇵', phone: '+81' },
  { name: 'Güney Kore', code: 'KR', flag: '🇰🇷', phone: '+82' },
  { name: 'Hindistan', code: 'IN', flag: '🇮🇳', phone: '+91' },
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰', phone: '+92' },
  { name: 'Kazakistan', code: 'KZ', flag: '🇰🇿', phone: '+7' },
  { name: 'Özbekistan', code: 'UZ', flag: '🇺🇿', phone: '+998' },
  { name: 'Türkmenistan', code: 'TM', flag: '🇹🇲', phone: '+993' },
]

const COUNTRY_INDEX = new Map<string, Country>()
for (const c of COUNTRIES) {
  COUNTRY_INDEX.set(c.name.toLowerCase(), c)
  COUNTRY_INDEX.set(c.code.toLowerCase(), c)
}

export function findCountry(nameOrCode: string | undefined | null): Country | undefined {
  if (!nameOrCode) return undefined
  return COUNTRY_INDEX.get(nameOrCode.toLowerCase())
}
