import crypto from 'crypto'

// إنشاء token آمن
export function generateMCPToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

// التحقق من Token في request
export function verifyMCPToken(bearerToken: string, validToken: string): boolean {
  if (!bearerToken) return false
  const token = bearerToken.replace('Bearer ', '')
  return token === validToken
}

// الحصول على Bearer token من headers
export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader) return ''
  const parts = authHeader.split(' ')
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1]
  }
  return ''
}

// إنشاء رسالة خطأ
export function createErrorResponse(message: string, code: string = 'ERROR') {
  return {
    jsonrpc: '2.0',
    error: {
      code: -1,
      message,
      data: { code }
    }
  }
}

// إنشاء رسالة نجاح
export function createSuccessResponse(result: any, id?: string | number) {
  return {
    jsonrpc: '2.0',
    result,
    id
  }
}
