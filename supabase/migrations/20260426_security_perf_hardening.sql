-- ============================================================================
-- Ship Pro: Security & Performance Hardening Migration
-- Date: 2026-04-26
-- Purpose: Fix Supabase advisor warnings (RLS, search_path, perf indexes)
-- ============================================================================

-- 1) Add RLS policies for ship.* tables that have RLS enabled but no policies
--    (admin-only access; all access goes through public schema views/tables)
DO $$
BEGIN
  -- ship.shipments
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='ship' AND tablename='shipments') THEN
    EXECUTE 'DROP POLICY IF EXISTS ship_admin_all_shipments ON ship.shipments';
    EXECUTE $p$CREATE POLICY ship_admin_all_shipments ON ship.shipments FOR ALL
      USING (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))
      WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))$p$;
  END IF;

  -- ship.merchants
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='ship' AND tablename='merchants') THEN
    EXECUTE 'DROP POLICY IF EXISTS ship_admin_all_merchants ON ship.merchants';
    EXECUTE $p$CREATE POLICY ship_admin_all_merchants ON ship.merchants FOR ALL
      USING (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))
      WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))$p$;
  END IF;

  -- ship.ship_users
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='ship' AND tablename='ship_users') THEN
    EXECUTE 'DROP POLICY IF EXISTS ship_admin_all_users ON ship.ship_users';
    EXECUTE $p$CREATE POLICY ship_admin_all_users ON ship.ship_users FOR ALL
      USING (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))
      WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))$p$;
  END IF;

  -- ship.shipment_status_logs
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='ship' AND tablename='shipment_status_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS ship_admin_all_logs ON ship.shipment_status_logs';
    EXECUTE $p$CREATE POLICY ship_admin_all_logs ON ship.shipment_status_logs FOR ALL
      USING (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))
      WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))$p$;
  END IF;

  -- ship.financial_transactions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='ship' AND tablename='financial_transactions') THEN
    EXECUTE 'DROP POLICY IF EXISTS ship_admin_all_fin ON ship.financial_transactions';
    EXECUTE $p$CREATE POLICY ship_admin_all_fin ON ship.financial_transactions FOR ALL
      USING (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))
      WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))$p$;
  END IF;

  -- ship.settlement_requests
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='ship' AND tablename='settlement_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS ship_admin_all_settle ON ship.settlement_requests';
    EXECUTE $p$CREATE POLICY ship_admin_all_settle ON ship.settlement_requests FOR ALL
      USING (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))
      WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))$p$;
  END IF;

  -- ship.import_batches
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='ship' AND tablename='import_batches') THEN
    EXECUTE 'DROP POLICY IF EXISTS ship_admin_all_imports ON ship.import_batches';
    EXECUTE $p$CREATE POLICY ship_admin_all_imports ON ship.import_batches FOR ALL
      USING (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))
      WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))$p$;
  END IF;

  -- ship.courier_collections
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='ship' AND tablename='courier_collections') THEN
    EXECUTE 'DROP POLICY IF EXISTS ship_admin_all_coll ON ship.courier_collections';
    EXECUTE $p$CREATE POLICY ship_admin_all_coll ON ship.courier_collections FOR ALL
      USING (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))
      WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
        WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role))$p$;
  END IF;
END $$;

-- 2) Tighten WITH CHECK on permissive admin policies (prevent bypass on INSERT/UPDATE)
ALTER POLICY admin_warehouses ON public.warehouses
  WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role));
ALTER POLICY admin_shelves ON public.warehouse_shelves
  WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role));
ALTER POLICY admin_assignments ON public.shipment_shelf_assignments
  WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role));
ALTER POLICY admin_manifests ON public.manifests
  WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role));
ALTER POLICY admin_manifest_items ON public.manifest_items
  WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role));
ALTER POLICY admin_pod ON public.pod_artifacts
  WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role));
ALTER POLICY admin_webhooks ON public.integration_webhooks
  WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role));
ALTER POLICY admin_all_tickets ON public.tickets
  WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role));
ALTER POLICY admin_all_ticket_msg ON public.ticket_messages
  WITH CHECK (EXISTS (SELECT 1 FROM public.ship_users u
    WHERE u.auth_id = (SELECT auth.uid()) AND u.role = 'admin'::public.user_role));

-- 3) Fix function search_path mutability (security)
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
             WHERE n.nspname='ship' AND p.proname='set_updated_at') THEN
    EXECUTE 'ALTER FUNCTION ship.set_updated_at() SET search_path = ship, public, pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
             WHERE n.nspname='ship' AND p.proname='calculate_delivery_fee') THEN
    EXECUTE 'ALTER FUNCTION ship.calculate_delivery_fee SET search_path = ship, public, pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
             WHERE n.nspname='ship' AND p.proname='auto_create_merchant_wallet') THEN
    EXECUTE 'ALTER FUNCTION ship.auto_create_merchant_wallet() SET search_path = ship, public, pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
             WHERE n.nspname='ship' AND p.proname='log_status_change') THEN
    EXECUTE 'ALTER FUNCTION ship.log_status_change() SET search_path = ship, public, pg_temp';
  END IF;
END $$;

-- 4) Add covering indexes for foreign keys (performance)
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_shipment_id ON public.tickets(shipment_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON public.ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_zone_id ON public.warehouses(zone_id);
CREATE INDEX IF NOT EXISTS idx_shelf_assignments_assigned_by ON public.shipment_shelf_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_shelf_assignments_shelf_id ON public.shipment_shelf_assignments(shelf_id);
CREATE INDEX IF NOT EXISTS idx_manifest_items_shipment_id ON public.manifest_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_manifests_created_by ON public.manifests(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_artifacts_courier_id ON public.pod_artifacts(courier_id);

-- 5) Drop duplicate indexes in ship schema
DROP INDEX IF EXISTS ship.idx_fin_txn_merchant;
DROP INDEX IF EXISTS ship.idx_settlement_merchant;

-- 6) Mark migration applied
DO $$ BEGIN
  RAISE NOTICE 'Ship Pro security & performance hardening applied successfully';
END $$;
