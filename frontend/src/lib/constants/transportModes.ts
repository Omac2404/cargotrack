/**
 * TRANSPORT_MODES — mode başına master config (PHP cargotrack.php:9765'ten port).
 * Liste kolonları, form alanları, belge listesi, ekipman tipleri vb.
 */

export interface ListColumn {
  key: string
  label: string
  width: string
}

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'datetime-local' | 'select'
  placeholder?: string
  options?: string[]
}

export interface DocItem {
  key: string
  label: string
}

export interface EquipmentType {
  label: string
  icon: string
}

export interface VehicleLabels {
  plate: string
  trailer: string
  volume: string
  capacity: string
}

export interface TransportModeConfig {
  label: string
  label_short: string
  prefix: string
  color: string
  icon: string
  listColumns: ListColumn[]
  generalFields: FieldDef[]
  docList: DocItem[]
  equipmentTypes: Record<string, EquipmentType>
  vehicle_label: VehicleLabels
}

export const TRANSPORT_MODES: Record<string, TransportModeConfig> = {
  road: {
    label: 'Karayolu', label_short: 'Karayolu', prefix: 'ROU', color: '#6366f1', icon: '🚛',
    listColumns: [
      { key: 'shipment_no', label: 'Dosya No', width: 'auto' },
      { key: 'date', label: 'Tarih', width: '90px' },
      { key: 'client', label: 'Müşteri', width: 'auto' },
      { key: 'route', label: 'Güzergah', width: 'auto' },
      { key: 'status', label: 'Etap', width: '80px' },
      { key: 'loading', label: 'Yükleme', width: '110px' },
      { key: 'sale', label: 'Satış', width: '100px' },
      { key: 'margin', label: 'Marj %', width: '80px' },
      { key: 'actions', label: 'İşlem', width: '160px' },
    ],
    generalFields: [],
    docList: [
      { key: 'cmr', label: 'CMR (Karayolu Taşıma Belgesi)' },
      { key: 'cmr_signed', label: 'CMR (İmzalı)' },
      { key: 'invoice', label: 'Ticari Fatura' },
      { key: 'packing_list', label: 'Çeki Listesi' },
      { key: 'customs_dec', label: 'Gümrük Beyannamesi' },
      { key: 'eur1', label: 'EUR.1 / A.TR' },
      { key: 'insurance', label: 'Sigorta Poliçesi' },
      { key: 'transit', label: 'Transit Belgesi (T1/T2)' },
    ],
    equipmentTypes: {
      tilt: { label: 'Tenteli', icon: '🚛' },
      frigorifik: { label: 'Frigorifik', icon: '❄️' },
      open: { label: 'Açık Kasa', icon: '🛻' },
      container: { label: 'Konteyner', icon: '📦' },
      tanker: { label: 'Tanker', icon: '🛢️' },
      other: { label: 'Diğer', icon: '🚚' },
    },
    vehicle_label: { plate: 'Çekici Plakası', trailer: 'Dorse Plakası', volume: 'Hacim (m³)', capacity: 'Kapasite (kg)' },
  },

  sea: {
    label: 'Denizyolu', label_short: 'Deniz', prefix: 'SEA', color: '#0ea5e9', icon: '🚢',
    listColumns: [
      { key: 'shipment_no', label: 'Dosya No', width: 'auto' },
      { key: 'date', label: 'Tarih', width: '90px' },
      { key: 'client', label: 'Müşteri', width: 'auto' },
      { key: 'route_ports', label: 'POL → POD', width: 'auto' },
      { key: 'vessel', label: 'Vessel/Voyage', width: '160px' },
      { key: 'bl_no', label: 'B/L No', width: '130px' },
      { key: 'status', label: 'Etap', width: '80px' },
      { key: 'loading', label: 'Yükleme', width: '110px' },
      { key: 'sale', label: 'Satış', width: '100px' },
      { key: 'actions', label: 'İşlem', width: '150px' },
    ],
    generalFields: [
      { key: 'vessel_name', label: 'Vessel Adı', type: 'text', placeholder: 'Örn: MSC OSCAR' },
      { key: 'voyage_no', label: 'Voyage No', type: 'text', placeholder: 'Örn: 142W' },
      { key: 'operator', label: 'Operator/Armatör', type: 'text', placeholder: 'Örn: MSC, Maersk' },
      { key: 'pol', label: 'Yükleme Limanı (POL)', type: 'text', placeholder: 'Örn: TR-IZM (İzmir)' },
      { key: 'pod', label: 'Boşaltma Limanı (POD)', type: 'text', placeholder: 'Örn: FR-MRS (Marsilya)' },
      { key: 'mbl_no', label: 'MBL No (Master B/L)', type: 'text' },
      { key: 'hbl_no', label: 'HBL No (House B/L)', type: 'text' },
      { key: 'etd', label: 'ETD (Tahmini Kalkış)', type: 'date' },
      { key: 'eta', label: 'ETA (Tahmini Varış)', type: 'date' },
      { key: 'atd', label: 'ATD (Fiili Kalkış)', type: 'date' },
      { key: 'ata', label: 'ATA (Fiili Varış)', type: 'date' },
      { key: 'incoterm', label: 'Incoterm', type: 'select', options: ['', 'EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] },
    ],
    docList: [
      { key: 'mbl', label: 'Master B/L (Konşimento)' },
      { key: 'hbl', label: 'House B/L (Konşimento)' },
      { key: 'manifest', label: 'Manifest' },
      { key: 'invoice', label: 'Ticari Fatura' },
      { key: 'packing_list', label: 'Çeki Listesi' },
      { key: 'customs_dec', label: 'Gümrük Beyannamesi' },
      { key: 'eur1', label: 'EUR.1 / A.TR' },
      { key: 'insurance', label: 'Sigorta Poliçesi' },
      { key: 'cert_origin', label: 'Menşe Şahadetnamesi' },
      { key: 'container_list', label: 'Konteyner Listesi' },
    ],
    equipmentTypes: {
      container_20: { label: "20' Dry", icon: '📦' },
      container_40: { label: "40' Dry", icon: '📦' },
      container_40hc: { label: "40' High Cube", icon: '📦' },
      container_reefer: { label: 'Reefer (Soğutuculu)', icon: '❄️' },
      bulk: { label: 'Bulk (Dökme)', icon: '🚢' },
      breakbulk: { label: 'Breakbulk', icon: '📦' },
      tanker: { label: 'Tanker', icon: '🛢️' },
      roro: { label: 'Ro-Ro', icon: '🚗' },
      other: { label: 'Diğer', icon: '🚢' },
    },
    vehicle_label: { plate: 'Konteyner No / Vessel', trailer: 'Mühür No', volume: 'Hacim (m³ / TEU)', capacity: 'Kapasite (kg)' },
  },

  air: {
    label: 'Havayolu', label_short: 'Hava', prefix: 'AIR', color: '#f59e0b', icon: '✈️',
    listColumns: [
      { key: 'shipment_no', label: 'Dosya No', width: 'auto' },
      { key: 'date', label: 'Tarih', width: '90px' },
      { key: 'client', label: 'Müşteri', width: 'auto' },
      { key: 'route_airports', label: 'IATA → IATA', width: 'auto' },
      { key: 'flight', label: 'Flight', width: '130px' },
      { key: 'awb_no', label: 'AWB No', width: '130px' },
      { key: 'status', label: 'Etap', width: '80px' },
      { key: 'loading', label: 'Yükleme', width: '110px' },
      { key: 'sale', label: 'Satış', width: '100px' },
      { key: 'actions', label: 'İşlem', width: '150px' },
    ],
    generalFields: [
      { key: 'airline_code', label: 'Havayolu Kodu', type: 'text', placeholder: 'Örn: TK, AF, LH' },
      { key: 'flight_no', label: 'Uçuş No', type: 'text', placeholder: 'Örn: TK1821' },
      { key: 'flight_date', label: 'Uçuş Tarihi', type: 'date' },
      { key: 'cutoff_time', label: 'Cut-off Saati', type: 'datetime-local' },
      { key: 'origin_airport', label: 'Kalkış Havalimanı (IATA)', type: 'text', placeholder: 'Örn: IST' },
      { key: 'dest_airport', label: 'Varış Havalimanı (IATA)', type: 'text', placeholder: 'Örn: CDG' },
      { key: 'mawb_no', label: 'MAWB No (Master AWB)', type: 'text', placeholder: '235-12345678' },
      { key: 'hawb_no', label: 'HAWB No (House AWB)', type: 'text' },
      { key: 'volumetric_weight', label: 'Volumetric Weight (kg)', type: 'number', placeholder: '1m³ ≈ 167 kg' },
      { key: 'chargeable_weight', label: 'Chargeable Weight (kg)', type: 'number' },
      { key: 'incoterm', label: 'Incoterm', type: 'select', options: ['', 'EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] },
    ],
    docList: [
      { key: 'mawb', label: 'MAWB (Master Airway Bill)' },
      { key: 'hawb', label: 'HAWB (House Airway Bill)' },
      { key: 'manifest', label: 'Cargo Manifest' },
      { key: 'invoice', label: 'Ticari Fatura' },
      { key: 'packing_list', label: 'Çeki Listesi' },
      { key: 'customs_dec', label: 'Gümrük Beyannamesi' },
      { key: 'dgd', label: 'Tehlikeli Madde Beyanı (DGD)' },
      { key: 'insurance', label: 'Sigorta Poliçesi' },
      { key: 'cert_origin', label: 'Menşe Şahadetnamesi' },
      { key: 'security', label: 'Güvenlik Beyanı' },
    ],
    equipmentTypes: {
      passenger: { label: 'Yolcu Uçağı (Belly Hold)', icon: '✈️' },
      freighter: { label: 'Kargo Uçağı', icon: '🛩️' },
      combi: { label: 'Combi', icon: '✈️' },
      express: { label: 'Express', icon: '⚡' },
      other: { label: 'Diğer', icon: '✈️' },
    },
    vehicle_label: { plate: 'Uçuş No / Tail Number', trailer: 'Tescil No', volume: 'Kargo Hacmi (m³)', capacity: 'Yük Kapasitesi (kg)' },
  },
}

// maritime ↔ sea alias (DB shipments='maritime', UI bazen 'sea')
TRANSPORT_MODES.maritime = TRANSPORT_MODES.sea

/** Mode config getir (varsayılan: road) — alias-aware */
export function getTransportMode(t: string | undefined | null): TransportModeConfig {
  if (t === 'sea' || t === 'maritime') return TRANSPORT_MODES.sea
  return TRANSPORT_MODES[t || ''] || TRANSPORT_MODES.road
}

/** Storage ve import/export için fallback (PHP'de bunlar road UI'sini kullanıyor) */
export function getEffectiveTransportMode(t: string | undefined | null): TransportModeConfig {
  if (t === 'sea' || t === 'maritime') return TRANSPORT_MODES.sea
  if (t === 'air') return TRANSPORT_MODES.air
  return TRANSPORT_MODES.road
}
