/**
 * Incoterm kodları — ICC Incoterms 2020 + Fransız Gümrük (Douane) referans listesi.
 * Resmi Fransızca isimler gümrük belgelerinde kullanılır.
 */
export interface IncotermInfo {
  code: string
  /** Türkçe açıklama (kullanıcıya gösterilecek) */
  tr: string
  /** Fransızca resmi isim (gümrük belgesi için) */
  fr: string
  /** İngilizce isim (uluslararası referans) */
  en: string
  /** Geçerli mod: 'all' = tüm modlar, 'sea' = sadece deniz/iç su */
  modes: 'all' | 'sea'
}

export const INCOTERMS: IncotermInfo[] = [
  { code: 'EXW', tr: 'İşyerinde Teslim',                              fr: "À l'usine",                                en: 'Ex Works',                       modes: 'all' },
  { code: 'FCA', tr: 'Taşıyıcıya Masrafsız Teslim',                   fr: 'Franco transporteur',                      en: 'Free Carrier',                   modes: 'all' },
  { code: 'FAS', tr: 'Geminin Yanında Teslim',                        fr: 'Franco le long du navire',                 en: 'Free Alongside Ship',            modes: 'sea' },
  { code: 'FOB', tr: 'Gemi Bordasında Teslim',                        fr: 'Franco bord',                              en: 'Free on Board',                  modes: 'sea' },
  { code: 'CFR', tr: 'Mal Bedeli ve Navlun',                          fr: 'Coût et fret',                             en: 'Cost and Freight',               modes: 'sea' },
  { code: 'CIF', tr: 'Mal Bedeli, Sigorta ve Navlun',                 fr: 'Coût, assurance et fret',                  en: 'Cost, Insurance and Freight',    modes: 'sea' },
  { code: 'CPT', tr: 'Taşıma Ücreti Ödenmiş Olarak Teslim',           fr: "Port payé jusqu'à",                        en: 'Carriage Paid To',               modes: 'all' },
  { code: 'CIP', tr: 'Taşıma ve Sigorta Ödenmiş Olarak Teslim',       fr: "Port payé, assurance comprise, jusqu'à",   en: 'Carriage and Insurance Paid To', modes: 'all' },
  { code: 'DAP', tr: 'Belirlenen Yerde Teslim',                       fr: 'Rendu au lieu de',                         en: 'Delivered at Place',             modes: 'all' },
  { code: 'DPU', tr: 'Belirlenen Yerde Boşaltılmış Olarak Teslim',    fr: 'Rendu au lieu de destination déchargé',    en: 'Delivered at Place Unloaded',    modes: 'all' },
  { code: 'DDP', tr: 'Gümrük Vergileri Ödenmiş Olarak Teslim',        fr: 'Rendu droits acquittés',                   en: 'Delivered Duty Paid',            modes: 'all' },
  // Incoterms 2010'dan kalan (2020'de DPU oldu, geriye uyumluluk için tutuldu)
  { code: 'DAT', tr: 'Terminalde Teslim (eski - 2020 DPU)',            fr: 'Rendu au terminal',                        en: 'Delivered at Terminal (legacy)', modes: 'all' },
]

export function findIncoterm(code?: string | null): IncotermInfo | undefined {
  if (!code) return undefined
  return INCOTERMS.find((i) => i.code === code.trim().toUpperCase())
}
