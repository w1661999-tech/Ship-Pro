# 🚚 Ship Pro — نظام الشحن الاحترافي

> نظام إدارة شحنات متكامل مبني بـ React + TypeScript + Supabase

---

## 🌐 الروابط المباشرة

| الصفحة | الرابط |
|--------|--------|
| 🏠 الرئيسية | https://ship-pro-roan.vercel.app |
| 🔍 تتبع الشحنة | https://ship-pro-roan.vercel.app/track |
| 🔐 تسجيل الدخول | https://ship-pro-roan.vercel.app/login |
| 👑 لوحة الأدمن | https://ship-pro-roan.vercel.app/admin |
| 🏪 لوحة التاجر | https://ship-pro-roan.vercel.app/merchant |
| 🚗 لوحة المندوب | https://ship-pro-roan.vercel.app/driver |
| 📂 GitHub | https://github.com/w1661999-tech/Ship-Pro |

---

## ✅ حالة المشروع

| المؤشر | النتيجة |
|--------|---------|
| TypeScript Errors | **0 أخطاء** ✅ |
| E2E Tests | **8/8 ناجحة** ✅ |
| Production Build | **✅ نجح** |
| Vercel Deployment | **✅ مُنشور** |
| GitHub Push | **✅ محدَّث** |
| Supabase Connection | **✅ متصل** |

---

## 🎯 المميزات المُنجزة

### 🔒 نظام المصادقة والأدوار
- 3 أدوار: Admin / Merchant / Driver
- حماية المسارات (Route Guards)
- تسجيل دخول/خروج تلقائي مع Supabase Auth

### 👑 لوحة الأدمن
- إحصائيات حية: إجمالي الشحنات، نسبة التسليم، الإيرادات
- رسم بياني (7 أيام) + Pie Chart لتوزيع الحالات
- **[جديد v2.1]** جدول آخر المعاملات المالية (financial_transactions)
- إدارة الشحنات / التجار / المناديب / المالية / التسعير / الاستيراد

### 🏪 لوحة التاجر
- إضافة / استيراد شحنات (CSV)
- تتبع الرصيد ومعدل التسليم
- طباعة بوليصات الشحن (Waybills)

### 🚗 لوحة المندوب
- قائمة الشحنات المُعيَّنة
- تحديث الحالة (استلام، تسليم، إرجاع)

### 🔍 صفحة التتبع (عامة)
- البحث برقم التتبع أو URL مباشر
- **[جديد v2.1]** سجل تغييرات الحالة الكاملة (shipment_status_logs)
- معلومات المندوب والمنطقة وتفاصيل الشحنة
- مشاركة الرابط + نسخ رقم التتبع

---

## 🔑 بيانات الاختبار

| المستخدم | البريد | كلمة المرور | الدور |
|---------|-------|------------|-------|
| أحمد المدير | admin@shippro.eg | Admin@123456 | admin |
| محمد التاجر | merchant@shippro.eg | Merchant@123456 | merchant |
| علي السائق | driver@shippro.eg | Driver@123456 | driver |

---

## 🌍 متغيرات البيئة (Vercel)

```
VITE_SUPABASE_URL=https://uyciwmoavtqmhazhkmmu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
NEXT_PUBLIC_SUPABASE_URL=https://uyciwmoavtqmhazhkmmu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=[encrypted]
VITE_APP_NAME=ShipPro
VITE_APP_ENV=production
NODE_VERSION=20
```

---

## 🗄️ قاعدة البيانات (Supabase)

| الجدول | الوصف |
|--------|-------|
| `shipments` | الشحنات (42 شحنة حالياً) |
| `ship_users` | المستخدمون (admin/merchant/driver) |
| `merchants` | بيانات التجار + الأرصدة |
| `couriers` | المناديب |
| `zones` | المناطق الجغرافية |
| `pricing_rules` | قواعد التسعير |
| `shipment_status_logs` | سجل تغييرات الحالة ✨ |
| `financial_transactions` | المعاملات المالية ✨ |

---

## 🧪 نتائج الاختبارات

```
Running 8 tests using 1 worker

✅ [1/8] unauthenticated user cannot access /admin
✅ [2/8] merchant blocked from /admin
✅ [3/8] admin accesses dashboard successfully
✅ [4/8] admin login confirmed
✅ [5/8] merchant balance +960 EGP after delivery (1000 COD, 4% fee)
✅ [6/8] add-shipment page loads for merchant
✅ [7/8] form validation without phone
✅ [8/8] phone field marked required

8 passed (1.3m) ✅
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | TailwindCSS + Lucide Icons + Recharts |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Hosting | Vercel (Edge) |
| Testing | Playwright E2E |
| CI/CD | Vercel GitHub Integration + GitHub Actions |

---

## 🚀 النشر

```bash
# نشر محلي
npm install && npm run dev

# نشر على Vercel
vercel --prod --token=YOUR_TOKEN

# اختبارات E2E
npx playwright test tests/ --reporter=line
```

---

## 📝 ملاحظة: GitHub Actions

توجد ملفات CI workflow في المجلد `.github/workflows/` محلياً:
- `ci.yml` — TypeScript check + Build + E2E Tests
- `ci-cd.yml` — Pipeline كامل
- `pr-check.yml` — فحص Pull Requests

لرفعها على GitHub يلزم توكن بصلاحية `workflows`.
حالياً النشر يتم تلقائياً عبر **Vercel GitHub Integration** عند كل push على `main`.

---

*Ship Pro v2.1 — آخر تحديث: 21 أبريل 2026*
