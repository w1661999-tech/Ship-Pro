/**
 * Admin Migration Endpoint
 * Secured by MCP_TOKEN (Bearer).
 *
 * Tries to execute raw SQL using a Postgres connection via Supabase pooler,
 * using service_role key as password (supported by Supavisor pooler).
 *
 * Usage:
 *   POST /api/admin/migrate
 *   Headers: Authorization: Bearer <MCP_TOKEN>
 *   Body: { "sql": "... raw SQL statements ..." }
 *        OR
 *        { "migrationFile": "20260423_enterprise_modules" }  // load from supabase/migrations/
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Client } from 'pg'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const MCP_TOKEN = process.env.MCP_TOKEN || ''

function projectRef(): string {
  // https://<ref>.supabase.co
  const m = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)
  return m ? m[1] : ''
}

async function runSql(sql: string): Promise<{ ok: boolean; error?: string; rows?: unknown }> {
  const ref = projectRef()
  if (!ref) return { ok: false, error: 'Invalid SUPABASE_URL' }

  // Supabase pooler connection (Supavisor) - session mode for DDL
  const hosts = [
    `aws-0-us-east-1.pooler.supabase.com`,
    `aws-0-eu-west-1.pooler.supabase.com`,
    `aws-0-ap-southeast-1.pooler.supabase.com`,
    `aws-0-us-west-1.pooler.supabase.com`,
  ]

  let lastError = ''

  for (const host of hosts) {
    const client = new Client({
      host,
      port: 5432,
      user: `postgres.${ref}`,
      password: SERVICE_ROLE,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    })

    try {
      await client.connect()
      const res = await client.query(sql)
      await client.end()
      return { ok: true, rows: res.rows }
    } catch (err) {
      lastError = (err as Error).message
      try { await client.end() } catch { /* ignore */ }
    }
  }

  return { ok: false, error: lastError || 'Could not connect to any pooler host' }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!MCP_TOKEN || auth !== MCP_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({ ok: false, error: 'Supabase env missing' })
  }

  let { sql, migrationFile } = (req.body || {}) as { sql?: string; migrationFile?: string }

  if (migrationFile) {
    try {
      const path = join(process.cwd(), 'supabase', 'migrations', `${migrationFile}.sql`)
      sql = readFileSync(path, 'utf8')
    } catch (e) {
      return res.status(404).json({ ok: false, error: `Migration file not found: ${migrationFile}` })
    }
  }

  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing sql or migrationFile' })
  }

  const result = await runSql(sql)

  if (result.ok) {
    return res.status(200).json({ ok: true, message: 'SQL executed successfully', rows: result.rows })
  } else {
    return res.status(500).json({ ok: false, error: result.error })
  }
}
