# 🚀 دليل البدء السريع لربط GenSpark (MCP + SSE)

لقد تم تحديث خادم MCP لدعم بروتوكول **SSE (Server-Sent Events)** والمصادقة الآمنة كما هو مطلوب لمنصة **GenSpark**.

## 🔗 بيانات الاتصال النهائية

| الحقل | القيمة |
| :--- | :--- |
| **رابط الـ API المباشر** | `https://ship-pro-roan.vercel.app/api/mcp` |
| **نوع البروتوكول** | `MCP (Model Context Protocol)` |
| **طريقة النقل** | `SSE (Server-Sent Events)` |
| **رمز الحماية (Token)** | `sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c` |
| **طريقة المصادقة** | `Authorization: Bearer <TOKEN>` |

---

## 🛠️ خطوات الربط في GenSpark

1. انتقل إلى إعدادات **AI Integrations** في منصة GenSpark.
2. اختر **Add Custom MCP Server**.
3. أدخل البيانات التالية:
   - **Name:** `Ship Pro MCP`
   - **Transport Type:** `SSE`
   - **URL:** `https://ship-pro-roan.vercel.app/api/mcp`
   - **Authorization Header:** `Bearer sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c`
4. اضغط على **Connect** أو **Test Connection**.
5. ستظهر لك قائمة بالأدوات المتاحة مثل `create_shipment` و `calculate_shipping_cost`.

---

## ✅ الأدوات المتاحة للاستخدام فوراً

- **`create_shipment`**: لإنشاء شحنات جديدة مباشرة من المحادثة.
- **`calculate_shipping_cost`**: لحساب تكاليف الشحن بناءً على الوزن والمنطقة.
- **`get_shipment_tracking`**: لتتبع حالة الشحنات الحالية.

---

## ⚠️ ملاحظات أمنية
- تم تفعيل حماية **Bearer Token** لضمان عدم وصول أي شخص غير مصرح له للبيانات.
- الخادم يدعم **CORS** للسماح بالاتصال من نطاق GenSpark.
- يفضل تحديث الـ Token بشكل دوري من خلال ملف `.env` على Vercel.

**تم التحديث بنجاح وجاهز للاستخدام الآن!** 🚀
