/**
 * Admin Migration Endpoint
 * Secured by MCP_TOKEN (Bearer).
 * Executes raw SQL using Supabase service role via a helper RPC.
 *
 * Usage:
 *   POST /api/admin/migrate
 *   Headers: Authorization: Bearer <MCP_TOKEN>
 *   Body: { "sql": "... raw SQL statements ..." }
 *
 * On first run, the helper RPC `ship_pro_exec_sql` is not installed yet.
 * The endpoint will return { bootstrap_required: true, bootstrap_sql } –
 * copy that SQL snippet and run it once in Supabase SQL editor.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const MCP_TOKEN = process.env.MCP_TOKEN || ''

const BOOTSTRAP_SQL = `
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

  const { sql, bootstrap } = (req.body || {}) as { sql?: string; bootstrap?: boolean }

  if (bootstrap) {
    return res.status(200).json({
      ok: true,
      message: 'Run this SQL once in the Supabase SQL editor, then retry migrations:',
      bootstrap_sql: BOOTSTRAP_SQL,
    })
  }

  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing sql' })
  }

  try {
    const result = await callRpc(sql)

    if (result.status === 404) {
      return res.status(412).json({
        ok: false,
        error: 'Helper RPC ship_pro_exec_sql not installed',
        bootstrap_required: true,
        bootstrap_sql: BOOTSTRAP_SQL,
      })
    }

    return res.status(result.status).json({ ok: result.status < 400, result: result.body })
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message })
  }
}
