-- ============================================================
-- DENTEASE: ENFORCE PER-STAFF MODULE PERMISSIONS AT THE DATA LAYER
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- Until now a module's permission was checked only by the page router
-- (middleware). A staff member without, say, Purchases was redirected away
-- from the page — but could still read the purchases table directly through
-- the REST API, because RLS scoped rows by clinic only, not by permission.
--
-- This script closes that: the six module-specific tables now require BOTH
-- the owning clinic AND the module permission for every operation. The
-- clinic owner (role admin) and superadmin always pass. Clinic isolation
-- from the previous step is kept intact (every policy still ANDs clinic_id).
--
-- Modules and their tables:
--   Queue           -> queue_tokens
--   Treatment Plans -> treatment_plans, treatment_plan_items
--   Recalls         -> recalls
--   Commissions     -> doctor_payouts
--   Purchases       -> purchases
--   Online Booking  -> booking_settings
--
-- Supabase may warn about "destructive operations"; that is only
-- DROP POLICY IF EXISTS so the policy can be recreated. No data is removed.
-- ============================================================

-- ── 1. HELPER: does the current user have a module permission? ──
-- SECURITY DEFINER so it can read the staff table regardless of RLS.
-- admin / superadmin always pass. Otherwise the module name must appear in
-- the staff member's comma-separated permissions, trimmed of stray spaces.
CREATE OR REPLACE FUNCTION public.has_module_permission(p_module TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid()
      AND COALESCE(s.status, 'Active') <> 'Inactive'
      AND (
        LOWER(COALESCE(s.role, '')) IN ('admin', 'superadmin')
        OR p_module = ANY (
          SELECT TRIM(x) FROM unnest(string_to_array(COALESCE(s.permissions, ''), ',')) AS x
        )
      )
  );
$$;

-- ── 2. RE-SCOPE EACH MODULE TABLE: clinic AND permission ────
-- A helper block so every table gets an identical clinic+permission policy.
DO $$
DECLARE
  r RECORD;
  pairs TEXT[][] := ARRAY[
    ['queue_tokens',         'Queue'],
    ['treatment_plans',      'Treatment Plans'],
    ['treatment_plan_items', 'Treatment Plans'],
    ['recalls',              'Recalls'],
    ['doctor_payouts',       'Commissions'],
    ['purchases',            'Purchases'],
    ['booking_settings',     'Online Booking']
  ];
  i INT;
  tbl TEXT;
  modname TEXT;
BEGIN
  FOR i IN 1 .. array_length(pairs, 1) LOOP
    tbl := pairs[i][1];
    modname := pairs[i][2];
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      -- Drop any existing policy on the table so the combined one is the only rule
      FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, tbl);
      END LOOP;
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL
           USING (clinic_id = get_my_clinic_id() AND public.has_module_permission(%L))
           WITH CHECK (clinic_id = get_my_clinic_id() AND public.has_module_permission(%L))',
        'clinic_perm_' || tbl, tbl, modname, modname);
    END IF;
  END LOOP;
END $$;

-- Note: shared tables the Commissions report also reads (doctors, visits,
-- invoices, payments, patients) stay scoped by clinic only — they belong to
-- their own modules and are gated by their own pages. Only the six
-- module-specific tables above carry a permission gate.
