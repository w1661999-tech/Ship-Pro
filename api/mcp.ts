/**
 * MCP (Model Context Protocol) Server with SSE Support
 * يوفر endpoint لربط GenSpark مع Ship Pro باستخدام SSE
 * 
 * الاستخدام:
 * GET /api/mcp (لإنشاء اتصال SSE)
 * POST /api/mcp (لإرسال الرسائل)
 * Headers: Authorization: Bearer YOUR_MCP_TOKEN
 */

import { VercelRequest, VercelResponse } from '@vercel/node'
import { generateMCPToken, verifyMCPToken, extractBearerToken, createErrorResponse, createSuccessResponse } from '../src/utils/mcp'

// المفتاح الافتراضي للمصادقة (يجب تعيينه في بيئة Vercel)
const MCP_TOKEN = process.env.MCP_TOKEN || 'sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c'

// نموذج البيانات المتاحة في الخادم
const CAPABILITIES = {
  resources: [
    { uri: 'ship-pro://shipments', name: 'الشحنات', mimeType: 'application/json', description: 'جميع الشحنات في النظام' },
    { uri: 'ship-pro://merchants', name: 'التجار', mimeType: 'application/json', description: 'معلومات التجار والحسابات' }
  ],
  tools: [
    {
      name: 'create_shipment',
      description: 'إنشاء شحنة جديدة في النظام',
      inputSchema: {
        type: 'object',
        properties: {
          merchant_id: { type: 'string' },
          recipient_name: { type: 'string' },
          recipient_phone: { type: 'string' },
          recipient_address: { type: 'string' },
          cod_amount: { type: 'number' }
        },
        required: ['merchant_id', 'recipient_name', 'recipient_address']
      }
    },
    {
      name: 'calculate_shipping_cost',
      description: 'حساب تكلفة الشحن بناءً على الوزن والمنطقة',
      inputSchema: {
        type: 'object',
        properties: {
          weight: { type: 'number' },
          zone_id: { type: 'string' }
        },
        required: ['weight', 'zone_id']
      }
    },
    {
      name: 'get_shipment_tracking',
      description: 'الحصول على معلومات تتبع الشحنة',
      inputSchema: {
        type: 'object',
        properties: {
          tracking_number: { type: 'string' }
        },
        required: ['tracking_number']
      }
    }
  ]
}

// معالج طلبات SSE (GET)
async function handleSSE(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  // إرسال حدث الاتصال الناجح (Endpoint Discovery)
  const endpointEvent = {
    event: 'endpoint',
    data: '/api/mcp'
  }
  res.write(`event: endpoint\ndata: /api/mcp\n\n`)

  // إرسال إشعار التهيئة
  const initialEvent = {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {}
  }
  res.write(`event: message\ndata: ${JSON.stringify(initialEvent)}\n\n`)

  // إبقاء الاتصال مفتوحاً ضمن حدود Vercel Serverless (60 ثانية كحد أقصى)
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      res.write(': heartbeat\n\n')
    }, 15000)

    req.on('close', () => {
      clearInterval(interval)
      resolve(null)
    })

    setTimeout(() => {
      clearInterval(interval)
      res.end()
      resolve(null)
    }, 55000)
  })
}

// معالج طلبات JSON-RPC (POST)
async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { method, params, id, jsonrpc = '2.0' } = req.body
  let result

  try {
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: CAPABILITIES,
          serverInfo: { 
            name: 'Ship Pro MCP Server', 
            version: '1.0.0',
            description: 'خادم MCP متكامل لنظام Ship Pro مع دعم SSE'
          }
        }
        break
      case 'resources/list':
        result = { resources: CAPABILITIES.resources }
        break
      case 'tools/list':
        result = { tools: CAPABILITIES.tools }
        break
      case 'tools/call':
        // محاكاة استدعاء الأداة (في الإنتاج يتم الربط مع Supabase)
        result = {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              success: true, 
              message: `تم تنفيذ الأداة ${params.name} بنجاح`,
              data: params.arguments 
            }) 
          }]
        }
        break
      case 'health_check':
        result = { status: 'ok', timestamp: new Date().toISOString() }
        break
      default:
        return res.status(400).json(createErrorResponse(`Method ${method} not found`, 'METHOD_NOT_FOUND'))
    }

    return res.status(200).json(createSuccessResponse(result, id))
  } catch (error: any) {
    return res.status(500).json(createErrorResponse(error.message, 'INTERNAL_ERROR'))
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // التحقق من المصادقة (Bearer Token)
  const authHeader = req.headers.authorization as string
  if (!verifyMCPToken(authHeader, MCP_TOKEN)) {
    return res.status(401).json(createErrorResponse('Unauthorized: Invalid or missing Bearer Token', 'UNAUTHORIZED'))
  }

  if (req.method === 'GET') {
    return handleSSE(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    return res.status(405).json(createErrorResponse('Method Not Allowed: Use GET for SSE or POST for JSON-RPC', 'METHOD_NOT_ALLOWED'))
  }
}
