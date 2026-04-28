-- ============================================================================
-- Ship Pro: Schema fixes + Performance Dashboard RPC
-- Date: 2026-04-28
-- Purpose:
--   1. Add missing commission_rate column to merchants
--   2. Create dashboard_stats() RPC to replace 8 round-trips with 1
--   3. Add missing indexes for slow queries
-- ============================================================================

-- 1) Add missing commission_rate column (used by frontend code)
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) DEFAULT 0 NOT NULL;

-- 2) Create high-performance dashboard stats RPC (single round-trip)
CREATE OR REPLACE FUNCTION public.dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  today_start timestamptz := date_trunc('day', now());
  week_start timestamptz := date_trunc('day', now() - interval '6 days');
BEGIN
  SELECT jsonb_build_object(
    'total_shipments',         (SELECT count(*) FROM shipments),
    'delivered_today',         (SELECT count(*) FROM shipments WHERE status='delivered' AND delivered_at >= today_start),
    'delivered_total',         (SELECT count(*) FROM shipments WHERE status='delivered'),
    'pending',                 (SELECT count(*) FROM shipments WHERE status IN ('pending','assigned')),
    'in_transit',              (SELECT count(*) FROM shipments WHERE status IN ('picked_up','in_transit','out_for_delivery')),
    'returned',                (SELECT count(*) FROM shipments WHERE status IN ('returned','refused')),
    'active_drivers',          (SELECT count(*) FROM couriers WHERE status IN ('active','on_delivery')),
    'total_merchants',         (SELECT count(*) FROM merchants WHERE status='active'),
    'today_revenue',           (SELECT COALESCE(SUM(delivery_fee+cod_fee), 0) FROM shipments
                                WHERE status='delivered' AND delivered_at >= today_start),
    'total_cod',               (SELECT COALESCE(SUM(cod_amount), 0) FROM shipments WHERE status='delivered'),
    'last7days', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d::date, 'count', c) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT generate_series(week_start, today_start, '1 day'::interval) AS d
      ) days
      LEFT JOIN LATERAL (
        SELECT count(*) AS c FROM shipments
        WHERE created_at >= days.d AND created_at < days.d + interval '1 day'
      ) cnt ON true
    ),
    'status_breakdown', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT status::text, count(*) AS cnt FROM shipments GROUP BY status) s
    )
  ) INTO result;

  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.dashboard_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.dashboard_stats() TO anon, authenticated, service_role;

-- 3) Merchant dashboard stats RPC (similar but scoped to merchant)
CREATE OR REPLACE FUNCTION public.merchant_dashboard_stats(p_merchant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  today_start timestamptz := date_trunc('day', now());
BEGIN
  SELECT jsonb_build_object(
    'total_shipments',  (SELECT count(*) FROM shipments WHERE merchant_id = p_merchant_id),
    'delivered',        (SELECT count(*) FROM shipments WHERE merchant_id = p_merchant_id AND status='delivered'),
    'pending',          (SELECT count(*) FROM shipments WHERE merchant_id = p_merchant_id AND status IN ('pending','assigned')),
    'in_transit',       (SELECT count(*) FROM shipments WHERE merchant_id = p_merchant_id AND status IN ('picked_up','in_transit','out_for_delivery')),
    'returned',         (SELECT count(*) FROM shipments WHERE merchant_id = p_merchant_id AND status IN ('returned','refused')),
    'today_added',      (SELECT count(*) FROM shipments WHERE merchant_id = p_merchant_id AND created_at >= today_start),
    'total_cod',        (SELECT COALESCE(SUM(cod_amount), 0) FROM shipments WHERE merchant_id = p_merchant_id AND status='delivered'),
    'balance',          (SELECT balance FROM merchants WHERE id = p_merchant_id),
    'pending_settlement', (SELECT pending_settlement FROM merchants WHERE id = p_merchant_id)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.merchant_dashboard_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.merchant_dashboard_stats(uuid) TO anon, authenticated, service_role;

-- 4) Performance indexes for status filtering (used by dashboard_stats)
CREATE INDEX IF NOT EXISTS idx_shipments_status_delivered_at
  ON public.shipments(status, delivered_at) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_shipments_status_created_at
  ON public.shipments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_shipments_merchant_status
  ON public.shipments(merchant_id, status);

-- 5) Add updated_at column to zones (used by triggers, was missing)
ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  RAISE NOTICE 'Schema fixes + performance RPCs applied';
END $$;
