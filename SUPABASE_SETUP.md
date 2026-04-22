# 📊 دليل إعداد قاعدة البيانات Supabase - Ship Pro

## المعلومات الأساسية للاتصال

```
🔐 معرّف المشروع:
  Project ID: uyciwmoavtqmhazhkmmu

🌐 رابط الاتصال (URL):
  https://uyciwmoavtqmhazhkmmu.supabase.co

🔑 المفاتيح:
  Anon Key (عام - للمتصفح):
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y2l3bW9hdnRxbWhhemhrbW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTI1NjIsImV4cCI6MjA5MjAyODU2Mn0.VE9VgRrBf_V-Sds1Yakukti-g7IuWe4tjR5bA44Cflw

  Service Role Key (خاص - للـ Backend فقط):
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y2l3bW9hdnRxbWhhemhrbW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ1MjU2MiwiZXhwIjoyMDkyMDI4NTYyfQ.lr-hnHIVzqHmrOT-8svj0YnxMQ6jqX5EN66T3Je6TAo
```

---

## 🗂️ هيكل الجداول المطلوبة

### 1️⃣ جدول المستخدمين (ship_users)
```sql
CREATE TABLE IF NOT EXISTS ship_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  full_name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  role VARCHAR DEFAULT 'driver' CHECK (role IN ('admin', 'merchant', 'driver')),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2️⃣ جدول المناطق (zones)
```sql
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  name_en VARCHAR,
  region VARCHAR,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3️⃣ جدول قواعد التسعير (pricing_rules)
```sql
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  weight_from DECIMAL DEFAULT 0,
  weight_to DECIMAL DEFAULT 0,
  base_price DECIMAL NOT NULL,
  extra_kg_price DECIMAL DEFAULT 0,
  cod_fee_pct DECIMAL DEFAULT 0,
  return_fee DECIMAL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4️⃣ جدول التجار (merchants)
```sql
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES ship_users(id) ON DELETE SET NULL,
  store_name VARCHAR NOT NULL,
  contact_name VARCHAR NOT NULL,
  phone VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  address TEXT,
  zone_id UUID REFERENCES zones(id),
  balance DECIMAL DEFAULT 0,
  pending_settlement DECIMAL DEFAULT 0,
  total_shipments INTEGER DEFAULT 0,
  delivery_rate DECIMAL DEFAULT 0,
  status VARCHAR DEFAULT 'pending',
  api_key VARCHAR UNIQUE,
  notes TEXT,
  bank_name VARCHAR,
  bank_account VARCHAR,
  commission_rate DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5️⃣ جدول المناديب (couriers)
```sql
CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES ship_users(id) ON DELETE SET NULL,
  name VARCHAR NOT NULL,
  phone VARCHAR NOT NULL,
  national_id VARCHAR,
  vehicle_type VARCHAR,
  vehicle_plate VARCHAR,
  zone_id UUID REFERENCES zones(id),
  status VARCHAR DEFAULT 'active',
  total_deliveries INTEGER DEFAULT 0,
  success_rate DECIMAL DEFAULT 0,
  total_collections DECIMAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 6️⃣ جدول الشحنات (shipments)
```sql
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number VARCHAR UNIQUE NOT NULL,
  merchant_id UUID REFERENCES merchants(id),
  courier_id UUID REFERENCES couriers(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES zones(id),
  recipient_name VARCHAR NOT NULL,
  recipient_phone VARCHAR NOT NULL,
  recipient_phone2 VARCHAR,
  recipient_address TEXT NOT NULL,
  recipient_notes TEXT,
  product_description TEXT,
  weight DECIMAL DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  is_fragile BOOLEAN DEFAULT false,
  payment_method VARCHAR DEFAULT 'cod',
  cod_amount DECIMAL DEFAULT 0,
  delivery_fee DECIMAL DEFAULT 0,
  cod_fee DECIMAL DEFAULT 0,
  return_fee DECIMAL DEFAULT 0,
  status VARCHAR DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  notes TEXT,
  import_batch_id UUID,
  assigned_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 7️⃣ جدول سجل الحالات (shipment_status_logs)
```sql
CREATE TABLE IF NOT EXISTS shipment_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  from_status VARCHAR,
  to_status VARCHAR NOT NULL,
  changed_by UUID REFERENCES ship_users(id),
  courier_id UUID REFERENCES couriers(id),
  notes TEXT,
  lat DECIMAL,
  lng DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 8️⃣ جدول المعاملات المالية (financial_transactions)
```sql
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR NOT NULL,
  amount DECIMAL NOT NULL,
  description TEXT,
  shipment_id UUID REFERENCES shipments(id),
  merchant_id UUID REFERENCES merchants(id),
  courier_id UUID REFERENCES couriers(id),
  status VARCHAR DEFAULT 'pending',
  reference_no VARCHAR UNIQUE,
  processed_by UUID REFERENCES ship_users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 9️⃣ جدول طلبات التسوية (settlement_requests)
```sql
CREATE TABLE IF NOT EXISTS settlement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  shipment_count INTEGER DEFAULT 0,
  status VARCHAR DEFAULT 'pending',
  notes TEXT,
  admin_notes TEXT,
  bank_name VARCHAR,
  bank_account VARCHAR,
  requested_by UUID REFERENCES ship_users(id),
  reviewed_by UUID REFERENCES ship_users(id),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 🔟 جدول الاستيراد (import_batches)
```sql
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id),
  file_name VARCHAR,
  total_rows INTEGER,
  success_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  errors JSONB,
  status VARCHAR DEFAULT 'processing',
  imported_by UUID REFERENCES ship_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1️⃣1️⃣ جدول تحصيلات المناديب (courier_collections)
```sql
CREATE TABLE IF NOT EXISTS courier_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES shipments(id),
  amount DECIMAL NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT now(),
  transferred_at TIMESTAMPTZ,
  is_transferred BOOLEAN DEFAULT false
);
```

---

## 🔐 Row Level Security (RLS) - سياسات الأمان

**تفعيل RLS على جميع الجداول:**

```sql
-- تفعيل RLS
ALTER TABLE ship_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- المدمرون (Admins) يرون الكل
CREATE POLICY admin_see_all ON shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ship_users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- التجار يرون شحناتهم فقط
CREATE POLICY merchant_see_own ON shipments
  FOR SELECT USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- المناديب يرون شحناتهم المسندة
CREATE POLICY courier_see_assigned ON shipments
  FOR SELECT USING (
    courier_id IN (
      SELECT id FROM couriers WHERE user_id = auth.uid()
    )
  );
```

---

## 🧪 بيانات التجريب (Demo Data)

للاختبار السريع، أضف بيانات تجريبية:

### 1. بيانات المستخدمين
```sql
INSERT INTO ship_users (full_name, email, role, is_active) VALUES
  ('مدير النظام', 'admin@shippro.eg', 'admin', true),
  ('أحمد التاجر', 'merchant@shippro.eg', 'merchant', true),
  ('محمود المندوب', 'driver@shippro.eg', 'driver', true);
```

### 2. بيانات المناطق
```sql
INSERT INTO zones (name, name_en, region, sort_order) VALUES
  ('القاهرة', 'Cairo', 'Greater Cairo', 1),
  ('الإسكندرية', 'Alexandria', 'Mediterranean', 2),
  ('الجيزة', 'Giza', 'Greater Cairo', 3),
  ('المنصورة', 'Mansoura', 'Nile Delta', 4);
```

### 3. بيانات التسعير
```sql
INSERT INTO pricing_rules (zone_id, weight_from, weight_to, base_price, extra_kg_price, cod_fee_pct, return_fee) 
SELECT id, 0, 1, 25, 5, 3, 15 FROM zones WHERE name = 'القاهرة';
```

---

## 🔗 متغيرات البيئة المطلوبة للتطبيق

**في ملف `.env.local` أو Vercel Dashboard:**

```bash
# Supabase
VITE_SUPABASE_URL=https://uyciwmoavtqmhazhkmmu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y2l3bW9hdnRxbWhhemhrbW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTI1NjIsImV4cCI6MjA5MjAyODU2Mn0.VE9VgRrBf_V-Sds1Yakukti-g7IuWe4tjR5bA44Cflw

# تطبيق
VITE_APP_NAME=ShipPro
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
```

---

## ✅ قائمة التحقق من الإعداد

- [ ] تم إنشاء مشروع Supabase
- [ ] تم إضافة جميع الجداول
- [ ] تم تفعيل RLS على الجداول الحساسة
- [ ] تم إضافة بيانات التجريب
- [ ] تم نسخ الـ URL والمفاتيح
- [ ] تم إضافة متغيرات البيئة في Vercel
- [ ] تم اختبار الاتصال بنجاح

---

## 🌍 الوصول إلى لوحة تحكم Supabase

**Dashboard:** https://app.supabase.com
**المشروع:** https://app.supabase.com/project/uyciwmoavtqmhazhkmmu

---

**Ship Pro v2.0** - جاهز للإنتاج ✨
