export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ShipmentStatus = 
  | 'pending' | 'assigned' | 'picked_up' | 'in_transit'
  | 'out_for_delivery' | 'delivered' | 'postponed'
  | 'refused' | 'returned' | 'cancelled'

export type PaymentMethod = 'cod' | 'prepaid' | 'card'
export type UserRole = 'admin' | 'merchant' | 'driver'
export type VehicleType = 'motorcycle' | 'car' | 'van' | 'truck'
export type CourierStatus = 'active' | 'inactive' | 'on_delivery'
export type MerchantStatus = 'active' | 'suspended' | 'pending'
export type TransactionType = 
  | 'cod_collected' | 'merchant_settlement' | 'courier_salary'
  | 'return_fee' | 'delivery_fee' | 'cod_transfer'
export type TransactionStatus = 'pending' | 'completed' | 'cancelled'
export type SettlementStatus = 'pending' | 'approved' | 'paid' | 'rejected'

export interface ShipUser {
  id: string
  auth_id: string | null
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Zone {
  id: string
  name: string
  name_en: string | null
  region: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface PricingRule {
  id: string
  zone_id: string
  weight_from: number
  weight_to: number
  base_price: number
  extra_kg_price: number
  cod_fee_pct: number
  return_fee: number
  is_active: boolean
  created_at: string
  updated_at: string
  zone?: Zone
}

export interface Merchant {
  id: string
  user_id: string | null
  store_name: string
  contact_name: string
  phone: string
  email: string
  address: string | null
  zone_id: string | null
  balance: number
  pending_settlement: number
  total_shipments: number
  delivery_rate: number
  status: MerchantStatus
  api_key: string | null
  notes: string | null
  bank_name: string | null
  bank_account: string | null
  commission_rate: number
  created_at: string
  updated_at: string
  zone?: Zone
  user?: ShipUser
}

export interface Courier {
  id: string
  user_id: string | null
  name: string
  phone: string
  national_id: string | null
  vehicle_type: VehicleType
  vehicle_plate: string | null
  zone_id: string | null
  status: CourierStatus
  total_deliveries: number
  success_rate: number
  total_collections: number
  notes: string | null
  created_at: string
  updated_at: string
  zone?: Zone
  user?: ShipUser
}

export interface Shipment {
  id: string
  tracking_number: string
  merchant_id: string | null
  courier_id: string | null
  zone_id: string | null
  recipient_name: string
  recipient_phone: string
  recipient_phone2: string | null
  recipient_address: string
  recipient_notes: string | null
  product_description: string | null
  weight: number
  quantity: number
  is_fragile: boolean
  payment_method: PaymentMethod
  cod_amount: number
  delivery_fee: number
  cod_fee: number
  return_fee: number
  status: ShipmentStatus
  attempts: number
  notes: string | null
  import_batch_id: string | null
  assigned_at: string | null
  picked_up_at: string | null
  delivered_at: string | null
  returned_at: string | null
  created_at: string
  updated_at: string
  merchant?: Merchant
  courier?: Courier
  zone?: Zone
}

export interface ShipmentStatusLog {
  id: string
  shipment_id: string
  from_status: ShipmentStatus | null
  to_status: ShipmentStatus
  changed_by: string | null
  courier_id: string | null
  notes: string | null
  lat: number | null
  lng: number | null
  created_at: string
  user?: ShipUser
}

export interface FinancialTransaction {
  id: string
  type: TransactionType
  amount: number
  description: string | null
  shipment_id: string | null
  merchant_id: string | null
  courier_id: string | null
  status: TransactionStatus
  reference_no: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
  merchant?: Merchant
  courier?: Courier
  shipment?: Shipment
}

export interface SettlementRequest {
  id: string
  merchant_id: string
  amount: number
  shipment_count: number
  status: SettlementStatus
  notes: string | null
  admin_notes: string | null
  bank_name: string | null
  bank_account: string | null
  requested_by: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  merchant?: Merchant
}

export interface ImportBatch {
  id: string
  merchant_id: string | null
  file_name?: string | null
  total_rows: number
  success_rows: number
  failed_rows: number
  success_count?: number
  error_count?: number
  errors?: Json | null
  status: 'processing' | 'completed' | 'partial' | 'failed'
  imported_by?: string | null
  created_at: string
  merchant?: Merchant
}

export interface CourierCollection {
  id: string
  courier_id: string
  shipment_id: string
  amount: number
  collected_at: string
  transferred_at: string | null
  is_transferred: boolean
  courier?: Courier
  shipment?: Shipment
}

export type Database = {
  public: {
    Tables: {
      ship_users: {
        Row: ShipUser
        Insert: Omit<ShipUser, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ShipUser, 'id'>>
      }
      zones: {
        Row: Zone
        Insert: Omit<Zone, 'id' | 'created_at'>
        Update: Partial<Omit<Zone, 'id'>>
      }
      pricing_rules: {
        Row: PricingRule
        Insert: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PricingRule, 'id'>>
      }
      merchants: {
        Row: Merchant
        Insert: Omit<Merchant, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Merchant, 'id'>>
      }
      couriers: {
        Row: Courier
        Insert: Omit<Courier, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Courier, 'id'>>
      }
      shipments: {
        Row: Shipment
        Insert: Omit<Shipment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Shipment, 'id'>>
      }
      shipment_status_logs: {
        Row: ShipmentStatusLog
        Insert: Omit<ShipmentStatusLog, 'id' | 'created_at'>
        Update: Partial<Omit<ShipmentStatusLog, 'id'>>
      }
      financial_transactions: {
        Row: FinancialTransaction
        Insert: Omit<FinancialTransaction, 'id' | 'created_at'>
        Update: Partial<Omit<FinancialTransaction, 'id'>>
      }
      settlement_requests: {
        Row: SettlementRequest
        Insert: Omit<SettlementRequest, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SettlementRequest, 'id'>>
      }
      import_batches: {
        Row: ImportBatch
        Insert: Omit<ImportBatch, 'id' | 'created_at'>
        Update: Partial<Omit<ImportBatch, 'id'>>
      }
      courier_collections: {
        Row: CourierCollection
        Insert: Omit<CourierCollection, 'id'>
        Update: Partial<Omit<CourierCollection, 'id'>>
      }
    }
  }
}
