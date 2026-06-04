/**
 * ISO 4217 — Dünya resmi para birimleri listesi.
 * Source: ISO 4217:2015 + güncellemeler (2024).
 *
 * code: 3-letter ISO code
 * name: Türkçe ad
 * symbol: Sembolü (yoksa code'un kısaltması)
 * country: Ana kullanıldığı ülke (referans için)
 * decimals: Ondalık basamak sayısı (genelde 2, ama bazı para birimlerinde 0 veya 3)
 */

export interface Currency {
  code: string
  name: string
  symbol: string
  country: string
  decimals: number
}

export const CURRENCIES: Currency[] = [
  // === En çok kullanılan 10 (G10) ===
  { code: 'USD', name: 'ABD Doları', symbol: '$', country: 'ABD', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'Avrupa Birliği', decimals: 2 },
  { code: 'JPY', name: 'Japon Yeni', symbol: '¥', country: 'Japonya', decimals: 0 },
  { code: 'GBP', name: 'İngiliz Sterlini', symbol: '£', country: 'Birleşik Krallık', decimals: 2 },
  { code: 'AUD', name: 'Avustralya Doları', symbol: 'A$', country: 'Avustralya', decimals: 2 },
  { code: 'CAD', name: 'Kanada Doları', symbol: 'C$', country: 'Kanada', decimals: 2 },
  { code: 'CHF', name: 'İsviçre Frangı', symbol: 'CHF', country: 'İsviçre', decimals: 2 },
  { code: 'CNY', name: 'Çin Yuanı', symbol: '¥', country: 'Çin', decimals: 2 },
  { code: 'SEK', name: 'İsveç Kronu', symbol: 'kr', country: 'İsveç', decimals: 2 },
  { code: 'NZD', name: 'Yeni Zelanda Doları', symbol: 'NZ$', country: 'Yeni Zelanda', decimals: 2 },

  // === Türkiye + komşu / yakın ülkeler ===
  { code: 'TRY', name: 'Türk Lirası', symbol: '₺', country: 'Türkiye', decimals: 2 },
  { code: 'RUB', name: 'Rus Rublesi', symbol: '₽', country: 'Rusya', decimals: 2 },
  { code: 'UAH', name: 'Ukrayna Grivnası', symbol: '₴', country: 'Ukrayna', decimals: 2 },
  { code: 'GEL', name: 'Gürcü Larisi', symbol: '₾', country: 'Gürcistan', decimals: 2 },
  { code: 'AZN', name: 'Azerbaycan Manatı', symbol: '₼', country: 'Azerbaycan', decimals: 2 },
  { code: 'AMD', name: 'Ermeni Dramı', symbol: '֏', country: 'Ermenistan', decimals: 2 },
  { code: 'IRR', name: 'İran Riyali', symbol: '﷼', country: 'İran', decimals: 2 },
  { code: 'IQD', name: 'Irak Dinarı', symbol: 'ع.د', country: 'Irak', decimals: 3 },
  { code: 'SYP', name: 'Suriye Lirası', symbol: '£', country: 'Suriye', decimals: 2 },
  { code: 'LBP', name: 'Lübnan Lirası', symbol: 'ل.ل', country: 'Lübnan', decimals: 2 },

  // === Avrupa (Euro dışı) ===
  { code: 'NOK', name: 'Norveç Kronu', symbol: 'kr', country: 'Norveç', decimals: 2 },
  { code: 'DKK', name: 'Danimarka Kronu', symbol: 'kr', country: 'Danimarka', decimals: 2 },
  { code: 'PLN', name: 'Polonya Zlotisi', symbol: 'zł', country: 'Polonya', decimals: 2 },
  { code: 'CZK', name: 'Çek Korunası', symbol: 'Kč', country: 'Çekya', decimals: 2 },
  { code: 'HUF', name: 'Macar Forinti', symbol: 'Ft', country: 'Macaristan', decimals: 2 },
  { code: 'RON', name: 'Romen Leyi', symbol: 'lei', country: 'Romanya', decimals: 2 },
  { code: 'BGN', name: 'Bulgar Levası', symbol: 'лв', country: 'Bulgaristan', decimals: 2 },
  { code: 'HRK', name: 'Hırvat Kunası', symbol: 'kn', country: 'Hırvatistan', decimals: 2 },
  { code: 'RSD', name: 'Sırp Dinarı', symbol: 'дин', country: 'Sırbistan', decimals: 2 },
  { code: 'BAM', name: 'Bosna Hersek Markı', symbol: 'KM', country: 'Bosna Hersek', decimals: 2 },
  { code: 'MKD', name: 'Makedonya Denarı', symbol: 'ден', country: 'Kuzey Makedonya', decimals: 2 },
  { code: 'ALL', name: 'Arnavut Leki', symbol: 'L', country: 'Arnavutluk', decimals: 2 },
  { code: 'MDL', name: 'Moldova Leyi', symbol: 'L', country: 'Moldova', decimals: 2 },
  { code: 'BYN', name: 'Belarus Rublesi', symbol: 'Br', country: 'Belarus', decimals: 2 },
  { code: 'ISK', name: 'İzlanda Kronu', symbol: 'kr', country: 'İzlanda', decimals: 0 },

  // === Ortadoğu / Körfez ===
  { code: 'AED', name: 'BAE Dirhemi', symbol: 'د.إ', country: 'BAE', decimals: 2 },
  { code: 'SAR', name: 'Suudi Arabistan Riyali', symbol: '﷼', country: 'Suudi Arabistan', decimals: 2 },
  { code: 'QAR', name: 'Katar Riyali', symbol: 'ر.ق', country: 'Katar', decimals: 2 },
  { code: 'KWD', name: 'Kuveyt Dinarı', symbol: 'د.ك', country: 'Kuveyt', decimals: 3 },
  { code: 'BHD', name: 'Bahreyn Dinarı', symbol: '.د.ب', country: 'Bahreyn', decimals: 3 },
  { code: 'OMR', name: 'Umman Riyali', symbol: 'ر.ع.', country: 'Umman', decimals: 3 },
  { code: 'JOD', name: 'Ürdün Dinarı', symbol: 'د.ا', country: 'Ürdün', decimals: 3 },
  { code: 'ILS', name: 'İsrail Şekeli', symbol: '₪', country: 'İsrail', decimals: 2 },
  { code: 'YER', name: 'Yemen Riyali', symbol: '﷼', country: 'Yemen', decimals: 2 },

  // === Afrika ===
  { code: 'EGP', name: 'Mısır Lirası', symbol: 'ج.م', country: 'Mısır', decimals: 2 },
  { code: 'MAD', name: 'Fas Dirhemi', symbol: 'د.م.', country: 'Fas', decimals: 2 },
  { code: 'TND', name: 'Tunus Dinarı', symbol: 'د.ت', country: 'Tunus', decimals: 3 },
  { code: 'DZD', name: 'Cezayir Dinarı', symbol: 'د.ج', country: 'Cezayir', decimals: 2 },
  { code: 'LYD', name: 'Libya Dinarı', symbol: 'ل.د', country: 'Libya', decimals: 3 },
  { code: 'ZAR', name: 'Güney Afrika Randı', symbol: 'R', country: 'Güney Afrika', decimals: 2 },
  { code: 'NGN', name: 'Nijerya Nairası', symbol: '₦', country: 'Nijerya', decimals: 2 },
  { code: 'KES', name: 'Kenya Şilini', symbol: 'KSh', country: 'Kenya', decimals: 2 },
  { code: 'GHS', name: 'Gana Sedisi', symbol: '₵', country: 'Gana', decimals: 2 },
  { code: 'ETB', name: 'Etiyopya Birri', symbol: 'Br', country: 'Etiyopya', decimals: 2 },
  { code: 'UGX', name: 'Uganda Şilini', symbol: 'USh', country: 'Uganda', decimals: 0 },
  { code: 'TZS', name: 'Tanzanya Şilini', symbol: 'TSh', country: 'Tanzanya', decimals: 2 },
  { code: 'XOF', name: 'CFA Frangı (BCEAO)', symbol: 'CFA', country: 'Batı Afrika', decimals: 0 },
  { code: 'XAF', name: 'CFA Frangı (BEAC)', symbol: 'FCFA', country: 'Orta Afrika', decimals: 0 },
  { code: 'ZMW', name: 'Zambiya Kvacası', symbol: 'ZK', country: 'Zambiya', decimals: 2 },
  { code: 'AOA', name: 'Angola Kvanzası', symbol: 'Kz', country: 'Angola', decimals: 2 },
  { code: 'MZN', name: 'Mozambik Metikalı', symbol: 'MT', country: 'Mozambik', decimals: 2 },
  { code: 'BWP', name: 'Botsvana Pulası', symbol: 'P', country: 'Botsvana', decimals: 2 },
  { code: 'NAD', name: 'Namibya Doları', symbol: 'N$', country: 'Namibya', decimals: 2 },
  { code: 'MUR', name: 'Mauritius Rupisi', symbol: '₨', country: 'Mauritius', decimals: 2 },
  { code: 'SCR', name: 'Seyşeller Rupisi', symbol: '₨', country: 'Seyşeller', decimals: 2 },
  { code: 'MGA', name: 'Madagaskar Ariarisi', symbol: 'Ar', country: 'Madagaskar', decimals: 2 },
  { code: 'SDG', name: 'Sudan Lirası', symbol: 'ج.س.', country: 'Sudan', decimals: 2 },
  { code: 'SSP', name: 'Güney Sudan Lirası', symbol: '£', country: 'Güney Sudan', decimals: 2 },
  { code: 'RWF', name: 'Ruanda Frangı', symbol: 'FRw', country: 'Ruanda', decimals: 0 },
  { code: 'BIF', name: 'Burundi Frangı', symbol: 'FBu', country: 'Burundi', decimals: 0 },
  { code: 'KMF', name: 'Komor Frangı', symbol: 'CF', country: 'Komorlar', decimals: 0 },
  { code: 'DJF', name: 'Cibuti Frangı', symbol: 'Fdj', country: 'Cibuti', decimals: 0 },
  { code: 'ERN', name: 'Eritre Nakfası', symbol: 'Nfk', country: 'Eritre', decimals: 2 },
  { code: 'GMD', name: 'Gambiya Dalasisi', symbol: 'D', country: 'Gambiya', decimals: 2 },
  { code: 'GNF', name: 'Gine Frangı', symbol: 'FG', country: 'Gine', decimals: 0 },
  { code: 'LRD', name: 'Liberya Doları', symbol: 'L$', country: 'Liberya', decimals: 2 },
  { code: 'SLE', name: 'Sierra Leone Leonesi', symbol: 'Le', country: 'Sierra Leone', decimals: 2 },
  { code: 'CDF', name: 'Kongo Frangı', symbol: 'FC', country: 'DR Kongo', decimals: 2 },
  { code: 'STN', name: 'São Tomé Dobrası', symbol: 'Db', country: 'São Tomé ve Príncipe', decimals: 2 },
  { code: 'CVE', name: 'Yeşil Burun Eskudosu', symbol: 'Esc', country: 'Yeşil Burun', decimals: 2 },
  { code: 'LSL', name: 'Lesoto Lotisi', symbol: 'L', country: 'Lesoto', decimals: 2 },
  { code: 'SZL', name: 'Esvatini Lilangenisi', symbol: 'L', country: 'Esvatini', decimals: 2 },
  { code: 'MWK', name: 'Malavi Kvacası', symbol: 'MK', country: 'Malavi', decimals: 2 },
  { code: 'ZWG', name: 'Zimbabve ZiG', symbol: 'ZiG', country: 'Zimbabve', decimals: 2 },
  { code: 'MRU', name: 'Moritanya Ugiyası', symbol: 'UM', country: 'Moritanya', decimals: 2 },

  // === Asya ===
  { code: 'INR', name: 'Hindistan Rupisi', symbol: '₹', country: 'Hindistan', decimals: 2 },
  { code: 'PKR', name: 'Pakistan Rupisi', symbol: '₨', country: 'Pakistan', decimals: 2 },
  { code: 'BDT', name: 'Bangladeş Takası', symbol: '৳', country: 'Bangladeş', decimals: 2 },
  { code: 'LKR', name: 'Sri Lanka Rupisi', symbol: 'Rs', country: 'Sri Lanka', decimals: 2 },
  { code: 'NPR', name: 'Nepal Rupisi', symbol: 'रू', country: 'Nepal', decimals: 2 },
  { code: 'BTN', name: 'Bhutan Ngultrumu', symbol: 'Nu.', country: 'Bhutan', decimals: 2 },
  { code: 'MVR', name: 'Maldiv Rufiyaası', symbol: 'Rf', country: 'Maldivler', decimals: 2 },
  { code: 'AFN', name: 'Afgan Afganisi', symbol: '؋', country: 'Afganistan', decimals: 2 },
  { code: 'KZT', name: 'Kazak Tengesi', symbol: '₸', country: 'Kazakistan', decimals: 2 },
  { code: 'UZS', name: 'Özbek Somu', symbol: 'soʻm', country: 'Özbekistan', decimals: 2 },
  { code: 'KGS', name: 'Kırgız Somu', symbol: 'с', country: 'Kırgızistan', decimals: 2 },
  { code: 'TJS', name: 'Tacik Somonisi', symbol: 'SM', country: 'Tacikistan', decimals: 2 },
  { code: 'TMT', name: 'Türkmenistan Manatı', symbol: 'm', country: 'Türkmenistan', decimals: 2 },
  { code: 'MNT', name: 'Moğol Tögrögü', symbol: '₮', country: 'Moğolistan', decimals: 2 },

  // === Doğu Asya / Pasifik ===
  { code: 'HKD', name: 'Hong Kong Doları', symbol: 'HK$', country: 'Hong Kong', decimals: 2 },
  { code: 'TWD', name: 'Yeni Tayvan Doları', symbol: 'NT$', country: 'Tayvan', decimals: 2 },
  { code: 'KRW', name: 'Güney Kore Wonu', symbol: '₩', country: 'Güney Kore', decimals: 0 },
  { code: 'KPW', name: 'Kuzey Kore Wonu', symbol: '₩', country: 'Kuzey Kore', decimals: 2 },
  { code: 'SGD', name: 'Singapur Doları', symbol: 'S$', country: 'Singapur', decimals: 2 },
  { code: 'MYR', name: 'Malezya Ringgiti', symbol: 'RM', country: 'Malezya', decimals: 2 },
  { code: 'IDR', name: 'Endonezya Rupiahı', symbol: 'Rp', country: 'Endonezya', decimals: 2 },
  { code: 'THB', name: 'Tayland Bahtı', symbol: '฿', country: 'Tayland', decimals: 2 },
  { code: 'VND', name: 'Vietnam Dongu', symbol: '₫', country: 'Vietnam', decimals: 0 },
  { code: 'PHP', name: 'Filipin Pesosu', symbol: '₱', country: 'Filipinler', decimals: 2 },
  { code: 'MMK', name: 'Myanmar Kyatı', symbol: 'K', country: 'Myanmar', decimals: 2 },
  { code: 'KHR', name: 'Kamboçya Rieli', symbol: '៛', country: 'Kamboçya', decimals: 2 },
  { code: 'LAK', name: 'Laos Kipi', symbol: '₭', country: 'Laos', decimals: 2 },
  { code: 'BND', name: 'Brunei Doları', symbol: 'B$', country: 'Brunei', decimals: 2 },
  { code: 'MOP', name: 'Makao Patacası', symbol: 'P', country: 'Makao', decimals: 2 },
  { code: 'PGK', name: 'Papua Yeni Gine Kinası', symbol: 'K', country: 'Papua Yeni Gine', decimals: 2 },
  { code: 'FJD', name: 'Fiji Doları', symbol: 'FJ$', country: 'Fiji', decimals: 2 },
  { code: 'SBD', name: 'Solomon Doları', symbol: 'SI$', country: 'Solomon Adaları', decimals: 2 },
  { code: 'VUV', name: 'Vanuatu Vatusu', symbol: 'VT', country: 'Vanuatu', decimals: 0 },
  { code: 'TOP', name: 'Tonga Paʻangası', symbol: 'T$', country: 'Tonga', decimals: 2 },
  { code: 'WST', name: 'Samoa Talası', symbol: 'WS$', country: 'Samoa', decimals: 2 },
  { code: 'XPF', name: 'CFP Frangı', symbol: '₣', country: 'Fransız Polinezyası', decimals: 0 },

  // === Kuzey & Orta Amerika ===
  { code: 'MXN', name: 'Meksika Pesosu', symbol: 'Mex$', country: 'Meksika', decimals: 2 },
  { code: 'GTQ', name: 'Guatemala Quetzali', symbol: 'Q', country: 'Guatemala', decimals: 2 },
  { code: 'HNL', name: 'Honduras Lempirası', symbol: 'L', country: 'Honduras', decimals: 2 },
  { code: 'NIO', name: 'Nikaragua Córdobası', symbol: 'C$', country: 'Nikaragua', decimals: 2 },
  { code: 'CRC', name: 'Kosta Rika Colónu', symbol: '₡', country: 'Kosta Rika', decimals: 2 },
  { code: 'PAB', name: 'Panama Balboası', symbol: 'B/.', country: 'Panama', decimals: 2 },
  { code: 'BZD', name: 'Belize Doları', symbol: 'BZ$', country: 'Belize', decimals: 2 },
  { code: 'DOP', name: 'Dominik Pesosu', symbol: 'RD$', country: 'Dominik Cumhuriyeti', decimals: 2 },
  { code: 'JMD', name: 'Jamaika Doları', symbol: 'J$', country: 'Jamaika', decimals: 2 },
  { code: 'HTG', name: 'Haiti Gourdu', symbol: 'G', country: 'Haiti', decimals: 2 },
  { code: 'CUP', name: 'Küba Pesosu', symbol: '₱', country: 'Küba', decimals: 2 },
  { code: 'BSD', name: 'Bahama Doları', symbol: 'B$', country: 'Bahamalar', decimals: 2 },
  { code: 'BBD', name: 'Barbados Doları', symbol: 'Bds$', country: 'Barbados', decimals: 2 },
  { code: 'TTD', name: 'Trinidad ve Tobago Doları', symbol: 'TT$', country: 'Trinidad ve Tobago', decimals: 2 },
  { code: 'XCD', name: 'Doğu Karayip Doları', symbol: 'EC$', country: 'Doğu Karayipler', decimals: 2 },
  { code: 'AWG', name: 'Aruba Florini', symbol: 'ƒ', country: 'Aruba', decimals: 2 },
  { code: 'KYD', name: 'Cayman Adaları Doları', symbol: 'CI$', country: 'Cayman Adaları', decimals: 2 },
  { code: 'BMD', name: 'Bermuda Doları', symbol: 'BD$', country: 'Bermuda', decimals: 2 },

  // === Güney Amerika ===
  { code: 'BRL', name: 'Brezilya Reali', symbol: 'R$', country: 'Brezilya', decimals: 2 },
  { code: 'ARS', name: 'Arjantin Pesosu', symbol: 'AR$', country: 'Arjantin', decimals: 2 },
  { code: 'CLP', name: 'Şili Pesosu', symbol: 'CL$', country: 'Şili', decimals: 0 },
  { code: 'COP', name: 'Kolombiya Pesosu', symbol: 'COL$', country: 'Kolombiya', decimals: 2 },
  { code: 'PEN', name: 'Peru Solu', symbol: 'S/', country: 'Peru', decimals: 2 },
  { code: 'UYU', name: 'Uruguay Pesosu', symbol: '$U', country: 'Uruguay', decimals: 2 },
  { code: 'PYG', name: 'Paraguay Guaranisi', symbol: '₲', country: 'Paraguay', decimals: 0 },
  { code: 'BOB', name: 'Bolivya Bolivyanosu', symbol: 'Bs.', country: 'Bolivya', decimals: 2 },
  { code: 'VES', name: 'Venezuela Bolivarı', symbol: 'Bs.S', country: 'Venezuela', decimals: 2 },
  { code: 'GYD', name: 'Guyana Doları', symbol: 'G$', country: 'Guyana', decimals: 2 },
  { code: 'SRD', name: 'Surinam Doları', symbol: 'SR$', country: 'Surinam', decimals: 2 },
  { code: 'FKP', name: 'Falkland Sterlini', symbol: '£', country: 'Falkland Adaları', decimals: 2 },

  // === Özel / Diğer ===
  { code: 'XDR', name: 'IMF Özel Çekme Hakları', symbol: 'SDR', country: 'IMF', decimals: 6 },
  { code: 'XAU', name: 'Altın (Ons)', symbol: 'Au', country: 'Kıymetli Maden', decimals: 6 },
  { code: 'XAG', name: 'Gümüş (Ons)', symbol: 'Ag', country: 'Kıymetli Maden', decimals: 6 },
  { code: 'XPT', name: 'Platin (Ons)', symbol: 'Pt', country: 'Kıymetli Maden', decimals: 6 },
  { code: 'XPD', name: 'Paladyum (Ons)', symbol: 'Pd', country: 'Kıymetli Maden', decimals: 6 },
]

// Hızlı erişim haritası
const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]))

export function findCurrency(code: string | undefined | null): Currency | undefined {
  if (!code) return undefined
  return CURRENCY_MAP[code.toUpperCase()]
}

export function currencyLabel(code: string | undefined | null): string {
  const c = findCurrency(code)
  return c ? `${c.code} — ${c.name}` : (code || '')
}

export function currencySymbol(code: string | undefined | null): string {
  return findCurrency(code)?.symbol || code || ''
}

export function currencyDecimals(code: string | undefined | null): number {
  return findCurrency(code)?.decimals ?? 2
}

// Sık kullanılanlar (öncelikli listede üstte gösterilebilir)
export const COMMON_CURRENCY_CODES = ['EUR', 'USD', 'TRY', 'GBP', 'CHF', 'JPY', 'CNY']

/** Para birimi seçici için options (sık kullanılanlar üstte) */
export function currencyOptions(): Array<{ value: string; label: string; group: 'Sık Kullanılan' | 'Tüm Para Birimleri' }> {
  const common = COMMON_CURRENCY_CODES
    .map((code) => CURRENCY_MAP[code])
    .filter(Boolean)
    .map((c) => ({ value: c.code, label: `${c.code} — ${c.name}`, group: 'Sık Kullanılan' as const }))

  const rest = CURRENCIES
    .filter((c) => !COMMON_CURRENCY_CODES.includes(c.code))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((c) => ({ value: c.code, label: `${c.code} — ${c.name}`, group: 'Tüm Para Birimleri' as const }))

  return [...common, ...rest]
}
