# 🚀 Ship Pro — دليل النشر الكامل

## النشر على Cloudflare Pages (مُوصى به)

### الطريقة 1: النشر اليدوي عبر Dashboard

1. **افتح** https://dash.cloudflare.com → Pages → Create a project
2. **اختر** "Connect to Git" وربط GitHub repo
3. **إعدادات البناء**:
   ```
   Framework preset: None
   Build command:    npm run build
   Build output:     dist
   Root directory:   /
   Node.js version:  20
   ```
4. **متغيرات البيئة** (Environment Variables) → أضف:
   ```
   VITE_SUPABASE_URL      = https://uyciwmoavtqmhazhkmmu.supabase.co
   VITE_SUPABASE_ANON_KEY = [مفتاحك من Supabase Dashboard]
   ```
5. **انقر** "Save and Deploy"

---

### الطريقة 2: Wrangler CLI

```bash
# تثبيت wrangler
npm install -g wrangler

# تسجيل الدخول
wrangler login

# إنشاء المشروع (مرة واحدة)
wrangler pages project create ship-pro --production-branch main

# نشر
npm run build
wrangler pages deploy dist --project-name ship-pro
```

---

### الطريقة 3: GitHub Actions (تلقائي)

ملف `.github/workflows/ci-cd.yml` مُجهَّز بالكامل.

**أضف هذه الـ Secrets في GitHub** (Settings → Secrets → Actions):
```
CLOUDFLARE_API_TOKEN   = [API token من Cloudflare Dashboard]
CLOUDFLARE_ACCOUNT_ID  = [Account ID من Cloudflare Dashboard]
```

كل push لـ `main` → يُشغَّل البناء والاختبار والنشر تلقائياً ✅

---

## النشر على Vercel

```bash
# تثبيت Vercel CLI
npm install -g vercel

# نشر أول مرة
vercel

# نشر للإنتاج
vercel --prod
```

**أو عبر Dashboard**:
1. افتح https://vercel.com/new
2. Import GitHub repo
3. Framework: Vite
4. Build: `npm run build` | Output: `dist`
5. أضف Environment Variables نفسها

---

## متغيرات البيئة المطلوبة

| المتغير | الوصف | أين تجده |
|---------|-------|----------|
| `VITE_SUPABASE_URL` | رابط Supabase | Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | المفتاح العام | Project Settings → API |

> **ملاحظة**: هذه المتغيرات موجودة في `src/lib/supabase.ts` وتعمل حالياً مع المشروع التجريبي.

---

## فحص ما بعد النشر

```bash
# تحقق من الصفحة الرئيسية
curl -I https://ship-pro.pages.dev

# تحقق من التوجيه
curl -I https://ship-pro.pages.dev/track
curl -I https://ship-pro.pages.dev/admin

# تحقق من الـ headers
curl -I https://ship-pro.pages.dev/assets/js/vendor-react-*.js
# يجب أن يظهر: Cache-Control: public, max-age=31536000, immutable
```

---

## CI/CD Pipeline

```
Push to main branch
      ↓
GitHub Actions triggers
      ↓
┌─────────────────────────┐
│  Job 1: Quality Check   │
│  - TypeScript (0 errors)│
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Job 2: Build           │
│  - npm run build        │
│  - Upload dist artifact │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Job 3: E2E Tests       │
│  - Playwright 8/8 tests │
│  - Auth protection      │
│  - Form validation      │
│  - Lifecycle & finance  │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Job 4: Deploy          │
│  - Cloudflare Pages     │
│  - Live URL generated   │
└─────────────────────────┘
```

---

## Supabase RLS (Row Level Security)

تأكد من تفعيل الـ RLS على جميع الجداول في Production:

```sql
-- مثال: التجار يرون شحناتهم فقط
CREATE POLICY "merchant_own_shipments" ON shipments
  FOR ALL USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );
```

---

**Ship Pro v2.0** — جاهز للإنتاج ✅
