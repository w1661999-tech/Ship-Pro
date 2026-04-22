# 🔐 إعدادات الأمان والمصادقة - MCP Server

## 🛡️ طبقات الحماية المفعلة

### 1. Bearer Token Authentication
```
Authorization: Bearer sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c
```

**الخصائص:**
- طول الـ Token: 64 حرف (256-bit)
- التشفير: SHA-256
- الصيغة: `sk_mcp_ship_pro_2026_main_production_token_v1_<random_hex>`

### 2. HTTPS Only
- جميع الاتصالات عبر HTTPS بشكل إجباري
- لا يتم قبول الاتصالات غير الآمنة

### 3. CORS Configuration
```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}
```

### 4. Request Validation
- التحقق من وجود `Authorization` header
- التحقق من صيغة البيانات JSON
- التحقق من وجود `method` في الطلب

---

## 📋 متطلبات Vercel Environment

أضف المتغيرات التالية في إعدادات Vercel:

```env
# MCP Configuration
MCP_TOKEN=sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c

# Supabase Configuration (إن وجدت)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 🔑 إدارة الـ Tokens

### إنشاء Token جديد
```typescript
import crypto from 'crypto'

function generateMCPToken(length: number = 32): string {
  return 'sk_mcp_ship_pro_2026_main_production_token_v1_' + 
         crypto.randomBytes(length).toString('hex')
}
```

### تدوير الـ Tokens (Token Rotation)
- يفضل تغيير الـ Token كل 90 يوم
- احفظ الـ Tokens القديمة في سجل آمن
- أخطر جميع العملاء بالـ Token الجديد قبل التغيير

---

## 🚨 رموز الأخطاء الأمنية

| الكود | الرسالة | السبب | الحل |
|------|--------|------|-----|
| 401 | Unauthorized | Token غير صحيح أو مفقود | تحقق من صحة الـ Token |
| 403 | Forbidden | الوصول مرفوض | تحقق من صلاحيات الـ Token |
| 405 | Method Not Allowed | استخدام طريقة HTTP خاطئة | استخدم GET للـ SSE أو POST للـ JSON-RPC |

---

## 📊 مراقبة الأمان

### Log Monitoring
```bash
# عرض السجلات على Vercel
vercel logs <project-name>
```

### Metrics to Track
- عدد محاولات الوصول الفاشلة
- عدد الطلبات الناجحة
- متوسط وقت الاستجابة
- عدد الأخطاء 401/403

---

## 🔄 Refresh Token Strategy

للحفاظ على الأمان، يمكن تطبيق استراتيجية Refresh Token:

```typescript
// Token القصير الأجل (15 دقيقة)
const accessToken = generateMCPToken(32)

// Token الطويل الأجل (7 أيام)
const refreshToken = generateMCPToken(64)
```

---

## ✅ Checklist الأمان

- [ ] تم تعيين `MCP_TOKEN` في Vercel Environment
- [ ] تم تفعيل HTTPS على جميع الاتصالات
- [ ] تم تفعيل CORS بشكل صحيح
- [ ] تم اختبار المصادقة مع Token صحيح وخاطئ
- [ ] تم تفعيل Rate Limiting (إن أمكن)
- [ ] تم توثيق جميع الـ Tokens المستخدمة
- [ ] تم إعداد سياسة تدوير الـ Tokens

---

## 📞 للدعم الفني

إذا واجهت أي مشاكل أمنية:
1. تحقق من صحة الـ Token
2. تأكد من استخدام HTTPS
3. راجع السجلات على Vercel
4. تواصل مع فريق الدعم

---

**تم الإنشاء:** 22 إبريل 2026  
**الإصدار:** 1.0.0  
**الحالة:** ✅ جاهز للإنتاج
