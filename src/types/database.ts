export type AppRole = 'admin' | 'manager' | 'reception' | 'technician'

export type DeviceCategory =
  | 'iphone'
  | 'ipad'
  | 'macbook'
  | 'imac'
  | 'apple_watch'
  | 'airpods'
  | 'other'

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

export type TicketStatus =
  | 'new'
  | 'intake_completed'
  | 'in_diagnosis'
  | 'ai_diagnosis_generated'
  | 'estimate_ready'
  | 'waiting_customer_approval'
  | 'approved'
  | 'refused'
  | 'waiting_parts'
  | 'in_repair'
  | 'testing'
  | 'ready_for_pickup'
  | 'ready_for_shipping'
  | 'shipped'
  | 'delivered'
  | 'unrepaired_returned'
  | 'cancelled'

export type ContactChannel = 'whatsapp' | 'email' | 'both' | 'phone'
export type CommunicationChannel = 'whatsapp' | 'email'
export type CommunicationStatus = 'pending' | 'sent' | 'delivered' | 'failed'
export type StockMovementType = 'stock_in' | 'stock_out' | 'adjustment' | 'reserved_for_ticket'
export type PaymentMethod = 'cash' | 'pos' | 'bank_transfer' | 'other'

export interface Profile {
  id: string
  role: AppRole
  display_name: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  first_name: string
  last_name: string
  company_name: string | null
  phone: string
  whatsapp_phone: string | null
  email: string
  tax_code: string | null
  vat_number: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  notes: string | null
  preferred_contact_channel: ContactChannel
  privacy_consent: boolean
  marketing_consent: boolean | null
  created_at: string
  updated_at: string
}

export interface Device {
  id: string
  customer_id: string
  category: DeviceCategory
  brand: string
  model: string
  serial_number: string | null
  imei: string | null
  meid: string | null
  color: string | null
  storage_capacity: string | null
  accessories_received: string[] | null
  passcode_received: boolean | null
  passcode_notes: string | null
  intake_condition: string | null
  customer_reported_issue: string | null
  internal_notes: string | null
  cosmetic_damage_notes: string | null
  liquid_damage_suspected: boolean | null
  power_on: boolean | null
  face_id_status: string | null
  touch_id_status: string | null
  true_tone_status: string | null
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  ticket_number: string
  customer_id: string
  device_id: string
  created_by_user_id: string
  assigned_technician_id: string | null
  priority: TicketPriority
  status: TicketStatus
  intake_summary: string | null
  diagnosis: string | null
  ai_diagnosis_summary: string | null
  ai_recommended_actions: string | null
  ai_risk_flags: string | null
  estimate_labor_cost: number
  estimate_parts_cost: number
  estimate_notes: string | null
  refused_note: string | null
  final_labor_cost: number
  final_parts_cost: number
  total_amount: number
  amount_paid: number
  payment_status: string
  expected_delivery_date: string | null
  approved_by_customer: boolean | null
  approved_at: string | null
  refused_at: string | null
  ready_for_pickup_at: string | null
  ready_for_shipping_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  closed_at: string | null
  public_tracking_token: string
  intake_pdf_url: string | null
  estimate_pdf_url: string | null
  final_report_pdf_url: string | null
  shipping_required: boolean
  shipping_address: string | null
  recipient_name: string | null
  recipient_phone: string | null
  courier_name: string | null
  tracking_code: string | null
  shipping_notes: string | null
  shipping_cost: number | null
  created_at: string
  updated_at: string
}

export interface Part {
  id: string
  sku: string | null
  name: string
  category: string | null
  compatible_models: string[] | null
  quantity: number
  minimum_stock: number
  cost_price: number
  sell_price: number
  supplier: string | null
  location: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  ticket_id: string
  payment_method: PaymentMethod
  amount: number
  payment_date: string
  reference: string | null
  notes: string | null
  created_by: string
  created_at: string
}

export interface Communication {
  id: string
  ticket_id: string | null
  customer_id: string
  channel: CommunicationChannel
  template_key: string
  recipient: string
  subject: string | null
  body: string | null
  payload: Record<string, unknown> | null
  status: CommunicationStatus
  provider_message_id: string | null
  error_message: string | null
  created_at: string
  sent_at: string | null
}

export interface CompanySettings {
  id: string
  company_name: string
  logo_url: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  working_hours: string | null
  iban: string | null
  bic: string | null
  bank_name: string | null
  account_holder: string | null
  payment_instructions: string | null
  default_disclaimer: string | null
  pdf_footer_notes: string | null
  whatsapp_phone: string | null
  whatsapp_enabled: boolean
  email_from_name: string | null
  email_from_address: string | null
  created_at: string
  updated_at: string
}
