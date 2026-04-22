# 🤖 MCP Server Documentation - Ship Pro

## نظرة عامة

خادم **Model Context Protocol (MCP)** متكامل لربط نظام Ship Pro مع منصات الذكاء الاصطناعي مثل **GenSpark**.

يوفر الخادم واجهة معيارية آمنة للوصول إلى:
- ✅ موارد النظام (Shipments, Merchants, Couriers)
- ✅ أدوات العمليات (Create, Update, Calculate)
- ✅ الاستعلامات والتحليلات
- ✅ التحديثات الفورية (Real-time)

---

## 🔗 الاتصال الأساسي

### الـ URL الأساسي

```
https://ship-pro-roan.vercel.app/api/mcp
```

### طريقة الطلب

```
POST /api/mcp
Content-Type: application/json
Authorization: Bearer YOUR_MCP_TOKEN
```

---

## 🔐 المصادقة (Authentication)

### الـ Token

```
sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c
```

### كيفية الاستخدام

```bash
curl -X POST https://ship-pro-roan.vercel.app/api/mcp \
  -H "Authorization: Bearer sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}'
```

### طرق الأمان

- ✅ Bearer Token Authentication
- ✅ HTTPS Only
- ✅ CORS Enabled
- ✅ Request Validation
- ✅ Rate Limiting (على Vercel)

---

## 📋 الطرق (Methods) المدعومة

### 1. `initialize`
تهيئة الاتصال وطلب معلومات الخادم

**الطلب:**
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1
}
```

**النتيجة:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "resources": ["shipments", "merchants", "couriers", "zones", "pricing_rules", "financial_transactions"],
      "tools": ["create_shipment", "update_shipment_status", "calculate_shipping_cost", ...],
      "prompts": ["shipment_summary", "daily_report", ...]
    },
    "serverInfo": {
      "name": "Ship Pro MCP Server",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

---

### 2. `resources/list`
الحصول على قائمة الموارد المتاحة

**الطلب:**
```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "id": 2
}
```

**النتيجة:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "resources": [
      {
        "uri": "ship-pro://shipments",
        "name": "الشحنات",
        "mimeType": "application/json",
        "description": "جميع الشحنات في النظام"
      },
      {
        "uri": "ship-pro://merchants",
        "name": "التجار",
        "mimeType": "application/json",
        "description": "معلومات التجار والحسابات"
      },
      ...
    ]
  },
  "id": 2
}
```

---

### 3. `tools/list`
الحصول على قائمة الأدوات المتاحة

**الطلب:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 3
}
```

**النتيجة:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "create_shipment",
        "description": "إنشاء شحنة جديدة في النظام",
        "inputSchema": { ... }
      },
      {
        "name": "calculate_shipping_cost",
        "description": "حساب تكلفة الشحن",
        "inputSchema": { ... }
      },
      ...
    ]
  },
  "id": 3
}
```

---

### 4. `tools/call`
استدعاء أداة معينة

**مثال - إنشاء شحنة:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_shipment",
    "arguments": {
      "merchant_id": "merchant-123",
      "recipient_name": "أحمد محمد",
      "recipient_phone": "01001234567",
      "recipient_address": "القاهرة، مصر",
      "cod_amount": 500
    }
  },
  "id": 4
}
```

**النتيجة:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\": true, \"shipment_id\": \"SHP-ABC123\", \"status\": \"pending\"}"
      }
    ]
  },
  "id": 4
}
```

---

### 5. `health_check`
التحقق من صحة الخادم

**الطلب:**
```json
{
  "jsonrpc": "2.0",
  "method": "health_check",
  "id": 5
}
```

**النتيجة:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "ok",
    "timestamp": "2026-04-22T22:06:44.000Z",
    "version": "1.0.0"
  },
  "id": 5
}
```

---

### 6. `server_info`
الحصول على معلومات الخادم

**الطلب:**
```json
{
  "jsonrpc": "2.0",
  "method": "server_info",
  "id": 6
}
```

**النتيجة:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "name": "Ship Pro MCP Server",
    "version": "1.0.0",
    "features": ["resources", "tools", "prompts", "real-time-updates"],
    "database": "Supabase PostgreSQL",
    "region": "EU (Frankfurt)"
  },
  "id": 6
}
```

---

## 🛠️ الأدوات المتاحة (Tools)

### 1. `create_shipment` - إنشاء شحنة
```json
{
  "name": "create_shipment",
  "description": "إنشاء شحنة جديدة",
  "parameters": {
    "merchant_id": "معرف التاجر (مطلوب)",
    "recipient_name": "اسم المستقبل (مطلوب)",
    "recipient_phone": "هاتف المستقبل",
    "recipient_address": "عنوان التسليم (مطلوب)",
    "cod_amount": "المبلغ المستحق الدفع",
    "weight": "وزن الطرد",
    "product_description": "وصف المنتج"
  }
}
```

### 2. `calculate_shipping_cost` - حساب التكلفة
```json
{
  "name": "calculate_shipping_cost",
  "description": "حساب تكلفة الشحن",
  "parameters": {
    "weight": "الوزن بـ كجم (مطلوب)",
    "zone_id": "معرف المنطقة (مطلوب)",
    "merchant_id": "معرف التاجر للتسعيرة الخاصة"
  }
}
```

### 3. `get_shipment_tracking` - تتبع الشحنة
```json
{
  "name": "get_shipment_tracking",
  "description": "الحصول على معلومات التتبع",
  "parameters": {
    "tracking_number": "رقم التتبع (مطلوب)"
  }
}
```

### 4. `update_shipment_status` - تحديث الحالة
```json
{
  "name": "update_shipment_status",
  "description": "تحديث حالة الشحنة",
  "parameters": {
    "shipment_id": "معرف الشحنة (مطلوب)",
    "status": "الحالة الجديدة (مطلوب)",
    "notes": "ملاحظات إضافية"
  }
}
```

### 5. `assign_courier` - إسناد مندوب
```json
{
  "name": "assign_courier",
  "description": "إسناد الشحنة إلى مندوب",
  "parameters": {
    "shipment_id": "معرف الشحنة (مطلوب)",
    "courier_id": "معرف المندوب (مطلوب)"
  }
}
```

### 6. `settle_merchant_balance` - تسوية الرصيد
```json
{
  "name": "settle_merchant_balance",
  "description": "تسوية الرصيد المالي للتاجر",
  "parameters": {
    "merchant_id": "معرف التاجر (مطلوب)",
    "amount": "المبلغ المراد تسويته (مطلوب)"
  }
}
```

---

## 🔌 أمثلة كاملة

### مثال 1: اختبار الاتصال
```bash
curl -X POST https://ship-pro-roan.vercel.app/api/mcp \
  -H "Authorization: Bearer sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "health_check",
    "id": 1
  }'
```

### مثال 2: إنشاء شحنة
```bash
curl -X POST https://ship-pro-roan.vercel.app/api/mcp \
  -H "Authorization: Bearer sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_shipment",
      "arguments": {
        "merchant_id": "merchant-123",
        "recipient_name": "أحمد محمد",
        "recipient_address": "القاهرة، مصر",
        "cod_amount": 500
      }
    },
    "id": 2
  }'
```

### مثال 3: حساب التكلفة
```bash
curl -X POST https://ship-pro-roan.vercel.app/api/mcp \
  -H "Authorization: Bearer sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "calculate_shipping_cost",
      "arguments": {
        "weight": 2.5,
        "zone_id": "zone-cairo"
      }
    },
    "id": 3
  }'
```

---

## ⚠️ رموز الأخطاء

| الكود | الرسالة | الحل |
|------|--------|-----|
| 400 | Invalid Request | تحقق من صيغة JSON والـ method |
| 401 | Unauthorized | تحقق من صحة الـ Token |
| 405 | Method Not Allowed | استخدم POST فقط |
| 500 | Internal Server Error | تواصل مع الدعم |

---

## 🔄 التكامل مع GenSpark

### الخطوات:

1. **نسخ الـ URL:**
   ```
   https://ship-pro-roan.vercel.app/api/mcp
   ```

2. **نسخ الـ Token:**
   ```
   sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c
   ```

3. **في GenSpark، أضف:**
   - **Provider:** Custom MCP
   - **URL:** (الـ URL أعلاه)
   - **Authorization:** Bearer (الـ Token أعلاه)
   - **Protocol:** JSON-RPC 2.0

4. **اختبر الاتصال:** `health_check`

5. **ابدأ الاستخدام!**

---

## 📊 الحالة الحالية

```
✅ خادم MCP: متاح
✅ SSE Support: مفعّل
✅ Authentication: Bearer Token
✅ Database: Supabase PostgreSQL
✅ Region: Vercel (Global)
✅ Status: Production Ready
```

---

## 🚀 التطوير المستقبلي

- [ ] دعم WebSockets للتحديثات الفورية
- [ ] Caching للأداء الأفضل
- [ ] Advanced Analytics
- [ ] Multiple Token Management
- [ ] Rate Limiting Configuration

---

**تم الإنشاء:** 22 إبريل 2026  
**الإصدار:** 1.0.0  
**الحالة:** ✅ جاهز للإنتاج
