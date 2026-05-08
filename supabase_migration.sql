-- ============================================================
-- DENTEASE MULTI-TENANT MIGRATION
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ── 1. CREATE CLINICS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinics (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        UNIQUE NOT NULL,
  phone      TEXT,
  address    TEXT,
  logo_url   TEXT,
  is_active  BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ADD clinic_id TO ALL TABLES ──────────────────────────
ALTER TABLE public.appointments    ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.doctors         ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.expenses        ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.labs            ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.materials       ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.medical_history ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.patients        ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.purchases       ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.settings        ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.staff           ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.visits          ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- ── 3. ENSURE user_id ON staff TABLE ────────────────────────
-- user_id here means the STAFF MEMBER'S OWN auth.uid() (not the owner's)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS user_id UUID;

-- ── 4. DROP ALL EXISTING RLS POLICIES ───────────────────────
DO $$
DECLARE
  pol    RECORD;
  tbl    TEXT;
  tables TEXT[] := ARRAY[
    'appointments','doctors','expenses','labs','materials',
    'medical_history','patients','purchases','settings','staff','visits','clinics'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END;
$$;

-- ── 5. ENABLE RLS ON ALL TABLES ─────────────────────────────
ALTER TABLE public.clinics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits          ENABLE ROW LEVEL SECURITY;

-- ── 6. HELPER FUNCTION ──────────────────────────────────────
-- SECURITY DEFINER bypasses RLS so the function can read staff freely
CREATE OR REPLACE FUNCTION get_my_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 7. RLS POLICIES ─────────────────────────────────────────
-- Each policy: user can only access rows belonging to their clinic

CREATE POLICY "clinic_isolation_clinics" ON public.clinics
  FOR ALL USING (id = get_my_clinic_id());

CREATE POLICY "clinic_isolation_appointments" ON public.appointments
  FOR ALL USING (clinic_id = get_my_clinic_id());

CREATE POLICY "clinic_isolation_doctors" ON public.doctors
  FOR ALL USING (clinic_id = get_my_clinic_id());

CREATE POLICY "clinic_isolation_expenses" ON public.expenses
  FOR ALL USING (clinic_id = get_my_clinic_id());

CREATE POLICY "clinic_isolation_labs" ON public.labs
  FOR ALL USING (clinic_id = get_my_clinic_id());

CREATE POLICY "clinic_isolation_materials" ON public.materials
  FOR ALL USING (clinic_id = get_my_clinic_id());

CREATE POLICY "clinic_isolation_medical_history" ON public.medical_history
  FOR ALL USING (clinic_id = get_my_clinic_id());

CREATE POLICY "clinic_isolation_patients" ON public.patients
  FOR ALL USING (clinic_id = get_my_clinic_id());

CREATE POLICY "clinic_isolation_purchases" ON public.purchases
  FOR ALL USING (clinic_id = get_my_clinic_id());

CREATE POLICY "clinic_isolation_settings" ON public.settings
  FOR ALL USING (clinic_id = get_my_clinic_id());

-- Staff: members can see all staff within their own clinic
CREATE POLICY "clinic_isolation_staff" ON public.staff
  FOR ALL USING (clinic_id = get_my_clinic_id());

CREATE POLICY "clinic_isolation_visits" ON public.visits
  FOR ALL USING (clinic_id = get_my_clinic_id());

-- ── 8. TEST DATA: one clinic + superadmin ───────────────────
-- (Optional — run separately after creating auth user)
-- Replace 'YOUR-AUTH-USER-UUID' with the actual UUID from Supabase Auth

-- INSERT INTO public.clinics (id, name, email, phone, address)
-- VALUES ('11111111-1111-1111-1111-111111111111', 'Test Dental Clinic', 'admin@test.com', '03001234567', 'Test City');

-- INSERT INTO public.staff (name, email, role, status, permissions, user_id, clinic_id)
-- VALUES ('Super Admin', 'admin@test.com', 'superadmin', 'Active',
--   'Dashboard,Patients,Appointments,Doctors,Lab Records,Materials,Expenses,Reports,Staff,Settings',
--   'YOUR-AUTH-USER-UUID',
--   '11111111-1111-1111-1111-111111111111'
-- );
