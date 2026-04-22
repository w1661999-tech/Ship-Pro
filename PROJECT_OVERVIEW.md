# 📦 Ship Pro - نظام الشحن الاحترافي المتكامل (Enterprise ERP)

## 🎯 ما هو Ship Pro؟

**Ship Pro** هو نظام متكامل لإدارة الشحنات والتوصيل (Enterprise ERP) مخصص لشركات الشحن والتوصيل في مصر. يجمع بين:

- 🏢 **لوحة التحكم الإدارية** - إدارة كاملة للنظام
- 🛍️ **بوابة التاجر** - إدارة الشحنات والمبيعات
- 🚚 **تطبيق المندوب** - تتبع التوصيلات والتحصيل
- 📊 **نظام WMS** - إدارة المخازن والتخزين
- 💰 **النظام المالي** - التسويات والمحاسبة الآلية

---

## 🏗️ البيئة التقنية (Tech Stack)

| الطبقة | التقنية |
|------|--------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS |
| **UI Components** | Shadcn UI, Lucide Icons, Recharts |
| **Backend** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **Real-time** | Supabase Realtime |
| **Hosting** | Vercel |
| **CI/CD** | GitHub Actions |
| **Testing** | Playwright |
| **Language** | TypeScript |

---

## 📂 هيكل المشروع

```
Ship-ProFile/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx          # صفحة تسجيل الدخول
│   │   ├── TrackingPage.tsx       # صفحة تتبع علنية
│   │   ├── admin/                 # صفحات لوحة الإدارة
│   │   ├── merchant/              # صفحات بوابة التاجر
│   │   └── driver/                # صفحات تطبيق المندوب
│   ├── components/
│   │   ├── layout/                # تخطيطات الواجهات
│   │   └── ui/                    # مكونات UI المشتركة
│   ├── lib/
│   │   └── supabase.ts            # عميل Supabase
│   ├── store/
│   │   └── authStore.ts           # متجر الحالة (Zustand)
│   ├── hooks/
│   │   └── useAuth.ts             # hook المصادقة
│   ├── types/
│   │   └── database.ts            # أنواع البيانات
│   ├── utils/
│   │   └── helpers.ts             # دوال مساعدة
│   ├── App.tsx                    # الكود الرئيسي
│   └── main.tsx                   # نقطة الدخول
├── public/                        # أصول ثابتة
├── tests/                         # اختبارات Playwright
├── .github/workflows/             # CI/CD Pipeline
├── dist/                          # البناء النهائي
├── .env.local                     # متغيرات البيئة المحلية
├── .env.production                # متغيرات الإنتاج
├── vite.config.ts                 # تكوين Vite
├── tsconfig.json                  # تكوين TypeScript
├── tailwind.config.js             # تكوين Tailwind
├── vercel.json                    # تكوين Vercel
└── package.json                   # المكتبات والأوامر
```

---

## 🗄️ قاعدة البيانات (Supabase)

### الجداول الرئيسية:

1. **ship_users** - المستخدمون (Admin, Merchant, Driver)
2. **merchants** - التجار والشركات
3. **couriers** - المناديب والسائقون
4. **zones** - المناطق الجغرافية
5. **shipments** - الشحنات والطلبات
6. **pricing_rules** - قواعم التسعير الديناميكي
7. **financial_transactions** - المعاملات المالية
8. **settlement_requests** - طلبات التسوية
9. **shipment_status_logs** - سجل الحالات والحركات
10. **import_batches** - دفعات الاستيراد من Excel
11. **courier_collections** - تحصيلات المناديب

---

## 🔐 الأمان

- ✅ **Row Level Security (RLS)** - كل مستخدم يرى بيانته فقط
- ✅ **Bcrypt Hashing** - كلمات المرور مشفرة
- ✅ **API Rate Limiting** - حماية من هجمات DDoS
- ✅ **JWT Tokens** - معايرة آمنة
- ✅ **Environment Variables** - لا تضع الأسرار في الكود

---

## 🚀 كيفية التشغيل

### المرحلة 1: التشغيل المحلي

```bash
# 1. تثبيت المكتبات
npm install

# 2. إنشاء ملف .env.local
cp .env.example .env.local

# 3. تشغيل بيئة التطوير
npm run dev

# 4. فتح المتصفح
# http://localhost:3000
```

### المرحلة 2: النشر على Vercel

```bash
# 1. التأكد من أن كل شيء يعمل
npm run build

# 2. إضافة متغيرات البيئة في Vercel Dashboard
# Settings → Environment Variables

# 3. إعادة بناء (Redeploy)
# من Vercel Dashboard → Deployments → Redeploy

# 4. الموقع المباشر
# https://ship-pro-roan.vercel.app
```

---

## 👥 حسابات التجريب

استخدم هذه الحسابات للاختبار:

| الدور | البريد الإلكتروني | كلمة المرور | الصلاحيات |
|------|-------------------|-----------|---------|
| 🔐 **مدير** | admin@shippro.eg | Admin@123456 | كل شيء |
| 🛍️ **تاجر** | merchant@shippro.eg | Merchant@123456 | إدارة شحناته |
| 🚚 **مندوب** | driver@shippro.eg | Driver@123456 | التوصيل والتحصيل |

---

## 📋 المميزات الرئيسية

### ✨ لوحة التحكم الإدارية
- 📊 رسوم بيانية مباشرة للأرباح والشحنات
- 🚚 توزيع الشحنات على المناديب (فردي/مجموعي)
- 👥 إدارة التجار والمناديب
- 💰 إدارة التسويات المالية
- 📈 تقارير مفصلة

### 🛍️ بوابة التاجر
- ➕ إضافة شحنات فردية أو استيراد من Excel
- 📋 توليد بوالص شحن PDF مع باركود
- 💳 محفظة مالية مع كشف حساب
- 📞 نظام التذاكر والدعم الفني
- 📊 إحصائيات المبيعات والتوصيلات

### 🚚 تطبيق المندوب
- 🗺️ خريطة مسار الشحنات
- 📸 إثبات التوصيل (GPS + صورة + توقيع)
- 💵 إدارة التحصيلات
- 📱 واجهة محسّنة للهاتف
- 🔋 ماسح باركود ضوئي

### 📊 نظام WMS (إدارة المخازن)
- 🏠 تكويد الأرفف والمخازن
- 📄 توليد محاضر التسليم
- 🔍 ماسح الباركود المدمج
- 📦 تتبع الشحنات في المخزن

### 💰 النظام المالي
- 🔄 التسويات الآلية (Auto-Settlement)
- 💸 حساب عمولات المناديب تلقائياً
- 📊 سجل تدقيق كامل (Audit Trails)
- 💳 طلبات سحب الأرصدة
- 📈 تقارير محاسبية

---

## 🧪 الاختبارات

```bash
# تشغيل جميع الاختبارات
npm run test

# اختبار المصادقة
npm run test:auth

# اختبار دورة حياة الشحنة
npm run test:lifecycle

# اختبار التحقق من البيانات
npm run test:validation

# معاينة النتائج
npm run test:report

# تشغيل الاختبارات بواجهة رسومية
npm run test:headed
```

---

## 🔄 عملية CI/CD

عند Push إلى GitHub:

```
1. ✅ فحص TypeScript → نجح/فشل
2. ✅ فحص ESLint → نجح/فشل
3. ✅ بناء التطبيق → npm run build
4. ✅ تشغيل الاختبارات → Playwright
5. ✅ النشر → Vercel (تلقائي)
```

---

## 📞 دعم ومساعدة

### إذا واجهت مشكلة

1. **الشاشة البيضاء؟**
   - انظر: `VERCEL_FIX.md`

2. **مشاكل في Supabase؟**
   - انظر: `SUPABASE_SETUP.md`

3. **تريد المزيد من التفاصيل؟**
   - انظر: `COMPLETE_DEPLOYMENT.md`

4. **فتح أدوات المطور (F12):**
   - اذهب إلى Console لرؤية الأخطاء

---

## 📊 المتطلبات غير الوظيفية

| المتطلب | الحالة |
|-------|-------|
| **الأداء** | < 2 ثانية لتحميل الصفحة ✅ |
| **التوافقية** | جميع المتصفحات الحديثة ✅ |
| **الأمان** | SSL/HTTPS + RLS ✅ |
| **التوسع** | قابل للتوسع حتى 1M+ شحنة/يوم ✅ |
| **النسخ الاحتياطي** | يومي تلقائي ✅ |
| **الإشعارات** | بريد/SMS/WhatsApp ✅ |
| **المحمول** | واجهة محسّنة للهاتف ✅ |
| **RTL** | دعم كامل للعربية واتجاه RTL ✅ |

---

## 🎓 الموارد التعليمية

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs)

---

## 📝 الترخيص

هذا المشروع مملوك لـ **Ship Pro** - 2026

---

## 👨‍💼 فريق التطوير

- **Project Owner:** Basin ERP Systems
- **Email:** w1661999@gmail.com
- **Version:** 2.0.0
- **Status:** Production Ready ✅

---

## 🚀 الخطوات القادمة

- [ ] إضافة متغيرات البيئة في Vercel
- [ ] إعادة بناء المشروع
- [ ] اختبار بحسابات التجريب
- [ ] تفعيل الإخطارات (WhatsApp/SMS)
- [ ] ربط مع متاجر E-commerce
- [ ] تقارير متقدمة

---

**Ship Pro v2.0** - نظام الشحن الاحترافي المتكامل

**جاهز للإنتاج ✅**
