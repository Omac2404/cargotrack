/**
 * Antrepo / Depo Tipleri — Fransız Gümrük (CGI) sınıflandırması.
 * Sevkiyat formundaki "Transit / Geçici Depo" bölümünde kullanılır.
 */
export interface WarehouseTypeInfo {
  code: 'R' | 'S' | 'T' | 'U' | 'V' | 'Y' | 'Z'
  /** Türkçe açıklama */
  tr: string
  /** Fransızca resmi isim (gümrük) */
  fr: string
  /** Daha detaylı açıklama (tooltip için) */
  description: string
}

export const WAREHOUSE_TYPES: WarehouseTypeInfo[] = [
  {
    code: 'R',
    tr: 'Tip I Antrepo',
    fr: 'entrepôt de type I',
    description: 'Kamu antrepo, çok kullanıcılı (genel kullanıma açık)',
  },
  {
    code: 'S',
    tr: 'Tip II Antrepo',
    fr: 'entrepôt de type II',
    description: 'Antrepo işletmecisi sorumlu; gümrük gözetiminde mal depolanır',
  },
  {
    code: 'T',
    tr: 'Tip III Antrepo',
    fr: 'entrepôt de type III',
    description: 'Gümrük tarafından yönetilen antrepo',
  },
  {
    code: 'U',
    tr: 'Özel Antrepo',
    fr: 'entrepôt privé',
    description: 'Antrepo sahibi tarafından kendi malları için kullanılır',
  },
  {
    code: 'V',
    tr: 'Geçici Depolama Tesisi (Transit)',
    fr: 'installation de stockage temporaire',
    description: 'Geçici depolama — gümrük gözetiminde, sınırlı süreyle (max 90 gün AB için)',
  },
  {
    code: 'Y',
    tr: 'Gümrük Dışı Antrepo',
    fr: 'entrepôt autre que douanier',
    description: 'Vergi antrepoları gibi gümrük dışı amaçlı',
  },
  {
    code: 'Z',
    tr: 'Serbest Bölge / Serbest Antrepo',
    fr: 'zone franche ou entrepôt franc',
    description: 'Serbest bölge — gümrük dışı, vergi muafiyetli alan',
  },
]

export function findWarehouseType(code?: string | null): WarehouseTypeInfo | undefined {
  if (!code) return undefined
  return WAREHOUSE_TYPES.find((w) => w.code === code.trim().toUpperCase())
}

/** Tipik geçici depolama süresi (gün) — AB için 90 gün, dışı için 14 gün */
export const DEFAULT_TEMP_STORAGE_DAYS = 90

/** Transit evrak son geçerlilik tarihinden bu kadar gün önce uyarı göster */
export const TRANSIT_EXPIRY_WARNING_DAYS = 4
