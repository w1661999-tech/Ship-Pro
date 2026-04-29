-- ============================================================================
-- Ship Pro: Fix import_batches schema mismatch + other deep issues
-- Date: 2026-04-28 (part 2)
-- Purpose:
--   1. Sync import_batches schema with what frontend actually uses
--   2. Fix missing columns and constraints causing silent INSERT failures
-- ============================================================================

-- 1) Fix import_batches: frontend uses different column names
ALTER TABLE public.import_batches
  ADD COLUMN IF NOT EXISTS success_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'processing';

-- Allow file_name to be optional (frontend doesn't always pass it)
ALTER TABLE public.import_batches
  ALTER COLUMN file_name DROP NOT NULL;

-- Backfill new columns from old ones (if old columns had data)
UPDATE public.import_batches
SET success_rows = COALESCE(success_count, 0),
    failed_rows = COALESCE(error_count, 0)
WHERE success_rows = 0 AND failed_rows = 0
  AND (success_count > 0 OR error_count > 0);

-- 2) Add updated_at to import_batches (used by frontend triggers)
ALTER TABLE public.import_batches
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger: auto-update updated_at on import_batches
DROP TRIGGER IF EXISTS trg_import_batches_updated_at ON public.import_batches;
CREATE TRIGGER trg_import_batches_updated_at
  BEFORE UPDATE ON public.import_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Add updated_at trigger to zones too (column was added but no trigger)
DROP TRIGGER IF EXISTS trg_zones_updated_at ON public.zones;
CREATE TRIGGER trg_zones_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Add commission_rate trigger (so updated_at refreshes on merchant updates)
DROP TRIGGER IF EXISTS trg_merchants_updated_at ON public.merchants;
CREATE TRIGGER trg_merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Increase auth API max_request_duration via settings (if applicable)
-- This is handled at config level, not DDL.

-- 6) Add helpful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_import_batches_merchant_created
  ON public.import_batches(merchant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_settlement_status_created
  ON public.settlement_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number
  ON public.shipments(tracking_number);

DO $$ BEGIN
  RAISE NOTICE 'Import batches schema fixes + triggers applied';
END $$;
