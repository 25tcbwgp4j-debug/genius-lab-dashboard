-- Genius Lab — Initial schema
-- Enums
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'reception', 'technician');
CREATE TYPE device_category AS ENUM ('iphone', 'ipad', 'macbook', 'imac', 'apple_watch', 'airpods', 'other');
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE ticket_status AS ENUM (
  'new', 'intake_completed', 'in_diagnosis', 'ai_diagnosis_generated',
  'estimate_ready', 'waiting_customer_approval', 'approved', 'refused',
  'waiting_parts', 'in_repair', 'testing', 'ready_for_pickup',
  'ready_for_shipping', 'shipped', 'delivered', 'unrepaired_returned', 'cancelled'
);
CREATE TYPE contact_channel AS ENUM ('whatsapp', 'email', 'both', 'phone');
CREATE TYPE communication_channel AS ENUM ('whatsapp', 'email');
CREATE TYPE communication_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE stock_movement_type AS ENUM ('stock_in', 'stock_out', 'adjustment', 'reserved_for_ticket');
CREATE TYPE payment_method AS ENUM ('cash', 'pos', 'bank_transfer', 'other');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'reception',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Company settings (singleton)
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'Genius Lab',
  logo_url TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  working_hours TEXT,
  iban TEXT,
  bic TEXT,
  bank_name TEXT,
  account_holder TEXT,
  payment_instructions TEXT,
  default_disclaimer TEXT,
  pdf_footer_notes TEXT,
  whatsapp_phone TEXT,
  whatsapp_enabled BOOLEAN DEFAULT true,
  email_from_name TEXT,
  email_from_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT NOT NULL,
  whatsapp_phone TEXT,
  email TEXT NOT NULL,
  tax_code TEXT,
  vat_number TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  notes TEXT,
  preferred_contact_channel contact_channel NOT NULL DEFAULT 'both',
  privacy_consent BOOLEAN NOT NULL DEFAULT true,
  marketing_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(last_name, first_name);

-- Devices
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  category device_category NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Apple',
  model TEXT NOT NULL,
  serial_number TEXT,
  imei TEXT,
  meid TEXT,
  color TEXT,
  storage_capacity TEXT,
  accessories_received TEXT[],
  passcode_received BOOLEAN DEFAULT false,
  passcode_notes TEXT,
  intake_condition TEXT,
  customer_reported_issue TEXT,
  internal_notes TEXT,
  cosmetic_damage_notes TEXT,
  liquid_damage_suspected BOOLEAN DEFAULT false,
  power_on BOOLEAN,
  face_id_status TEXT,
  touch_id_status TEXT,
  true_tone_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_customer ON devices(customer_id);
CREATE INDEX idx_devices_serial ON devices(serial_number);

-- Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  created_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assigned_technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority ticket_priority NOT NULL DEFAULT 'normal',
  status ticket_status NOT NULL DEFAULT 'new',
  intake_summary TEXT,
  diagnosis TEXT,
  ai_diagnosis_summary TEXT,
  ai_recommended_actions TEXT,
  ai_risk_flags TEXT,
  estimate_labor_cost DECIMAL(12,2) DEFAULT 0,
  estimate_parts_cost DECIMAL(12,2) DEFAULT 0,
  final_labor_cost DECIMAL(12,2) DEFAULT 0,
  final_parts_cost DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  expected_delivery_date DATE,
  approved_by_customer BOOLEAN,
  approved_at TIMESTAMPTZ,
  refused_at TIMESTAMPTZ,
  ready_for_pickup_at TIMESTAMPTZ,
  ready_for_shipping_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  public_tracking_token TEXT UNIQUE NOT NULL,
  intake_pdf_url TEXT,
  estimate_pdf_url TEXT,
  final_report_pdf_url TEXT,
  shipping_required BOOLEAN DEFAULT false,
  shipping_address TEXT,
  recipient_name TEXT,
  recipient_phone TEXT,
  courier_name TEXT,
  tracking_code TEXT,
  shipping_notes TEXT,
  shipping_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_device ON tickets(device_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);
CREATE UNIQUE INDEX idx_tickets_public_token ON tickets(public_tracking_token);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);

-- Ticket events (audit)
CREATE TABLE ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status ticket_status,
  to_status ticket_status,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_events_ticket ON ticket_events(ticket_id);

-- AI diagnosis results (stored per ticket)
CREATE TABLE ticket_ai_diagnosis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  hypotheses TEXT[],
  suggested_checks TEXT[],
  probable_parts TEXT[],
  complexity TEXT,
  risk_notes TEXT[],
  confidence_score DECIMAL(3,2),
  next_actions TEXT[],
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_ai_diagnosis_ticket ON ticket_ai_diagnosis(ticket_id);

-- Parts
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  compatible_models TEXT[],
  quantity INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0,
  cost_price DECIMAL(12,2) DEFAULT 0,
  sell_price DECIMAL(12,2) DEFAULT 0,
  supplier TEXT,
  location TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parts_sku ON parts(sku);
CREATE INDEX idx_parts_active ON parts(active);

-- Stock movements
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_part ON stock_movements(part_id);
CREATE INDEX idx_stock_movements_ticket ON stock_movements(ticket_id);

-- Ticket parts (parts assigned to ticket)
CREATE TABLE ticket_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  unit_price DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, part_id)
);

CREATE INDEX idx_ticket_parts_ticket ON ticket_parts(ticket_id);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  payment_method payment_method NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_ticket ON payments(ticket_id);

-- Communications log
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel communication_channel NOT NULL,
  template_key TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  payload JSONB,
  status communication_status NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX idx_communications_ticket ON communications(ticket_id);
CREATE INDEX idx_communications_customer ON communications(customer_id);
CREATE INDEX idx_communications_created ON communications(created_at);

-- Message templates
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  channel communication_channel NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_key, channel)
);

CREATE INDEX idx_message_templates_key ON message_templates(template_key);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_ai_diagnosis ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users with profile can read/write based on role (simplified: all authenticated can read; write by role in app layer)
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role can manage profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read company_settings" ON company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin update company_settings" ON company_settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated read customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update customers" ON customers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read devices" ON devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage devices" ON devices FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read tickets" ON tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage tickets" ON tickets FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read ticket_events" ON ticket_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert ticket_events" ON ticket_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read ticket_ai_diagnosis" ON ticket_ai_diagnosis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage ticket_ai_diagnosis" ON ticket_ai_diagnosis FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read parts" ON parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage parts" ON parts FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read stock_movements" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert stock_movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read ticket_parts" ON ticket_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage ticket_parts" ON ticket_parts FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read payments" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read communications" ON communications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert communications" ON communications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read message_templates" ON message_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage message_templates" ON message_templates FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (NEW.id, 'reception', COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: next ticket number (GL-YYYY-NNNNNN)
CREATE OR REPLACE FUNCTION next_ticket_number()
RETURNS TEXT AS $$
DECLARE
  y TEXT;
  n INT;
BEGIN
  y := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(
    NULLIF(REGEXP_REPLACE(ticket_number, '^GL-' || y || '-', ''), '')::INT
  ), 0) + 1 INTO n
  FROM tickets
  WHERE ticket_number LIKE 'GL-' || y || '-%';
  RETURN 'GL-' || y || '-' || LPAD(n::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
