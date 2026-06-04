// Backend response envelope (utils.js: { success, data })
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
}

export type ApiError = {
  message: string
  [key: string]: unknown
}

// === Domain types ===
export type UserRole = 'super_admin' | 'admin' | 'user'

export interface User {
  id: number
  username: string
  full_name: string
  email?: string
  role: UserRole
  status?: 'active' | 'inactive'
  created_at?: string
  last_login?: string | null
  /** Backend tarafından döndürülen efektif izin listesi (rol default'ları + override'lar) */
  permissions?: string[]
  /** True ise: kullanıcı varsayılan/zorunlu değişim şifresiyle giriş yapmış, /profile'a yönlendirilmeli */
  must_change_password?: boolean
}

export interface LoginResponse {
  token: string
  user: User
}

export type TransportType = 'road' | 'maritime' | 'air' | 'storage' | 'import' | 'export'
export type ShipmentStatus = 'draft' | 'in_progress' | 'to_invoice' | 'closed'

// === Partner ===
export type PartnerType = 'customer' | 'receiver' | 'sender' | 'agent'

export interface Partner {
  id: number
  partner_code?: string
  type: PartnerType
  extra_roles?: string[] | string
  company_name: string
  physical_address?: string
  postal_code?: string
  city?: string
  country?: string
  contact_person?: string
  contact_email?: string
  contact_phone?: string
  tax_number?: string
  mersis_number?: string
  eori_number?: string
  billing_address?: string
  billing_email?: string
  created_by?: number
  created_at?: string
}

// === Warehouse ===
export type WarehouseStatus = 'active' | 'inactive'

export interface Warehouse {
  id: number
  warehouse_code: string
  name: string
  type_code: 'R' | 'S' | 'T' | 'U' | 'V' | 'Y' | 'Z'
  address?: string
  postal_code?: string
  city?: string
  country?: string
  capacity_info?: string
  responsible_person?: string
  contact_phone?: string
  contact_email?: string
  notes?: string
  status: WarehouseStatus
  created_by?: number
  created_at?: string
}

// === Vehicle ===
export type VehicleTransport = 'road' | 'sea' | 'air'
export type VehicleStatus = 'active' | 'inactive' | 'maintenance'

export interface Vehicle {
  id: number
  vehicle_code: string
  transport_type: VehicleTransport
  plate: string
  trailer_plate?: string
  volume_m3?: number | string
  capacity_kg?: number | string
  equipment_type: string
  adr_certified?: 0 | 1
  brand_model?: string
  driver_name?: string
  driver_phone?: string
  registration_date?: string | null
  notes?: string
  status: VehicleStatus
  mode_data?: string | null
  created_by?: number
  created_at?: string
}

// === Vehicle Assignment ===
export interface Assignment {
  id: number
  vehicle_id: number
  shipment_id: number
  assigned_quantity: number
  assigned_weight: number | string
  loading_date?: string | null
  notes?: string
  created_by?: number
  created_at?: string

  // JOIN sonucu zenginleştirilmiş alanlar (backend)
  vehicle_code?: string
  plate?: string
  trailer_plate?: string
  equipment_type?: string
  capacity_kg?: number | string
  volume_m3?: number | string
  driver_name?: string
  shipment_no?: string
  shipment_quantity?: number
  shipment_weight?: number | string
  departure_country?: string
  arrival_country?: string
  transport_type?: TransportType
  client_billing?: string
}

// === Mode-specific data ===
export interface SeaModeData {
  vessel_name?: string
  voyage_no?: string
  operator?: string
  pol?: string             // Port of Loading
  pod?: string             // Port of Discharge
  mbl_no?: string          // Master B/L
  hbl_no?: string          // House B/L
  etd?: string             // Tahmini Kalkış
  eta?: string             // Tahmini Varış
  atd?: string             // Fiili Kalkış
  ata?: string             // Fiili Varış
  incoterm?: string
  container_list?: string[]
  demurrage_days?: number
}

export interface AirModeData {
  airline_code?: string
  flight_no?: string
  flight_date?: string
  cutoff_time?: string
  origin_airport?: string  // IATA
  dest_airport?: string    // IATA
  mawb_no?: string         // Master AWB
  hawb_no?: string         // House AWB
  volumetric_weight?: number
  chargeable_weight?: number
  incoterm?: string
}

export type ModeData = SeaModeData | AirModeData | Record<string, unknown>

// === Vehicle mode_data ===
export interface SeaVehicleModeData {
  vessel_name?: string
  voyage?: string
  imo_no?: string
  operator?: string
}

export interface AirVehicleModeData {
  airline_code?: string
  flight_no?: string
  iata?: string
  registration?: string
}

// === Crate (kap) ===
export interface Crate {
  qty: number             // kaç adet
  length?: number         // cm
  width?: number          // cm
  height?: number         // cm
  weight?: number         // kg (her biri)
  description?: string
}

// === Document slot status ===
export type DocStage = 'missing' | 'uploaded' | 'approved'

export interface DocumentSlotEntry {
  filename?: string
  stored_name?: string
  uploaded_at?: string
  status?: DocStage
  stages?: Record<DocStage, boolean>
  approved_at?: string
  approved_by?: string
  notes?: string
}

export type DocumentsData = Record<string, DocumentSlotEntry>

// === Storage data (storage_data JSON içinde) ===
export interface StorageData {
  warehouse_id?: string
  warehouse_code?: string
  transit_expiry_date?: string
  transit_alert_dismissed?: boolean
  // Elleçleme KDV — handling.ts ELL_ITEMS ile uyumlu
  ell?: Record<string, string | number>
  // Diğer mode_data ile uyumsuz alanlar
  [k: string]: unknown
}

// === Audit log entry ===
export interface AuditEntry {
  id: number
  user_id: number | null
  username: string | null
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'upload' | 'download'
  entity_type: string
  entity_id: number | null
  entity_label: string | null
  changes: unknown
  ip_address: string | null
  created_at: string
}

// === Sidebar alerts (lookup endpoint) ===
export interface SidebarAlerts {
  docs_missing_shipments: number
  overdue_payments: number
  transit_warnings: number
}

// === Vehicle summary (lookup endpoint) ===
export interface VehicleSummary {
  id: number
  vehicle_code: string
  plate: string
  transport_type: VehicleTransport
  status: VehicleStatus
  capacity_kg: number | string
  volume_m3: number | string
  driver_name?: string
  assignment_count: number
  total_quantity: number
  total_weight: number | string
  load_percent: number
}

// === Warehouse summary ===
export interface WarehouseSummary {
  id: number
  warehouse_code: string
  name: string
  type_code: string
  status: WarehouseStatus
  city?: string
  country?: string
  active_count: number
  last_activity: string | null
}

export interface Shipment {
  id: number
  shipment_no: string
  transport_type: TransportType
  status: ShipmentStatus
  created_date?: string | null
  client_billing?: string
  sender?: string
  receiver?: string
  agent?: string
  departure_country?: string
  arrival_country?: string
  gross_weight?: number | string
  quantity?: number
  purchase_price?: number | string
  sale_price?: number | string
  currency_code?: string
  invoice_no?: string
  invoice_date?: string
  invoice_amount?: number | string
  payment_received?: 0 | 1
  payment_type?: string
  // Mode/Financial/Storage JSON kolonları
  mode_data?: string | ModeData | null
  financial_data?: string | object | null
  storage_data?: string | StorageData | null
  documents_data?: string | DocumentsData | null
  crates_data?: string | Crate[] | null
  depo_stock_log?: string | object | null
  // Tüm depo alanları
  depo_kap_sayisi?: number
  depo_ucret_tipi?: 'gun' | 'hafta' | 'ay'
  depo_gun_ucret?: number | string
  depo_hafta_ucret?: number | string
  depo_ay_ucret?: number | string
  depo_musteri?: string
  warehouse?: string
  entry_date?: string
  exit_date?: string
  created_at?: string
  updated_at?: string
  created_by?: number
  [key: string]: unknown
}
