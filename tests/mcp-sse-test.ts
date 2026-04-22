/**
 * MCP Server SSE Integration Tests
 * اختبارات شاملة لخادم MCP مع دعم SSE والمصادقة
 */

const API_URL = 'http://localhost:3000/api/mcp'
const MCP_TOKEN = 'sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c'

interface MCPRequest {
  jsonrpc: string
  method: string
  params?: any
  id: number
}

interface MCPResponse {
  jsonrpc: string
  result?: any
  error?: any
  id?: number
}

// دالة مساعدة لإرسال طلبات JSON-RPC
async function callMCP(method: string, params?: any, id: number = 1): Promise<MCPResponse> {
  const request: MCPRequest = {
    jsonrpc: '2.0',
    method,
    params,
    id
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MCP_TOKEN}`
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`)
  }

  return response.json()
}

// دالة مساعدة لاختبار اتصال SSE
async function testSSEConnection(): Promise<boolean> {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MCP_TOKEN}`
      }
    })

    if (!response.ok) {
      console.error(`❌ SSE Connection Failed: ${response.status}`)
      return false
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('text/event-stream')) {
      console.error(`❌ Invalid Content-Type: ${contentType}`)
      return false
    }

    console.log('✅ SSE Connection Established')
    return true
  } catch (error) {
    console.error('❌ SSE Connection Error:', error)
    return false
  }
}

// اختبار المصادقة
async function testAuthentication() {
  console.log('\n📋 Testing Authentication...')

  try {
    const response = await callMCP('health_check')
    if (response.result?.status === 'ok') {
      console.log('✅ Authentication with valid token: PASSED')
    } else {
      console.log('❌ Authentication with valid token: FAILED')
    }
  } catch (error) {
    console.log('❌ Authentication with valid token: ERROR', error)
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'health_check',
        id: 1
      })
    })

    if (response.status === 401) {
      console.log('✅ Authentication rejection with invalid token: PASSED')
    } else {
      console.log('❌ Authentication rejection with invalid token: FAILED')
    }
  } catch (error) {
    console.log('❌ Authentication rejection test: ERROR', error)
  }
}

// اختبار الطرق الأساسية
async function testBasicMethods() {
  console.log('\n📋 Testing Basic Methods...')

  try {
    const response = await callMCP('initialize')
    if (response.result?.serverInfo?.name === 'Ship Pro MCP Server') {
      console.log('✅ initialize: PASSED')
    } else {
      console.log('❌ initialize: FAILED')
    }
  } catch (error) {
    console.log('❌ initialize: ERROR', error)
  }

  try {
    const response = await callMCP('health_check')
    if (response.result?.status === 'ok') {
      console.log('✅ health_check: PASSED')
    } else {
      console.log('❌ health_check: FAILED')
    }
  } catch (error) {
    console.log('❌ health_check: ERROR', error)
  }

  try {
    const response = await callMCP('resources/list')
    if (response.result?.resources && response.result.resources.length > 0) {
      console.log('✅ resources/list: PASSED')
    } else {
      console.log('❌ resources/list: FAILED')
    }
  } catch (error) {
    console.log('❌ resources/list: ERROR', error)
  }

  try {
    const response = await callMCP('tools/list')
    if (response.result?.tools && response.result.tools.length > 0) {
      console.log('✅ tools/list: PASSED')
    } else {
      console.log('❌ tools/list: FAILED')
    }
  } catch (error) {
    console.log('❌ tools/list: ERROR', error)
  }
}

// اختبار استدعاء الأدوات
async function testToolCalls() {
  console.log('\n📋 Testing Tool Calls...')

  try {
    const response = await callMCP('tools/call', {
      name: 'create_shipment',
      arguments: {
        merchant_id: 'merchant-123',
        recipient_name: 'أحمد محمد',
        recipient_address: 'القاهرة، مصر'
      }
    }, 2)

    if (response.result?.content && response.result.content.length > 0) {
      console.log('✅ create_shipment: PASSED')
    } else {
      console.log('❌ create_shipment: FAILED')
    }
  } catch (error) {
    console.log('❌ create_shipment: ERROR', error)
  }

  try {
    const response = await callMCP('tools/call', {
      name: 'calculate_shipping_cost',
      arguments: {
        weight: 2.5,
        zone_id: 'zone-cairo'
      }
    }, 3)

    if (response.result?.content && response.result.content.length > 0) {
      console.log('✅ calculate_shipping_cost: PASSED')
    } else {
      console.log('❌ calculate_shipping_cost: FAILED')
    }
  } catch (error) {
    console.log('❌ calculate_shipping_cost: ERROR', error)
  }
}

// اختبار معالجة الأخطاء
async function testErrorHandling() {
  console.log('\n📋 Testing Error Handling...')

  try {
    const response = await callMCP('invalid_method')
    if (response.error) {
      console.log('✅ Invalid method error handling: PASSED')
    } else {
      console.log('❌ Invalid method error handling: FAILED')
    }
  } catch (error) {
    console.log('❌ Invalid method error handling: ERROR', error)
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'health_check',
        id: 1
      })
    })

    if (response.status === 401) {
      console.log('✅ Missing authorization error handling: PASSED')
    } else {
      console.log('❌ Missing authorization error handling: FAILED')
    }
  } catch (error) {
    console.log('❌ Missing authorization error handling: ERROR', error)
  }
}

// تشغيل جميع الاختبارات
async function runAllTests() {
  console.log('🚀 Starting MCP Server SSE Tests...\n')

  console.log('📋 Testing SSE Connection...')
  const sseOk = await testSSEConnection()

  await testAuthentication()
  await testBasicMethods()
  await testToolCalls()
  await testErrorHandling()

  console.log('\n✅ All tests completed!\n')
}

// تشغيل الاختبارات
runAllTests().catch(console.error)
