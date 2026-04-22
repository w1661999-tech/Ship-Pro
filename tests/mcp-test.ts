/**
 * اختبار MCP Server
 * 
 * الاستخدام:
 * npx ts-node tests/mcp-test.ts
 */

const MCP_URL = 'http://localhost:3000/api/mcp'
const MCP_TOKEN = 'sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c'

interface MCPRequest {
  jsonrpc: string
  method: string
  params?: any
  id: number
}

async function callMCP(request: MCPRequest) {
  console.log(`\n📤 الطلب: ${request.method}`)
  console.log(JSON.stringify(request, null, 2))

  try {
    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MCP_TOKEN}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      console.error(`❌ خطأ HTTP: ${response.status}`)
      return
    }

    const data = await response.json()
    console.log(`\n📥 النتيجة:`)
    console.log(JSON.stringify(data, null, 2))
    return data
  } catch (error: any) {
    console.error(`❌ خطأ: ${error.message}`)
  }
}

async function runTests() {
  console.log('=== اختبار MCP Server ===\n')

  // اختبار 1: التهيئة
  console.log('\n🧪 اختبار 1: التهيئة')
  await callMCP({
    jsonrpc: '2.0',
    method: 'initialize',
    id: 1
  })

  // اختبار 2: قائمة الموارد
  console.log('\n\n🧪 اختبار 2: قائمة الموارد')
  await callMCP({
    jsonrpc: '2.0',
    method: 'resources/list',
    id: 2
  })

  // اختبار 3: قائمة الأدوات
  console.log('\n\n🧪 اختبار 3: قائمة الأدوات')
  await callMCP({
    jsonrpc: '2.0',
    method: 'tools/list',
    id: 3
  })

  // اختبار 4: فحص الصحة
  console.log('\n\n🧪 اختبار 4: فحص الصحة')
  await callMCP({
    jsonrpc: '2.0',
    method: 'health_check',
    id: 4
  })

  // اختبار 5: معلومات الخادم
  console.log('\n\n🧪 اختبار 5: معلومات الخادم')
  await callMCP({
    jsonrpc: '2.0',
    method: 'server_info',
    id: 5
  })

  // اختبار 6: إنشاء شحنة
  console.log('\n\n🧪 اختبار 6: إنشاء شحنة')
  await callMCP({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'create_shipment',
      arguments: {
        merchant_id: 'merchant-123',
        recipient_name: 'أحمد محمد',
        recipient_phone: '01001234567',
        recipient_address: 'القاهرة، مصر',
        cod_amount: 500
      }
    },
    id: 6
  })

  // اختبار 7: حساب التكلفة
  console.log('\n\n🧪 اختبار 7: حساب التكلفة')
  await callMCP({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'calculate_shipping_cost',
      arguments: {
        weight: 2.5,
        zone_id: 'cairo'
      }
    },
    id: 7
  })

  console.log('\n\n✅ انتهت جميع الاختبارات!')
}

runTests()
