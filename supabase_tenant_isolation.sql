-- ============================================================
-- DENTEASE: CLOSE THE TENANT-ISOLATION HOLES
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- The billing tables (invoices, invoice_items) and the Settings presets
-- (treatment_presets, prescription_presets), plus the invoice-number
-- counter, were created outside the main migration and never had Row Level
-- Security turned on. Without it, a signed-in user from one clinic could
-- read or change another clinic's invoices through the REST API, even
-- though the UI hides them. This script turns RLS on and scopes every one
-- of these tables to the owning clinic for all four operations
-- (select / insert / update / delete), exactly like the rest of the app.
--
-- It does NOT touch the ledger tables' shape or the billing migration —
-- only the access rules around them. Supabase may show a "destructive
-- operations" warning; it comes from DROP POLICY IF EXISTS (so the policy
-- can be recreated) and removes no data.
-- ============================================================

-- A row with no clinic_id yet (older data) is treated as belonging to the
-- caller's clinic the first time they touch it, same spirit as the rest of
-- the schema. New rows always carry clinic_id, enforced by WITH CHECK.

-- ── 1. invoices ─────────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_isolation_invoices" ON public.invoices;
CREATE POLICY "clinic_isolation_invoices" ON public.invoices
  FOR ALL USING (clinic_id = get_my_clinic_id())
          WITH CHECK (clinic_id = get_my_clinic_id());

-- ── 2. invoice_items ────────────────────────────────────────
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_isolation_invoice_items" ON public.invoice_items;
CREATE POLICY "clinic_isolation_invoice_items" ON public.invoice_items
  FOR ALL USING (clinic_id = get_my_clinic_id())
          WITH CHECK (clinic_id = get_my_clinic_id());

-- ── 3. treatment_presets ────────────────────────────────────
ALTER TABLE public.treatment_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_isolation_treatment_presets" ON public.treatment_presets;
CREATE POLICY "clinic_isolation_treatment_presets" ON public.treatment_presets
  FOR ALL USING (clinic_id = get_my_clinic_id())
          WITH CHECK (clinic_id = get_my_clinic_id());

-- ── 4. prescription_presets ─────────────────────────────────
ALTER TABLE public.prescription_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_isolation_prescription_presets" ON public.prescription_presets;
CREATE POLICY "clinic_isolation_prescription_presets" ON public.prescription_presets
  FOR ALL USING (clinic_id = get_my_clinic_id())
          WITH CHECK (clinic_id = get_my_clinic_id());

-- ── 5. invoice_counters (invoice-number sequence per clinic) ─
-- Only the SECURITY DEFINER function generate_invoice_number writes here;
-- clients never query it directly. RLS makes that explicit.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoice_counters') THEN
    EXECUTE 'ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "clinic_isolation_invoice_counters" ON public.invoice_counters';
    EXECUTE 'CREATE POLICY "clinic_isolation_invoice_counters" ON public.invoice_counters
               FOR ALL USING (clinic_id = get_my_clinic_id())
                       WITH CHECK (clinic_id = get_my_clinic_id())';
  END IF;
END $$;

-- ── 6. Re-assert WITH CHECK on the original tables ──────────
-- supabase_migration.sql created these with FOR ALL USING (...) and no
-- explicit WITH CHECK. Postgres then uses USING as the INSERT/UPDATE check,
-- so inserts are already constrained — but we make it explicit so an audit
-- sees a WITH CHECK on every table and no write can set another clinic_id.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'appointments','doctors','expenses','labs','materials','medical_history',
    'patients','purchases','settings','staff','visits'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'clinic_isolation_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id())',
      'clinic_isolation_' || t, t);
  END LOOP;
END $$;

-- payments already gets its policy from supabase_billing_ledger.sql
-- (payments_clinic_access, FOR ALL with USING + WITH CHECK).

-- ── 7. Verify: every clinic-scoped table has RLS ON ─────────
-- Run this SELECT after the script; every row should read rls = 'ON'
-- with a policy. (Informational — safe to run anytime.)
-- SELECT c.relname, c.relrowsecurity AS rls,
--        (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--  WHERE n.nspname = 'public' AND c.relkind = 'r'
--  ORDER BY c.relname;
