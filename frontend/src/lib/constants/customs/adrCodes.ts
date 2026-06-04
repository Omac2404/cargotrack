/**
 * Yaygın UN tehlikeli madde kodları (ADR / IATA / IMDG).
 * Kapsamlı bir liste değil — en sık karşılaşılanlar. Kullanıcı kendi kodunu
 * elle yazabilir (autocomplete dropdown).
 */
export interface AdrCodeInfo {
  code: string // örn. "UN1202"
  name: string // Türkçe isim
  class: string // Tehlike sınıfı (1-9)
  fr?: string // Fransızca isim
}

export const COMMON_ADR_CODES: AdrCodeInfo[] = [
  // === Sınıf 1 - Patlayıcılar ===
  { code: 'UN0004', name: 'Amonyum Pikrat', class: '1' },
  { code: 'UN0027', name: 'Karasil Tozu', class: '1' },
  { code: 'UN0081', name: 'Patlayıcı, Tip A', class: '1' },

  // === Sınıf 2 - Gazlar ===
  { code: 'UN1001', name: 'Asetilen, Çözünmüş', class: '2.1' },
  { code: 'UN1002', name: 'Hava, Sıkıştırılmış', class: '2.2' },
  { code: 'UN1005', name: 'Amonyak, Susuz', class: '2.3' },
  { code: 'UN1011', name: 'Bütan', class: '2.1' },
  { code: 'UN1013', name: 'Karbondioksit', class: '2.2' },
  { code: 'UN1017', name: 'Klor', class: '2.3' },
  { code: 'UN1018', name: 'Klorodiflorometan (R-22)', class: '2.2' },
  { code: 'UN1028', name: 'Diklorodiflorometan (R-12)', class: '2.2' },
  { code: 'UN1046', name: 'Helyum, Sıkıştırılmış', class: '2.2' },
  { code: 'UN1049', name: 'Hidrojen, Sıkıştırılmış', class: '2.1' },
  { code: 'UN1066', name: 'Azot, Sıkıştırılmış', class: '2.2' },
  { code: 'UN1072', name: 'Oksijen, Sıkıştırılmış', class: '2.2' },
  { code: 'UN1075', name: 'LPG (Petrol Gazları, Sıvılaştırılmış)', class: '2.1' },
  { code: 'UN1077', name: 'Propilen', class: '2.1' },
  { code: 'UN1078', name: 'Soğutucu Gaz', class: '2.2' },
  { code: 'UN1965', name: 'Hidrokarbon Gaz Karışımı (LPG)', class: '2.1' },
  { code: 'UN1971', name: 'Doğal Gaz (CNG)', class: '2.1' },
  { code: 'UN1972', name: 'Doğal Gaz (LNG)', class: '2.1' },
  { code: 'UN1978', name: 'Propan', class: '2.1' },

  // === Sınıf 3 - Yanıcı Sıvılar ===
  { code: 'UN1090', name: 'Aseton', class: '3' },
  { code: 'UN1170', name: 'Etanol (Etil Alkol)', class: '3' },
  { code: 'UN1202', name: 'Dizel / Mazot', class: '3' },
  { code: 'UN1203', name: 'Benzin / Motor Yakıtı', class: '3' },
  { code: 'UN1206', name: 'Heptan', class: '3' },
  { code: 'UN1219', name: 'İzopropanol (İzopropil Alkol)', class: '3' },
  { code: 'UN1223', name: 'Gazyağı (Kerosen)', class: '3' },
  { code: 'UN1230', name: 'Metanol', class: '3' },
  { code: 'UN1262', name: 'Oktan', class: '3' },
  { code: 'UN1263', name: 'Boya / Boya Malzemesi', class: '3' },
  { code: 'UN1267', name: 'Petrol Ham', class: '3' },
  { code: 'UN1268', name: 'Petrol Damıtma Ürünleri', class: '3' },
  { code: 'UN1294', name: 'Toluen', class: '3' },
  { code: 'UN1307', name: 'Ksilen', class: '3' },
  { code: 'UN1863', name: 'Jet Yakıtı (Jet A1)', class: '3' },
  { code: 'UN1866', name: 'Reçine Solüsyonu, Yanıcı', class: '3' },
  { code: 'UN1993', name: 'Yanıcı Sıvı, N.O.S.', class: '3' },

  // === Sınıf 4 - Yanıcı Katılar ===
  { code: 'UN1325', name: 'Yanıcı Katı, Organik, N.O.S.', class: '4.1' },
  { code: 'UN1350', name: 'Kükürt', class: '4.1' },
  { code: 'UN1361', name: 'Karbon (Aktif Kömür)', class: '4.2' },
  { code: 'UN1408', name: 'Ferrosilikon', class: '4.3' },

  // === Sınıf 5 - Oksitleyiciler ===
  { code: 'UN1486', name: 'Potasyum Nitrat', class: '5.1' },
  { code: 'UN1942', name: 'Amonyum Nitrat (gübre)', class: '5.1' },
  { code: 'UN2014', name: 'Hidrojen Peroksit, Sulu Çözelti', class: '5.1' },

  // === Sınıf 6 - Toksik ===
  { code: 'UN1654', name: 'Nikotin', class: '6.1' },
  { code: 'UN1888', name: 'Kloroform', class: '6.1' },
  { code: 'UN2810', name: 'Toksik Sıvı, Organik, N.O.S.', class: '6.1' },
  { code: 'UN3245', name: 'Genetik Olarak Değiştirilmiş Organizma', class: '6.2' },

  // === Sınıf 7 - Radyoaktif ===
  { code: 'UN2912', name: 'Radyoaktif Malzeme, Düşük Spesifik Aktivite', class: '7' },
  { code: 'UN2915', name: 'Radyoaktif Malzeme, Tip A Paket', class: '7' },

  // === Sınıf 8 - Aşındırıcı ===
  { code: 'UN1789', name: 'Hidroklorik Asit (HCl)', class: '8' },
  { code: 'UN1791', name: 'Hipoklorit Çözeltisi', class: '8' },
  { code: 'UN1805', name: 'Fosforik Asit', class: '8' },
  { code: 'UN1814', name: 'Potasyum Hidroksit Çözeltisi', class: '8' },
  { code: 'UN1823', name: 'Sodyum Hidroksit (Kostik Soda), Katı', class: '8' },
  { code: 'UN1824', name: 'Sodyum Hidroksit Çözeltisi', class: '8' },
  { code: 'UN1830', name: 'Sülfürik Asit', class: '8' },
  { code: 'UN1840', name: 'Çinko Klorür Çözeltisi', class: '8' },
  { code: 'UN2031', name: 'Nitrik Asit', class: '8' },
  { code: 'UN2796', name: 'Akümülatör Asidi', class: '8' },

  // === Sınıf 9 - Çeşitli ===
  { code: 'UN3077', name: 'Çevreye Zararlı Madde, Katı, N.O.S.', class: '9' },
  { code: 'UN3082', name: 'Çevreye Zararlı Madde, Sıvı, N.O.S.', class: '9' },
  { code: 'UN3090', name: 'Lityum Metal Pil', class: '9' },
  { code: 'UN3091', name: 'Lityum Metal Pil (Ekipman içinde)', class: '9' },
  { code: 'UN3480', name: 'Lityum İyon Pil', class: '9' },
  { code: 'UN3481', name: 'Lityum İyon Pil (Ekipman içinde)', class: '9' },
  { code: 'UN3528', name: 'İçten Yanmalı Motor', class: '9' },
  { code: 'UN3536', name: 'Lityum Pil, Araç içinde', class: '9' },
]

export const ADR_CLASS_LABELS: Record<string, string> = {
  '1': 'Sınıf 1 — Patlayıcılar',
  '2': 'Sınıf 2 — Gazlar',
  '2.1': 'Sınıf 2.1 — Yanıcı Gaz',
  '2.2': 'Sınıf 2.2 — Yanıcı Olmayan Gaz',
  '2.3': 'Sınıf 2.3 — Toksik Gaz',
  '3': 'Sınıf 3 — Yanıcı Sıvı',
  '4.1': 'Sınıf 4.1 — Yanıcı Katı',
  '4.2': 'Sınıf 4.2 — Kendiliğinden Yanıcı',
  '4.3': 'Sınıf 4.3 — Su ile Yanıcı Gaz Çıkaran',
  '5.1': 'Sınıf 5.1 — Oksitleyici',
  '5.2': 'Sınıf 5.2 — Organik Peroksit',
  '6.1': 'Sınıf 6.1 — Toksik',
  '6.2': 'Sınıf 6.2 — Bulaşıcı',
  '7': 'Sınıf 7 — Radyoaktif',
  '8': 'Sınıf 8 — Aşındırıcı',
  '9': 'Sınıf 9 — Çeşitli Tehlikeli',
}

const RECENT_ADR_STORAGE_KEY = 'ct.recent_adr_codes'
const MAX_RECENT = 5

export function getRecentAdrCodes(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_ADR_STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : []
  } catch { return [] }
}

export function rememberAdrCode(code: string): void {
  if (!code || !code.trim()) return
  try {
    const current = getRecentAdrCodes()
    const next = [code.trim().toUpperCase(), ...current.filter((c) => c !== code.trim().toUpperCase())].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_ADR_STORAGE_KEY, JSON.stringify(next))
  } catch { /* sessiz */ }
}

export function findAdrCode(code?: string | null): AdrCodeInfo | undefined {
  if (!code) return undefined
  return COMMON_ADR_CODES.find((a) => a.code === code.trim().toUpperCase())
}
