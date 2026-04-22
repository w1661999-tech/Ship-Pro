-- ============================================================
-- Ship Pro - Database Setup for Supabase
-- تشغيل هذا الملف في: Supabase Dashboard → SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE shipment_status AS ENUM (
    'pending', 'assigned', 'picked_up', 'in_transit',
    'out_for_delivery', 'delivered', 'postponed',
    'refused', 'returned', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cod', 'prepaid', 'card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'merchant', 'driver');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM ('motorcycle', 'car', 'van', 'truck');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE courier_status AS ENUM ('active', 'inactive', 'on_delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE merchant_status AS ENUM ('active', 'suspended', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM (
    'cod_collected', 'merchant_settlement', 'courier_salary',
    'return_fee', 'delivery_fee', 'cod_transfer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE settlement_status AS ENUM ('pending', 'approved', 'paid', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLE: ship_users
-- ============================================================
CREATE TABLE IF NOT EXISTS ship_users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  phone        TEXT,
  role         user_role NOT NULL DEFAULT 'merchant',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: zones
-- ============================================================
CREATE TABLE IF NOT EXISTS zones (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  name_en    TEXT,
  region     TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: pricing_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id        UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  weight_from    NUMERIC(8,2) NOT NULL DEFAULT 0,
  weight_to      NUMERIC(8,2) NOT NULL,
  base_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  extra_kg_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  cod_fee_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  return_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: merchants
-- ============================================================
CREATE TABLE IF NOT EXISTS merchants (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID REFERENCES ship_users(id) ON DELETE SET NULL,
  store_name         TEXT NOT NULL,
  contact_name       TEXT NOT NULL DEFAULT '',
  phone              TEXT NOT NULL,
  email              TEXT NOT NULL,
  address            TEXT,
  zone_id            UUID REFERENCES zones(id) ON DELETE SET NULL,
  balance            NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_settlement NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_shipments    INT NOT NULL DEFAULT 0,
  delivery_rate      NUMERIC(5,2) NOT NULL DEFAULT 0,
  status             merchant_status NOT NULL DEFAULT 'pending',
  api_key            TEXT,
  notes              TEXT,
  bank_name          TEXT,
  bank_account       TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: couriers
-- ============================================================
CREATE TABLE IF NOT EXISTS couriers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES ship_users(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  national_id       TEXT,
  vehicle_type      vehicle_type NOT NULL DEFAULT 'motorcycle',
  vehicle_plate     TEXT,
  zone_id           UUID REFERENCES zones(id) ON DELETE SET NULL,
  status            courier_status NOT NULL DEFAULT 'active',
  total_deliveries  INT NOT NULL DEFAULT 0,
  success_rate      NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_collections NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: shipments
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_number     TEXT NOT NULL UNIQUE,
  merchant_id         UUID REFERENCES merchants(id) ON DELETE SET NULL,
  courier_id          UUID REFERENCES couriers(id) ON DELETE SET NULL,
  zone_id             UUID REFERENCES zones(id) ON DELETE SET NULL,
  recipient_name      TEXT NOT NULL,
  recipient_phone     TEXT NOT NULL,
  recipient_phone2    TEXT,
  recipient_address   TEXT NOT NULL,
  recipient_notes     TEXT,
  product_description TEXT,
  weight              NUMERIC(8,2) NOT NULL DEFAULT 1,
  quantity            INT NOT NULL DEFAULT 1,
  is_fragile          BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method      payment_method NOT NULL DEFAULT 'cod',
  cod_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
  cod_fee             NUMERIC(10,2) NOT NULL DEFAULT 0,
  return_fee          NUMERIC(10,2) NOT NULL DEFAULT 0,
  status              shipment_status NOT NULL DEFAULT 'pending',
  attempts            INT NOT NULL DEFAULT 0,
  notes               TEXT,
  import_batch_id     UUID,
  assigned_at         TIMESTAMPTZ,
  picked_up_at        TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  returned_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: shipment_status_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_status_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id  UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  from_status  shipment_status,
  to_status    shipment_status NOT NULL,
  changed_by   UUID REFERENCES ship_users(id) ON DELETE SET NULL,
  courier_id   UUID REFERENCES couriers(id) ON DELETE SET NULL,
  notes        TEXT,
  lat          NUMERIC(10,7),
  lng          NUMERIC(10,7),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: financial_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          transaction_type NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  description   TEXT,
  shipment_id   UUID REFERENCES shipments(id) ON DELETE SET NULL,
  merchant_id   UUID REFERENCES merchants(id) ON DELETE SET NULL,
  courier_id    UUID REFERENCES couriers(id) ON DELETE SET NULL,
  status        transaction_status NOT NULL DEFAULT 'pending',
  reference_no  TEXT,
  processed_by  UUID REFERENCES ship_users(id) ON DELETE SET NULL,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: settlement_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS settlement_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id    UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL,
  shipment_count INT NOT NULL DEFAULT 0,
  status         settlement_status NOT NULL DEFAULT 'pending',
  notes          TEXT,
  admin_notes    TEXT,
  bank_name      TEXT,
  bank_account   TEXT,
  requested_by   UUID REFERENCES ship_users(id) ON DELETE SET NULL,
  reviewed_by    UUID REFERENCES ship_users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: import_batches
-- ============================================================
CREATE TABLE IF NOT EXISTS import_batches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  file_name   TEXT NOT NULL,
  total_rows  INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  errors      JSONB,
  imported_by UUID REFERENCES ship_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: courier_collections
-- ============================================================
CREATE TABLE IF NOT EXISTS courier_collections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id    UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  shipment_id   UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL,
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transferred_at TIMESTAMPTZ,
  is_transferred BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_shipments_merchant ON shipments(merchant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_courier ON shipments(courier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_created ON shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_courier ON courier_collections(courier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON financial_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_settlements_merchant ON settlement_requests(merchant_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Basic setup
-- ============================================================
ALTER TABLE ship_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_collections ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (simplified for development)
CREATE POLICY "Allow all for authenticated" ON ship_users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON zones FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON pricing_rules FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON merchants FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON couriers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON shipments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON shipment_status_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON financial_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON settlement_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON import_batches FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON courier_collections FOR ALL TO authenticated USING (true);

-- Allow anon to read zones and pricing_rules (for public tracking)
CREATE POLICY "Public read zones" ON zones FOR SELECT TO anon USING (true);
CREATE POLICY "Public read shipments tracking" ON shipments FOR SELECT TO anon USING (true);
CREATE POLICY "Public read logs" ON shipment_status_logs FOR SELECT TO anon USING (true);

-- ============================================================
-- SEED DATA - Initial zones and pricing
-- ============================================================
INSERT INTO zones (name, name_en, region, sort_order, is_active) VALUES
  ('القاهرة - المناطق القريبة', 'Cairo - Near', 'القاهرة', 1, true),
  ('القاهرة - المناطق البعيدة', 'Cairo - Far', 'القاهرة', 2, true),
  ('الجيزة', 'Giza', 'الجيزة', 3, true),
  ('الإسكندرية', 'Alexandria', 'الإسكندرية', 4, true),
  ('المحافظات الكبرى', 'Major Governorates', 'أخرى', 5, true),
  ('المحافظات البعيدة', 'Remote Governorates', 'أخرى', 6, true)
ON CONFLICT DO NOTHING;

-- Add pricing rules for each zone
DO $$
DECLARE
  z_cairo_near UUID;
  z_cairo_far UUID;
  z_giza UUID;
  z_alex UUID;
  z_major UUID;
  z_remote UUID;
BEGIN
  SELECT id INTO z_cairo_near FROM zones WHERE name_en = 'Cairo - Near' LIMIT 1;
  SELECT id INTO z_cairo_far FROM zones WHERE name_en = 'Cairo - Far' LIMIT 1;
  SELECT id INTO z_giza FROM zones WHERE name_en = 'Giza' LIMIT 1;
  SELECT id INTO z_alex FROM zones WHERE name_en = 'Alexandria' LIMIT 1;
  SELECT id INTO z_major FROM zones WHERE name_en = 'Major Governorates' LIMIT 1;
  SELECT id INTO z_remote FROM zones WHERE name_en = 'Remote Governorates' LIMIT 1;

  -- Cairo Near pricing
  IF z_cairo_near IS NOT NULL THEN
    INSERT INTO pricing_rules (zone_id, weight_from, weight_to, base_price, extra_kg_price, cod_fee_pct, return_fee, is_active)
    VALUES (z_cairo_near, 0, 5, 25, 3, 1.5, 15) ON CONFLICT DO NOTHING;
    INSERT INTO pricing_rules (zone_id, weight_from, weight_to, base_price, extra_kg_price, cod_fee_pct, return_fee, is_active)
    VALUES (z_cairo_near, 5, 20, 35, 3, 1.5, 20) ON CONFLICT DO NOTHING;
  END IF;
  
  -- Cairo Far pricing
  IF z_cairo_far IS NOT NULL THEN
    INSERT INTO pricing_rules (zone_id, weight_from, weight_to, base_price, extra_kg_price, cod_fee_pct, return_fee, is_active)
    VALUES (z_cairo_far, 0, 5, 35, 4, 1.5, 20) ON CONFLICT DO NOTHING;
  END IF;

  -- Giza pricing
  IF z_giza IS NOT NULL THEN
    INSERT INTO pricing_rules (zone_id, weight_from, weight_to, base_price, extra_kg_price, cod_fee_pct, return_fee, is_active)
    VALUES (z_giza, 0, 5, 30, 3, 1.5, 18) ON CONFLICT DO NOTHING;
  END IF;

  -- Alexandria pricing
  IF z_alex IS NOT NULL THEN
    INSERT INTO pricing_rules (zone_id, weight_from, weight_to, base_price, extra_kg_price, cod_fee_pct, return_fee, is_active)
    VALUES (z_alex, 0, 5, 45, 5, 1.5, 25) ON CONFLICT DO NOTHING;
  END IF;

  -- Major governorates
  IF z_major IS NOT NULL THEN
    INSERT INTO pricing_rules (zone_id, weight_from, weight_to, base_price, extra_kg_price, cod_fee_pct, return_fee, is_active)
    VALUES (z_major, 0, 5, 55, 6, 2, 30) ON CONFLICT DO NOTHING;
  END IF;

  -- Remote governorates
  IF z_remote IS NOT NULL THEN
    INSERT INTO pricing_rules (zone_id, weight_from, weight_to, base_price, extra_kg_price, cod_fee_pct, return_fee, is_active)
    VALUES (z_remote, 0, 5, 70, 8, 2, 35) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- TRIGGER: auto update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_merchants_updated BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER tr_couriers_updated BEFORE UPDATE ON couriers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER tr_shipments_updated BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER tr_settlement_updated BEFORE UPDATE ON settlement_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER tr_pricing_updated BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
