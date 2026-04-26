/**
 * Admin Migration Endpoint — Ship Pro
 *
 * Endpoints:
 *   GET  /api/admin/migrate                   → schema state (public, read-only)
 *   POST /api/admin/migrate (with dbPassword) → run SQL via direct pg pooler connection
 *   POST /api/admin/migrate (without)         → run SQL via ship_pro_exec_sql RPC (needs bootstrap)
 *
 * The "with dbPassword" mode is the most useful for first-time setup.
 * Admin pastes their Supabase DB password (from Settings > Database) once,
 * the endpoint connects via the Supavisor session pooler and runs the migration.
 * The password is never stored.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Client } from 'pg'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const MCP_TOKEN = process.env.MCP_TOKEN || ''

const BOOTSTRAP_SQL = `
-- Ship Pro bootstrap: install DDL runner (run once in Supabase SQL editor)
create or replace function public.ship_pro_exec_sql(query text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  execute query;
  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$$;

revoke all on function public.ship_pro_exec_sql(text) from public;
grant execute on function public.ship_pro_exec_sql(text) to service_role;
`.trim()

function projectRef(): string {
  const m = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)
  return m ? m[1] : ''
}

async function callRpc(sql: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ship_pro_exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  let body: unknown = text
  try { body = JSON.parse(text) } catch { /* keep as text */ }
  return { status: res.status, body }
}

async function checkTableExists(table: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  })
  return res.status === 200
}

async function inspectSchema() {
  const expected = ['tickets', 'warehouses', 'notifications', 'audit_logs', 'integration_webhooks']
  const status: Record<string, boolean> = {}
  for (const t of expected) {
    status[t] = await checkTableExists(t)
  }
  const allPresent = Object.values(status).every(Boolean)
  const nonePresent = Object.values(status).every(v => !v)

  const bootstrap = await callRpc('select 1')
  const bootstrapInstalled = bootstrap.status !== 404

  return {
    enterprise_migration_applied: allPresent,
    partially_applied: !allPresent && !nonePresent,
    tables: status,
    bootstrap_installed: bootstrapInstalled,
  }
}

async function runWithPassword(sql: string, dbPassword: string): Promise<{ ok: boolean; error?: string }> {
  const ref = projectRef()
  if (!ref) return { ok: false, error: 'Invalid SUPABASE_URL' }

  const hosts = [
    'aws-0-eu-west-1.pooler.supabase.com',
    'aws-0-eu-central-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-us-east-2.pooler.supabase.com',
    'aws-0-us-west-1.pooler.supabase.com',
    'aws-0-ap-southeast-1.pooler.supabase.com',
    'aws-0-ap-southeast-2.pooler.supabase.com',
    'aws-0-ap-south-1.pooler.supabase.com',
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-0-ap-northeast-1.pooler.supabase.com',
  ]

  let lastError = ''

  for (const host of hosts) {
    const client = new Client({
      host,
      port: 5432,
      user: `postgres.${ref}`,
      password: dbPassword,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
      query_timeout: 60000,
      statement_timeout: 60000,
    })

    try {
      await client.connect()
      await client.query(sql)
      await client.end()
      return { ok: true }
    } catch (err) {
      lastError = (err as Error).message
      try { await client.end() } catch { /* ignore */ }
      if (lastError.toLowerCase().includes('password authentication failed') ||
          lastError.toLowerCase().includes('tenant or user not found')) {
        return { ok: false, error: lastError }
      }
    }
  }

  return { ok: false, error: lastError || 'Could not connect to any pooler region' }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(204).end()
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({ ok: false, error: 'Supabase env missing' })
  }

  if (req.method === 'GET') {
    try {
      const state = await inspectSchema()
      return res.status(200).json({
        ok: true,
        ...state,
        bootstrap_sql: state.bootstrap_installed ? null : BOOTSTRAP_SQL,
        dashboard_sql_editor: `https://supabase.com/dashboard/project/${projectRef()}/sql/new`,
        database_settings: `https://supabase.com/dashboard/project/${projectRef()}/settings/database`,
      })
    } catch (err) {
      return res.status(500).json({ ok: false, error: (err as Error).message })
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!MCP_TOKEN || auth !== MCP_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  const { sql: providedSql, migrationFile, bootstrap, dbPassword } = (req.body || {}) as {
    sql?: string; migrationFile?: string; bootstrap?: boolean; dbPassword?: string
  }

  if (bootstrap) {
    return res.status(200).json({ ok: true, bootstrap_sql: BOOTSTRAP_SQL })
  }

  let sql = providedSql
  if (migrationFile) {
    try {
      const path = join(process.cwd(), 'supabase', 'migrations', `${migrationFile}.sql`)
      sql = readFileSync(path, 'utf8')
    } catch {
      return res.status(404).json({ ok: false, error: `Migration file not found: ${migrationFile}` })
    }
  }

  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing sql or migrationFile' })
  }

  if (dbPassword && typeof dbPassword === 'string' && dbPassword.length > 0) {
    const result = await runWithPassword(sql, dbPassword)
    if (result.ok) {
      return res.status(200).json({ ok: true, message: 'Migration applied successfully', via: 'direct-pg' })
    }
    return res.status(500).json({ ok: false, error: result.error, via: 'direct-pg' })
  }

  try {
    const result = await callRpc(sql)
    if (result.status === 404) {
      return res.status(412).json({
        ok: false,
        error: 'Helper RPC not installed. Either run bootstrap_sql once in Supabase SQL editor, or POST with dbPassword.',
        bootstrap_required: true,
        bootstrap_sql: BOOTSTRAP_SQL,
      })
    }
    return res.status(result.status).json({ ok: result.status < 400, result: result.body, via: 'rpc' })
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message })
  }
}
