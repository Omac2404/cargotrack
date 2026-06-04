/**
 * Gümrük Belge Tipleri — UN/EDIFACT 1001 + Fransız Gümrük (Douane) referans.
 * Belgeler sekmesinde "belge tipi" seçimi için kullanılır.
 */
export interface CustomsDocTypeInfo {
  code: string
  /** Türkçe açıklama (kullanıcı dostu) */
  tr: string
  /** Fransızca resmi isim (gümrük) */
  fr: string
  /** Kategorisi — UI'da gruplama için */
  category: 'commercial' | 'transport' | 'customs' | 'transit' | 'reference' | 'other'
}

export const CUSTOMS_DOC_TYPES: CustomsDocTypeInfo[] = [
  // === Ticari ===
  { code: '325', tr: 'Proforma Fatura',           fr: 'Facture pro forma',     category: 'commercial' },
  { code: '380', tr: 'Ticari Fatura',             fr: 'Facture commerciale',   category: 'commercial' },
  { code: '270', tr: 'Yükleme Listesi',           fr: 'Liste de chargement',   category: 'commercial' },
  { code: '271', tr: 'Çeki Listesi (Packing List)', fr: 'Liste de colisage',   category: 'commercial' },
  { code: '235', tr: 'Konteyner Listesi',         fr: 'Liste des conteneurs',  category: 'commercial' },

  // === Taşıma ===
  { code: '703', tr: 'Taşıma Belgesi',            fr: 'Lettre de transport',                                category: 'transport' },
  { code: '704', tr: 'Ana Konşimento (Master B/L)', fr: 'Connaissement principal',                          category: 'transport' },
  { code: '705', tr: 'Konşimento (B/L)',          fr: 'Connaissement',                                       category: 'transport' },
  { code: '714', tr: 'House B/L (NVOCC)',         fr: 'Connaissement maritime émis par un transitaire ou NVOCC (house bill of lading)', category: 'transport' },
  { code: '720', tr: 'CIM Demiryolu Hamulesi',    fr: 'Lettre de voiture CIM (fer)',                         category: 'transport' },
  { code: '722', tr: 'SMGS Eşlik Listesi',        fr: "Liste d'accompagnement SMGS",                         category: 'transport' },
  { code: '730', tr: 'CMR (Karayolu Hamulesi)',   fr: 'Lettre de voiture pour les transports routiers',     category: 'transport' },
  { code: '740', tr: 'Havayolu Konşimentosu (AWB)', fr: 'Lettre de transport aérien',                       category: 'transport' },
  { code: '741', tr: 'Ana AWB (Master AWB)',      fr: 'Lettre de transport aérien principal',                category: 'transport' },
  { code: '750', tr: 'Posta Gönderim Bordrosu',   fr: "Bulletin d'expédition (colis postaux)",               category: 'transport' },
  { code: '760', tr: 'Multimodal Taşıma Belgesi', fr: 'Document de transport multimodal/combiné',           category: 'transport' },
  { code: '785', tr: 'Yükleme Manifestosu',       fr: 'Manifeste de chargement',                             category: 'transport' },
  { code: '787', tr: 'Bordro',                    fr: 'Bordereau',                                           category: 'transport' },
  { code: 'MNS', tr: 'Basitleştirilmiş Deniz Manifestosu', fr: 'Manifeste maritime - procédure simplifiée', category: 'transport' },

  // === Gümrük Beyannameleri ===
  { code: '337', tr: 'Özet Geçici Depolama Beyanı', fr: 'Déclaration sommaire de dépôt temporaire',          category: 'customs' },
  { code: '355', tr: 'Özet Giriş Beyannamesi (ENS)', fr: "Déclaration sommaire d'entrée",                    category: 'customs' },
  { code: 'CO',  tr: 'CO Tipi Beyanname',         fr: 'Déclaration type CO',                                 category: 'customs' },
  { code: 'EU',  tr: 'EU Tipi Beyanname',         fr: 'Déclaration type EU',                                 category: 'customs' },
  { code: 'EX',  tr: 'İhracat Beyannamesi (EX)',  fr: 'Déclaration type EX (exportation)',                  category: 'customs' },
  { code: 'IM',  tr: 'İthalat Beyannamesi (IM)',  fr: 'Déclaration type IM (importation)',                  category: 'customs' },
  { code: 'SDE', tr: 'Basitleştirilmiş Beyanname', fr: 'Déclaration simplifiée',                             category: 'customs' },
  { code: 'IST', tr: 'Geçici Depolama Tesisi',    fr: 'Installation de stockage temporaire',                category: 'customs' },

  // === Transit ===
  { code: '820', tr: 'AB Transit Beyannamesi (T)',     fr: 'Déclaration de transit communautaire - envois composites (T)', category: 'transit' },
  { code: '821', tr: 'AB Dış Transit Beyannamesi (T1)', fr: 'Déclaration de transit communautaire externe (T1)',          category: 'transit' },
  { code: '822', tr: 'AB İç Transit Beyannamesi (T2)',  fr: 'Déclaration de transit communautaire interne (T2)',          category: 'transit' },
  { code: 'T2F', tr: 'T2F İç Transit Beyannamesi',     fr: 'Déclaration de transit communautaire interne T2F',            category: 'transit' },
  { code: 'TCS', tr: 'Basitleştirilmiş AB Transit (TCS)', fr: 'Transit communautaire simplifié',                          category: 'transit' },
  { code: '952', tr: 'TIR Karnesi',                    fr: 'Carnet TIR',                                                  category: 'transit' },
  { code: '955', tr: 'ATA Karnesi',                    fr: 'Carnet ATA',                                                  category: 'transit' },

  // === Referans / Statü Belgeleri ===
  { code: '823', tr: 'T5 Kontrol Nüshası',        fr: 'Exemplaire de contrôle T5',                          category: 'reference' },
  { code: '825', tr: 'AB Statü Belgesi T2L',      fr: "Preuve du statut douanier de marchandises de l'Union T2L", category: 'reference' },
  { code: 'T2G', tr: 'AB Statü Belgesi T2LF',     fr: "Preuve du statut douanier T2LF",                     category: 'reference' },
  { code: 'T2M', tr: 'T2M',                       fr: 'T2M',                                                 category: 'reference' },
  { code: 'IF3', tr: 'INF3 Bilgi Belgesi',        fr: "Bulletin d'information INF3",                        category: 'reference' },
  { code: 'IF8', tr: 'INF8 Bilgi Belgesi',        fr: "Bulletin d'information INF8",                        category: 'reference' },
  { code: 'CLE', tr: 'Kayıt Referansı / Tarihi',  fr: "Référence/date de l'inscription des marchandises dans les écritures", category: 'reference' },
  { code: 'MRN', tr: 'MRN Numarası (Movement Reference)', fr: 'Déclaration / notification du MRN', category: 'reference' },

  // === Diğer ===
  { code: 'ZZZ', tr: 'Diğer',                     fr: 'Autres',                                              category: 'other' },
]

export const CUSTOMS_DOC_CATEGORY_LABELS: Record<CustomsDocTypeInfo['category'], string> = {
  commercial: 'Ticari Belgeler',
  transport: 'Taşıma Belgeleri',
  customs: 'Gümrük Beyannameleri',
  transit: 'Transit Belgeleri',
  reference: 'Statü / Referans',
  other: 'Diğer',
}

export function findCustomsDocType(code?: string | null): CustomsDocTypeInfo | undefined {
  if (!code) return undefined
  return CUSTOMS_DOC_TYPES.find((d) => d.code === code.trim().toUpperCase())
}
