/**
 * Admin Migration Endpoint — Ship Pro
 *
 * Provides:
 *   GET  /api/admin/migrate            → inspect schema state + bootstrap SQL
 *   POST /api/admin/migrate            → run SQL via ship_pro_exec_sql RPC (requires bootstrap)
 *
 * Bootstrap flow:
 *   1. Admin visits GET endpoint → sees `bootstrap_required: true` and the SQL to copy
 *   2. Admin pastes bootstrap SQL into Supabase SQL Editor and clicks Run
 *   3. Admin POSTs { migrationFile: "20260423_enterprise_modules" } → endpoint loads and runs it
 *
 * Security: all mutations require MCP_TOKEN bearer.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const MCP_TOKEN = process.env.MCP_TOKEN || ''

const BOOTSTRAP_SQL = `
-- === Ship Pro bootstrap: install DDL runner (run once in Supabase SQL editor) ===
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
  // Check if migration 20260423_enterprise_modules has been applied by looking for key tables
  const expected = ['tickets', 'warehouses', 'notifications', 'audit_logs', 'integration_webhooks']
  const status: Record<string, boolean> = {}
  for (const t of expected) {
    status[t] = await checkTableExists(t)
  }
  const allPresent = Object.values(status).every(Boolean)
  const nonePresent = Object.values(status).every(v => !v)

  // Check if bootstrap RPC is installed
  const bootstrap = await callRpc('select 1')
  const bootstrapInstalled = bootstrap.status !== 404

  return {
    enterprise_migration_applied: allPresent,
    partially_applied: !allPresent && !nonePresent,
    tables: status,
    bootstrap_installed: bootstrapInstalled,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(204).end()
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({ ok: false, error: 'Supabase env missing' })
  }

  // GET = inspect state (no auth required for read-only status)
  if (req.method === 'GET') {
    try {
      const state = await inspectSchema()
      return res.status(200).json({
        ok: true,
        ...state,
        bootstrap_sql: state.bootstrap_installed ? null : BOOTSTRAP_SQL,
        dashboard_sql_editor: `https://supabase.com/dashboard/project/${SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1] || ''}/sql/new`,
      })
    } catch (err) {
      return res.status(500).json({ ok: false, error: (err as Error).message })
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  // POST requires auth
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!MCP_TOKEN || auth !== MCP_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  let { sql, migrationFile, bootstrap } = (req.body || {}) as { sql?: string; migrationFile?: string; bootstrap?: boolean }

  if (bootstrap) {
    return res.status(200).json({
      ok: true,
      message: 'Run this SQL once in the Supabase SQL editor:',
      bootstrap_sql: BOOTSTRAP_SQL,
    })
  }

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

  try {
    const result = await callRpc(sql)

    if (result.status === 404) {
      return res.status(412).json({
        ok: false,
        error: 'Helper RPC ship_pro_exec_sql not installed — run bootstrap first',
        bootstrap_required: true,
        bootstrap_sql: BOOTSTRAP_SQL,
      })
    }

    return res.status(result.status).json({ ok: result.status < 400, result: result.body })
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message })
  }
}
