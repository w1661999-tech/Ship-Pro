# Ship Pro — Applying Enterprise Migration

The schema in `20260423_enterprise_modules.sql` must be applied to the Supabase project once.

## Option A — Supabase Dashboard (recommended, one-click)

1. Open https://supabase.com/dashboard/project/uyciwmoavtqmhazhkmmu/sql/new
2. Paste the entire contents of `20260423_enterprise_modules.sql`
3. Click **Run**

The tables, enums, RLS policies, and realtime publication will be installed in one shot.

## Option B — Via /api/admin/migrate endpoint (programmatic)

1. First install the helper once (Supabase SQL editor):

```sql
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
```

2. Then apply the migration via HTTP:

```bash
curl -X POST https://ship-pro-roan.vercel.app/api/admin/migrate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -d @<(jq -Rs '{sql: .}' < supabase/migrations/20260423_enterprise_modules.sql)
```

## What gets installed

11 new tables, 6 enums, 20+ RLS policies, realtime publication:
- `tickets`, `ticket_messages` (support system)
- `warehouses`, `warehouse_shelves`, `shipment_shelf_assignments` (WMS)
- `manifests`, `manifest_items` (courier handover PDF)
- `notifications` (realtime bell)
- `audit_logs` (forensic trail)
- `integration_webhooks` (Shopify/Salla/Zid/WooCommerce)
- `pod_artifacts` (proof of delivery: photo/signature/GPS)
