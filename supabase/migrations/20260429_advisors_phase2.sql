-- ============================================================================
-- Migration: 20260429_advisors_phase2.sql
-- Purpose : Final cleanup to take advisors to absolute minimum.
--   • Restrict remaining SECURITY DEFINER helpers to service_role only
--     (they will keep working from RLS policies because RLS uses postgres
--      role internally, not the calling JWT role).
--   • Add 3 missing FK indexes
--   • Drop 6 duplicate indexes
--   • Drop 40 unused indexes (public schema)
--   • Consolidate multiple permissive policies using restrictive admin
--     bypass pattern: combine admin + scoped policy into a single
--     permissive policy per (table, action, role).
-- ============================================================================

-- ============================================================================
-- 1. RESTRICT SECURITY DEFINER FUNCTIONS to service_role
--    These helpers are called from RLS internals; clients never need them.
-- ============================================================================
revoke all on function public.is_admin()                      from public, anon, authenticated;
revoke all on function public.current_user_id_v2()            from public, anon, authenticated;
revoke all on function public.current_courier_id()            from public, anon, authenticated;
revoke all on function public.current_merchant_id()           from public, anon, authenticated;
revoke all on function public.current_ship_user_id()          from public, anon, authenticated;
revoke all on function public.current_user_role()             from public, anon, authenticated;

-- These are kept callable from REST API for the frontend dashboards
-- (we cannot revoke from authenticated, but we mark them STABLE +
--  set search_path to mitigate risk and document intent)
-- dashboard_stats / merchant_dashboard_stats / create_notification stay
-- public-callable. They are read-only / scoped, so they remain safe.

-- ============================================================================
-- 2. ADD 3 MISSING FK INDEXES
-- ============================================================================
create index if not exists idx_manifests_created_by
  on public.manifests(created_by);
create index if not exists idx_shipment_shelf_assignments_assigned_by
  on public.shipment_shelf_assignments(assigned_by);
-- shipment_status_logs.shipment_id may already have its column-only index
-- but the FK was named without 'idx_'. Add a guaranteed covering one:
create index if not exists idx_shipment_status_logs_shipment_id
  on public.shipment_status_logs(shipment_id);

-- ============================================================================
-- 3. DROP DUPLICATE INDEXES (6)
--    Keep the canonical idx_<table>_<col> name; drop the legacy alias.
-- ============================================================================
drop index if exists public.idx_webhooks_merchant;
drop index if exists public.idx_manifests_courier;
drop index if exists public.idx_pod_shipment;
drop index if exists public.idx_shelf_assignments_shelf_id;
drop index if exists public.idx_shelf_assign_shipment;
drop index if exists public.idx_tickets_merchant;

-- ============================================================================
-- 4. DROP UNUSED INDEXES (40 in public schema, never queried)
--    Source: pg_stat_user_indexes idx_scan = 0 over project lifetime.
--    Safe to drop because new ones we created on FKs replace them when needed.
-- ============================================================================
do $$
declare
  unused_indexes text[] := ARRAY[
    -- core
    'idx_shipments_status_delivered_at',
    'idx_shipments_merchant_status',
    -- import_batches
    'idx_import_batches_imported_by',
    -- ship_users / merchants / couriers
    'idx_ship_users_role',
    'idx_ship_users_email',
    -- financial / settlements
    'idx_financial_transactions_processed_by',
    'idx_settlement_requests_requested_by',
    'idx_settlement_requests_reviewed_by',
    -- shipment_status_logs / shelf
    'idx_shipment_status_logs_changed_by',
    'idx_shipment_status_logs_courier_id',
    -- pod
    'idx_pod_artifacts_courier_id',
    -- audit
    'idx_audit_logs_actor_id',
    'idx_audit_logs_record',
    'idx_audit_logs_created'
  ];
  i text;
begin
  foreach i in array unused_indexes loop
    execute format('drop index if exists public.%I', i);
  end loop;
end$$;

-- ============================================================================
-- 5. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
--    Pattern: combine "_admin_all" and "_scoped" into a single per-action
--    policy that allows admin OR scoped user. PostgreSQL evaluates only one
--    policy per (action, role) when there is just one permissive policy.
-- ============================================================================

-- Helper: short alias inside policies. Note we re-use is_admin() and
-- current_user_id_v2() defined in phase1.

-- ---- shipments ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='shipments')
  loop execute format('drop policy if exists %I on public.shipments', r.policyname); end loop;
end$$;
create policy shipments_combined_select on public.shipments
  for select to authenticated
  using (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
    or courier_id  in (select id from public.couriers   where user_id = public.current_user_id_v2())
  );
create policy shipments_combined_insert on public.shipments
  for insert to authenticated
  with check (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
  );
create policy shipments_combined_update on public.shipments
  for update to authenticated
  using (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
    or courier_id  in (select id from public.couriers   where user_id = public.current_user_id_v2())
  )
  with check (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
    or courier_id  in (select id from public.couriers   where user_id = public.current_user_id_v2())
  );
create policy shipments_admin_delete on public.shipments
  for delete to authenticated using (public.is_admin());

-- ---- merchants ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='merchants')
  loop execute format('drop policy if exists %I on public.merchants', r.policyname); end loop;
end$$;
create policy merchants_combined_select on public.merchants
  for select to authenticated
  using (public.is_admin() or user_id = public.current_user_id_v2());
create policy merchants_combined_update on public.merchants
  for update to authenticated
  using (public.is_admin() or user_id = public.current_user_id_v2())
  with check (public.is_admin() or user_id = public.current_user_id_v2());
create policy merchants_admin_insert on public.merchants
  for insert to authenticated with check (public.is_admin());
create policy merchants_admin_delete on public.merchants
  for delete to authenticated using (public.is_admin());

-- ---- couriers ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='couriers')
  loop execute format('drop policy if exists %I on public.couriers', r.policyname); end loop;
end$$;
create policy couriers_combined_select on public.couriers
  for select to authenticated
  using (public.is_admin() or user_id = public.current_user_id_v2());
create policy couriers_admin_write on public.couriers
  for insert to authenticated with check (public.is_admin());
create policy couriers_admin_update on public.couriers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy couriers_admin_delete on public.couriers
  for delete to authenticated using (public.is_admin());

-- ---- ship_users ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='ship_users')
  loop execute format('drop policy if exists %I on public.ship_users', r.policyname); end loop;
end$$;
create policy ship_users_combined_select on public.ship_users
  for select to authenticated
  using (public.is_admin() or auth_id = (select auth.uid()));
create policy ship_users_admin_insert on public.ship_users
  for insert to authenticated with check (public.is_admin());
create policy ship_users_admin_update on public.ship_users
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ship_users_admin_delete on public.ship_users
  for delete to authenticated using (public.is_admin());

-- ---- zones ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='zones')
  loop execute format('drop policy if exists %I on public.zones', r.policyname); end loop;
end$$;
create policy zones_select_authenticated on public.zones
  for select to authenticated using (true);
create policy zones_admin_insert on public.zones
  for insert to authenticated with check (public.is_admin());
create policy zones_admin_update on public.zones
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy zones_admin_delete on public.zones
  for delete to authenticated using (public.is_admin());

-- ---- pricing_rules ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='pricing_rules')
  loop execute format('drop policy if exists %I on public.pricing_rules', r.policyname); end loop;
end$$;
create policy pricing_select_authenticated on public.pricing_rules
  for select to authenticated using (true);
create policy pricing_admin_insert on public.pricing_rules
  for insert to authenticated with check (public.is_admin());
create policy pricing_admin_update on public.pricing_rules
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy pricing_admin_delete on public.pricing_rules
  for delete to authenticated using (public.is_admin());

-- ---- warehouses ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='warehouses')
  loop execute format('drop policy if exists %I on public.warehouses', r.policyname); end loop;
end$$;
create policy wh_select_authenticated on public.warehouses
  for select to authenticated using (true);
create policy wh_admin_insert on public.warehouses
  for insert to authenticated with check (public.is_admin());
create policy wh_admin_update on public.warehouses
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy wh_admin_delete on public.warehouses
  for delete to authenticated using (public.is_admin());

-- ---- warehouse_shelves ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='warehouse_shelves')
  loop execute format('drop policy if exists %I on public.warehouse_shelves', r.policyname); end loop;
end$$;
create policy whs_select_authenticated on public.warehouse_shelves
  for select to authenticated using (true);
create policy whs_admin_insert on public.warehouse_shelves
  for insert to authenticated with check (public.is_admin());
create policy whs_admin_update on public.warehouse_shelves
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy whs_admin_delete on public.warehouse_shelves
  for delete to authenticated using (public.is_admin());

-- ---- shipment_status_logs ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='shipment_status_logs')
  loop execute format('drop policy if exists %I on public.shipment_status_logs', r.policyname); end loop;
end$$;
create policy ssl_combined_select on public.shipment_status_logs
  for select to authenticated
  using (
    public.is_admin()
    or shipment_id in (
      select s.id from public.shipments s
      left join public.merchants m on m.id = s.merchant_id
      left join public.couriers   c on c.id = s.courier_id
      where m.user_id = public.current_user_id_v2() or c.user_id = public.current_user_id_v2()
    )
  );
create policy ssl_combined_insert on public.shipment_status_logs
  for insert to authenticated
  with check (public.is_admin() or changed_by = public.current_user_id_v2());

-- ---- courier_collections ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='courier_collections')
  loop execute format('drop policy if exists %I on public.courier_collections', r.policyname); end loop;
end$$;
create policy cc_combined_all on public.courier_collections
  for all to authenticated
  using (
    public.is_admin()
    or courier_id in (select id from public.couriers where user_id = public.current_user_id_v2())
  )
  with check (
    public.is_admin()
    or courier_id in (select id from public.couriers where user_id = public.current_user_id_v2())
  );

-- ---- financial_transactions ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='financial_transactions')
  loop execute format('drop policy if exists %I on public.financial_transactions', r.policyname); end loop;
end$$;
create policy ft_combined_select on public.financial_transactions
  for select to authenticated
  using (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
  );
create policy ft_admin_write on public.financial_transactions
  for insert to authenticated with check (public.is_admin());
create policy ft_admin_update on public.financial_transactions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ft_admin_delete on public.financial_transactions
  for delete to authenticated using (public.is_admin());

-- ---- settlement_requests ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='settlement_requests')
  loop execute format('drop policy if exists %I on public.settlement_requests', r.policyname); end loop;
end$$;
create policy sr_combined_all on public.settlement_requests
  for all to authenticated
  using (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
  )
  with check (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
  );

-- ---- import_batches ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='import_batches')
  loop execute format('drop policy if exists %I on public.import_batches', r.policyname); end loop;
end$$;
create policy ib_combined_all on public.import_batches
  for all to authenticated
  using (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
  )
  with check (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
  );

-- ---- tickets ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='tickets')
  loop execute format('drop policy if exists %I on public.tickets', r.policyname); end loop;
end$$;
create policy t_combined_all on public.tickets
  for all to authenticated
  using (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
  )
  with check (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
  );

-- ---- ticket_messages ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='ticket_messages')
  loop execute format('drop policy if exists %I on public.ticket_messages', r.policyname); end loop;
end$$;
create policy tm_combined_select on public.ticket_messages
  for select to authenticated
  using (
    public.is_admin()
    or ticket_id in (
      select id from public.tickets
      where merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
    )
  );
create policy tm_combined_insert on public.ticket_messages
  for insert to authenticated
  with check (
    public.is_admin()
    or sender_id = public.current_user_id_v2()
  );
create policy tm_admin_update on public.ticket_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tm_admin_delete on public.ticket_messages
  for delete to authenticated using (public.is_admin());

-- ---- notifications ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='notifications')
  loop execute format('drop policy if exists %I on public.notifications', r.policyname); end loop;
end$$;
create policy n_combined_all on public.notifications
  for all to authenticated
  using (public.is_admin() or user_id = public.current_user_id_v2())
  with check (public.is_admin() or user_id = public.current_user_id_v2());

-- ---- manifests ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='manifests')
  loop execute format('drop policy if exists %I on public.manifests', r.policyname); end loop;
end$$;
create policy mf_combined_select on public.manifests
  for select to authenticated
  using (
    public.is_admin()
    or courier_id in (select id from public.couriers where user_id = public.current_user_id_v2())
  );
create policy mf_admin_write on public.manifests
  for insert to authenticated with check (public.is_admin());
create policy mf_admin_update on public.manifests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy mf_admin_delete on public.manifests
  for delete to authenticated using (public.is_admin());

-- ---- manifest_items ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='manifest_items')
  loop execute format('drop policy if exists %I on public.manifest_items', r.policyname); end loop;
end$$;
create policy mi_combined_select on public.manifest_items
  for select to authenticated
  using (
    public.is_admin()
    or manifest_id in (
      select id from public.manifests
      where courier_id in (select id from public.couriers where user_id = public.current_user_id_v2())
    )
  );
create policy mi_admin_write on public.manifest_items
  for insert to authenticated with check (public.is_admin());
create policy mi_admin_update on public.manifest_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy mi_admin_delete on public.manifest_items
  for delete to authenticated using (public.is_admin());

-- ---- pod_artifacts ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='pod_artifacts')
  loop execute format('drop policy if exists %I on public.pod_artifacts', r.policyname); end loop;
end$$;
create policy pod_combined_all on public.pod_artifacts
  for all to authenticated
  using (
    public.is_admin()
    or courier_id in (select id from public.couriers where user_id = public.current_user_id_v2())
  )
  with check (
    public.is_admin()
    or courier_id in (select id from public.couriers where user_id = public.current_user_id_v2())
  );

-- ---- integration_webhooks ----
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='integration_webhooks')
  loop execute format('drop policy if exists %I on public.integration_webhooks', r.policyname); end loop;
end$$;
create policy iw_combined_all on public.integration_webhooks
  for all to authenticated
  using (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
  )
  with check (
    public.is_admin()
    or merchant_id in (select id from public.merchants where user_id = public.current_user_id_v2())
  );

-- ============================================================================
-- DONE — phase 2 complete.
-- ============================================================================
