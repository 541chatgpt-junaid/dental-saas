-- ============================================================
-- DENTEASE: ONLY ADMINS CAN CHANGE THE STAFF TABLE
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- The hole: the staff table had one policy that scoped rows by clinic only
-- (FOR ALL). Any signed-in staff member could therefore call the database
-- API directly and give themselves more permissions, promote themselves to
-- admin, deactivate the owner, add staff rows or delete colleagues. An
-- owner could even set their own role to "superadmin", which opens the
-- admin panel for every clinic.
--
-- The fix: reading stays exactly as it was (everyone in a clinic can read
-- their clinic's staff rows). Inserting, updating and deleting now need
-- BOTH the same clinic AND an active admin / superadmin role. Only a
-- superadmin can create, change or remove a superadmin row, so an owner
-- cannot promote themselves. Per-module permissions from the previous step
-- (has_module_permission) are untouched.
--
-- The app's Staff page keeps working: it is used by the clinic owner
-- (role admin). Server code that uses the service role key is not affected.
-- Supabase may warn about "destructive operations"; that is only
-- DROP POLICY IF EXISTS so the policies can be recreated. No data is removed.
-- ============================================================

-- ── 1. HELPERS ─────────────────────────────────────────────
-- SECURITY DEFINER so they can read the staff table whatever the policies say.
CREATE OR REPLACE FUNCTION public.is_clinic_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid()
      AND COALESCE(s.status, 'Active') <> 'Inactive'
      AND LOWER(COALESCE(s.role, '')) IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid()
      AND COALESCE(s.status, 'Active') <> 'Inactive'
      AND LOWER(COALESCE(s.role, '')) = 'superadmin'
  );
$$;

-- ── 2. REPLACE THE STAFF POLICIES ──────────────────────────
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff', r.policyname);
  END LOOP;
END $$;

-- Reads: unchanged (clinic only)
CREATE POLICY "staff_select_clinic" ON public.staff
  FOR SELECT USING (clinic_id = get_my_clinic_id());

-- Writes: same clinic AND an admin; superadmin rows only touched by a superadmin
CREATE POLICY "staff_insert_admin" ON public.staff
  FOR INSERT WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND public.is_clinic_admin()
    AND (LOWER(COALESCE(role, '')) <> 'superadmin' OR public.is_superadmin())
  );

CREATE POLICY "staff_update_admin" ON public.staff
  FOR UPDATE
  USING (
    clinic_id = get_my_clinic_id()
    AND public.is_clinic_admin()
    AND (LOWER(COALESCE(role, '')) <> 'superadmin' OR public.is_superadmin())
  )
  WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND public.is_clinic_admin()
    AND (LOWER(COALESCE(role, '')) <> 'superadmin' OR public.is_superadmin())
  );

CREATE POLICY "staff_delete_admin" ON public.staff
  FOR DELETE USING (
    clinic_id = get_my_clinic_id()
    AND public.is_clinic_admin()
    AND (LOWER(COALESCE(role, '')) <> 'superadmin' OR public.is_superadmin())
  );
