# 🚀 Ship Pro - دليل الإصلاح السريع

## ❌ المشكلة الحالية
الموقع على Vercel يعرض **شاشة بيضاء فقط** عند فتح https://ship-pro-roan.vercel.app/

## ✅ الحل في 3 خطوات فقط

### الخطوة 1️⃣: الوصول إلى Vercel Dashboard
```
اذهب إلى: https://vercel.com/dashboard
اختر: Ship-Pro
```

### الخطوة 2️⃣: إضافة متغيرات البيئة
```
Settings → Environment Variables
```

أضف هذان المتغيران **بالضبط**:

| الاسم | القيمة |
|------|--------|
| `VITE_SUPABASE_URL` | `https://uyciwmoavtqmhazhkmmu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y2l3bW9hdnRxbWhhemhrbW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTI1NjIsImV4cCI6MjA5MjAyODU2Mn0.VE9VgRrBf_V-Sds1Yakukti-g7IuWe4tjR5bA44Cflw` |

### الخطوة 3️⃣: إعادة البناء والنشر
```
Deployments → اختر أحدث deployment
→ الثلاث نقاط (⋯) → Redeploy
→ انتظر 2-5 دقائق
```

---

## ✨ النتيجة المتوقعة
بعد الانتظار، افتح الموقع مجدداً:
- ✅ ستظهر صفحة تسجيل الدخول
- ✅ ستتمكن من الدخول بحسابات التجريب:
  - البريد: `admin@shippro.eg` | كلمة المرور: `Admin@123456`
  - البريد: `merchant@shippro.eg` | كلمة المرور: `Merchant@123456`
  - البريد: `driver@shippro.eg` | كلمة المرور: `Driver@123456`

---

## 📚 للمزيد من التفاصيل
انظر الملفات الشاملة:
- `VERCEL_FIX.md` - شرح مفصل لحل المشكلة
- `SUPABASE_SETUP.md` - إعداد قاعدة البيانات
- `COMPLETE_DEPLOYMENT.md` - دليل النشر الكامل

---

**Ship Pro v2.0** - نظام الشحن الاحترافي المتكامل ✨
