/**
 * TRANSPORT_MODES — mode başına master config.
 * Label'lar i18n key'i olarak saklanır — UI'de t(label) ile çevrilir.
 * Liste kolonları, form alanları, belge listesi, ekipman tipleri vb.
 */

export interface ListColumn {
  key: string
  /** i18n key (örn. "transport.columns.file_no") — UI'de t(label) ile çevrilir */
  label: string
  width: string
}

export interface FieldDef {
  key: string
  /** i18n key (örn. "transport.fields.vessel_name") */
  label: string
  type: 'text' | 'number' | 'date' | 'datetime-local' | 'select'
  placeholder?: string
  options?: string[]
}

export interface DocItem {
  key: string
  /** i18n key (örn. "transport.documents.cmr") */
  label: string
}

export interface EquipmentType {
  /** i18n key (örn. "transport.equipment.tilt") */
  label: string
  icon: string
}

export interface VehicleLabels {
  /** i18n key — UI'de t(plate) ile çevrilir */
  plate: string
  trailer: string
  volume: string
  capacity: string
}

export interface TransportModeConfig {
  /** i18n key (örn. "transport.modes.road") */
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
    label: 'transport.modes.road', label_short: 'transport.modes.road_short', prefix: 'ROU', color: '#6366f1', icon: '🚛',
    listColumns: [
      { key: 'shipment_no', label: 'transport.columns.file_no', width: 'auto' },
      { key: 'date', label: 'transport.columns.date', width: '90px' },
      { key: 'client', label: 'transport.columns.client', width: 'auto' },
      { key: 'route', label: 'transport.columns.route', width: 'auto' },
      { key: 'status', label: 'transport.columns.status', width: '80px' },
      { key: 'loading', label: 'transport.columns.loading', width: '110px' },
      { key: 'sale', label: 'transport.columns.sale', width: '100px' },
      { key: 'margin', label: 'transport.columns.margin', width: '80px' },
      { key: 'actions', label: 'transport.columns.actions', width: '160px' },
    ],
    generalFields: [],
    docList: [
      { key: 'cmr', label: 'transport.documents.cmr' },
      { key: 'cmr_signed', label: 'transport.documents.cmr_signed' },
      { key: 'invoice', label: 'transport.documents.invoice' },
      { key: 'packing_list', label: 'transport.documents.packing_list' },
      { key: 'customs_dec', label: 'transport.documents.customs_dec' },
      { key: 'eur1', label: 'transport.documents.eur1' },
      { key: 'insurance', label: 'transport.documents.insurance' },
      { key: 'transit', label: 'transport.documents.transit' },
    ],
    equipmentTypes: {
      tilt: { label: 'transport.equipment.tilt', icon: '🚛' },
      frigorifik: { label: 'transport.equipment.frigorifik', icon: '❄️' },
      open: { label: 'transport.equipment.open', icon: '🛻' },
      container: { label: 'transport.equipment.container', icon: '📦' },
      tanker: { label: 'transport.equipment.tanker', icon: '🛢️' },
      other: { label: 'transport.equipment.other', icon: '🚚' },
    },
    vehicle_label: { plate: 'transport.vehicle_labels.plate', trailer: 'transport.vehicle_labels.trailer', volume: 'transport.vehicle_labels.volume', capacity: 'transport.vehicle_labels.capacity' },
  },

  sea: {
    label: 'transport.modes.sea', label_short: 'transport.modes.sea_short', prefix: 'SEA', color: '#0ea5e9', icon: '🚢',
    listColumns: [
      { key: 'shipment_no', label: 'transport.columns.file_no', width: 'auto' },
      { key: 'date', label: 'transport.columns.date', width: '90px' },
      { key: 'client', label: 'transport.columns.client', width: 'auto' },
      { key: 'route_ports', label: 'transport.columns.route_ports', width: 'auto' },
      { key: 'vessel', label: 'transport.columns.vessel', width: '160px' },
      { key: 'bl_no', label: 'transport.columns.bl_no', width: '130px' },
      { key: 'status', label: 'transport.columns.status', width: '80px' },
      { key: 'loading', label: 'transport.columns.loading', width: '110px' },
      { key: 'sale', label: 'transport.columns.sale', width: '100px' },
      { key: 'actions', label: 'transport.columns.actions', width: '150px' },
    ],
    generalFields: [
      { key: 'vessel_name', label: 'transport.fields.vessel_name', type: 'text', placeholder: 'MSC OSCAR' },
      { key: 'voyage_no', label: 'transport.fields.voyage_no', type: 'text', placeholder: '142W' },
      { key: 'operator', label: 'transport.fields.operator', type: 'text', placeholder: 'MSC, Maersk' },
      { key: 'pol', label: 'transport.fields.pol', type: 'text', placeholder: 'TR-IZM' },
      { key: 'pod', label: 'transport.fields.pod', type: 'text', placeholder: 'FR-MRS' },
      { key: 'mbl_no', label: 'transport.fields.mbl_no', type: 'text' },
      { key: 'hbl_no', label: 'transport.fields.hbl_no', type: 'text' },
      { key: 'etd', label: 'transport.fields.etd', type: 'date' },
      { key: 'eta', label: 'transport.fields.eta', type: 'date' },
      { key: 'atd', label: 'transport.fields.atd', type: 'date' },
      { key: 'ata', label: 'transport.fields.ata', type: 'date' },
      { key: 'incoterm', label: 'shipment.fields.incoterm', type: 'select', options: ['', 'EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] },
    ],
    docList: [
      { key: 'mbl', label: 'transport.documents.mbl' },
      { key: 'hbl', label: 'transport.documents.hbl' },
      { key: 'manifest', label: 'transport.documents.manifest' },
      { key: 'invoice', label: 'transport.documents.invoice' },
      { key: 'packing_list', label: 'transport.documents.packing_list' },
      { key: 'customs_dec', label: 'transport.documents.customs_dec' },
      { key: 'eur1', label: 'transport.documents.eur1' },
      { key: 'insurance', label: 'transport.documents.insurance' },
      { key: 'cert_origin', label: 'transport.documents.cert_origin' },
      { key: 'container_list', label: 'transport.documents.container_list' },
    ],
    equipmentTypes: {
      container_20: { label: 'transport.equipment.container_20', icon: '📦' },
      container_40: { label: 'transport.equipment.container_40', icon: '📦' },
      container_40hc: { label: 'transport.equipment.container_40hc', icon: '📦' },
      container_reefer: { label: 'transport.equipment.container_reefer', icon: '❄️' },
      bulk: { label: 'transport.equipment.bulk', icon: '🚢' },
      breakbulk: { label: 'transport.equipment.breakbulk', icon: '📦' },
      tanker: { label: 'transport.equipment.tanker', icon: '🛢️' },
      roro: { label: 'transport.equipment.roro', icon: '🚗' },
      other: { label: 'transport.equipment.other', icon: '🚢' },
    },
    vehicle_label: { plate: 'transport.vehicle_labels.container_no', trailer: 'transport.vehicle_labels.seal_no', volume: 'transport.vehicle_labels.volume', capacity: 'transport.vehicle_labels.capacity' },
  },

  air: {
    label: 'transport.modes.air', label_short: 'transport.modes.air_short', prefix: 'AIR', color: '#f59e0b', icon: '✈️',
    listColumns: [
      { key: 'shipment_no', label: 'transport.columns.file_no', width: 'auto' },
      { key: 'date', label: 'transport.columns.date', width: '90px' },
      { key: 'client', label: 'transport.columns.client', width: 'auto' },
      { key: 'route_airports', label: 'transport.columns.route_airports', width: 'auto' },
      { key: 'flight', label: 'transport.columns.flight', width: '130px' },
      { key: 'awb_no', label: 'transport.columns.awb_no', width: '130px' },
      { key: 'status', label: 'transport.columns.status', width: '80px' },
      { key: 'loading', label: 'transport.columns.loading', width: '110px' },
      { key: 'sale', label: 'transport.columns.sale', width: '100px' },
      { key: 'actions', label: 'transport.columns.actions', width: '150px' },
    ],
    generalFields: [
      { key: 'airline_code', label: 'transport.fields.airline_code', type: 'text', placeholder: 'TK, AF, LH' },
      { key: 'flight_no', label: 'transport.fields.flight_no', type: 'text', placeholder: 'TK1821' },
      { key: 'flight_date', label: 'transport.fields.flight_date', type: 'date' },
      { key: 'cutoff_time', label: 'transport.fields.cutoff_time', type: 'datetime-local' },
      { key: 'origin_airport', label: 'transport.fields.origin_airport', type: 'text', placeholder: 'IST' },
      { key: 'dest_airport', label: 'transport.fields.dest_airport', type: 'text', placeholder: 'CDG' },
      { key: 'mawb_no', label: 'transport.fields.mawb_no', type: 'text', placeholder: '235-12345678' },
      { key: 'hawb_no', label: 'transport.fields.hawb_no', type: 'text' },
      { key: 'volumetric_weight', label: 'transport.fields.volumetric_weight', type: 'number', placeholder: '1m³ ≈ 167 kg' },
      { key: 'chargeable_weight', label: 'transport.fields.chargeable_weight', type: 'number' },
      { key: 'incoterm', label: 'shipment.fields.incoterm', type: 'select', options: ['', 'EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] },
    ],
    docList: [
      { key: 'mawb', label: 'transport.documents.mawb' },
      { key: 'hawb', label: 'transport.documents.hawb' },
      { key: 'manifest', label: 'transport.documents.cargo_manifest' },
      { key: 'invoice', label: 'transport.documents.invoice' },
      { key: 'packing_list', label: 'transport.documents.packing_list' },
      { key: 'customs_dec', label: 'transport.documents.customs_dec' },
      { key: 'dgd', label: 'transport.documents.dgd' },
      { key: 'insurance', label: 'transport.documents.insurance' },
      { key: 'cert_origin', label: 'transport.documents.cert_origin' },
      { key: 'security', label: 'transport.documents.security' },
    ],
    equipmentTypes: {
      passenger: { label: 'transport.equipment.passenger', icon: '✈️' },
      freighter: { label: 'transport.equipment.freighter', icon: '🛩️' },
      combi: { label: 'transport.equipment.combi', icon: '✈️' },
      express: { label: 'transport.equipment.express', icon: '⚡' },
      other: { label: 'transport.equipment.other', icon: '✈️' },
    },
    vehicle_label: { plate: 'transport.vehicle_labels.flight_tail', trailer: 'transport.vehicle_labels.registration', volume: 'transport.vehicle_labels.volume', capacity: 'transport.vehicle_labels.capacity' },
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
