-- ============================================================
-- DENTEASE: DIGITAL FORMS (medical history, e-consent) AND THE PATIENT PORTAL
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- 1. patient_forms        secret links the clinic sends a patient (history form,
--                         consent form, portal invitation)
-- 2. consent_templates    the consent wording each clinic writes itself
-- 3. patient_form_submissions  what a patient answered on the history form
-- 4. consent_records      a signed consent: wording snapshot, typed name, drawn
--                         signature, timestamp. Read-only for everyone except the
--                         app's server: there is no update or delete policy.
-- 5. patient_portal_users links a patient's own login to their patient record
--
-- Portal access is row-level security, not app code: a patient's login can read
-- ONLY the rows that belong to their own patient record (plus their clinic's
-- name and contact details), and nothing can be written with it.
-- All writes to the new tables are done by the app's server (service role).
-- ============================================================

-- ── 1. TABLES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consent_templates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patient_forms (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id   BIGINT      NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  kind         TEXT        NOT NULL CHECK (kind IN ('history', 'consent', 'portal')),
  template_id  UUID        REFERENCES public.consent_templates(id) ON DELETE SET NULL,
  token        TEXT        NOT NULL UNIQUE,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  revoked      BOOLEAN     NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS patient_forms_patient_idx ON public.patient_forms (patient_id, kind);

CREATE TABLE IF NOT EXISTS public.patient_form_submissions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id   BIGINT      NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  form_id      UUID        REFERENCES public.patient_forms(id) ON DELETE SET NULL,
  kind         TEXT        NOT NULL DEFAULT 'history',
  answers      JSONB       NOT NULL,
  flagged      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS patient_form_submissions_patient_idx ON public.patient_form_submissions (patient_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.consent_records (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id     BIGINT      NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  form_id        UUID        REFERENCES public.patient_forms(id) ON DELETE SET NULL,
  template_id    UUID,
  title          TEXT        NOT NULL,
  body           TEXT        NOT NULL,
  signer_name    TEXT        NOT NULL,
  signer_relation TEXT,
  signature_png  TEXT        NOT NULL,
  signed_at      TIMESTAMPTZ NOT NULL,
  integrity_hash TEXT        NOT NULL,
  ip_hash        TEXT
);
CREATE INDEX IF NOT EXISTS consent_records_patient_idx ON public.consent_records (patient_id, signed_at DESC);

CREATE TABLE IF NOT EXISTS public.patient_portal_users (
  user_id    UUID        PRIMARY KEY,
  patient_id BIGINT      NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id  UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. WHO IS THIS PORTAL LOGIN? (SECURITY DEFINER so policies can use it) ──
CREATE OR REPLACE FUNCTION public.portal_patient_id()
RETURNS BIGINT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT patient_id FROM public.patient_portal_users WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.portal_clinic_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT clinic_id FROM public.patient_portal_users WHERE user_id = auth.uid()
$$;

-- ── 3. ROW LEVEL SECURITY ───────────────────────────────────
-- New tables: clinic staff may READ their clinic's rows; every write goes
-- through the app's server. Portal logins read only their own patient's rows.
ALTER TABLE public.consent_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_forms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_form_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_portal_users      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_consent_templates" ON public.consent_templates;
CREATE POLICY "staff_read_consent_templates" ON public.consent_templates
  FOR SELECT USING (clinic_id = get_my_clinic_id());

DROP POLICY IF EXISTS "staff_read_patient_forms" ON public.patient_forms;
CREATE POLICY "staff_read_patient_forms" ON public.patient_forms
  FOR SELECT USING (clinic_id = get_my_clinic_id());

DROP POLICY IF EXISTS "staff_read_form_submissions" ON public.patient_form_submissions;
CREATE POLICY "staff_read_form_submissions" ON public.patient_form_submissions
  FOR SELECT USING (clinic_id = get_my_clinic_id());
DROP POLICY IF EXISTS "portal_read_form_submissions" ON public.patient_form_submissions;
CREATE POLICY "portal_read_form_submissions" ON public.patient_form_submissions
  FOR SELECT USING (patient_id = portal_patient_id());

DROP POLICY IF EXISTS "staff_read_consent_records" ON public.consent_records;
CREATE POLICY "staff_read_consent_records" ON public.consent_records
  FOR SELECT USING (clinic_id = get_my_clinic_id());
DROP POLICY IF EXISTS "portal_read_consent_records" ON public.consent_records;
CREATE POLICY "portal_read_consent_records" ON public.consent_records
  FOR SELECT USING (patient_id = portal_patient_id());

DROP POLICY IF EXISTS "staff_read_portal_users" ON public.patient_portal_users;
CREATE POLICY "staff_read_portal_users" ON public.patient_portal_users
  FOR SELECT USING (clinic_id = get_my_clinic_id());
DROP POLICY IF EXISTS "portal_read_own_mapping" ON public.patient_portal_users;
CREATE POLICY "portal_read_own_mapping" ON public.patient_portal_users
  FOR SELECT USING (user_id = auth.uid());

-- Existing tables: extra READ-ONLY policies for a portal login, own patient only.
-- (Policies combine with OR, so staff access is unchanged.)
DROP POLICY IF EXISTS "portal_read_own_patient" ON public.patients;
CREATE POLICY "portal_read_own_patient" ON public.patients
  FOR SELECT USING (id = portal_patient_id());

DROP POLICY IF EXISTS "portal_read_own_appointments" ON public.appointments;
CREATE POLICY "portal_read_own_appointments" ON public.appointments
  FOR SELECT USING (patient_id = portal_patient_id());

DROP POLICY IF EXISTS "portal_read_own_visits" ON public.visits;
CREATE POLICY "portal_read_own_visits" ON public.visits
  FOR SELECT USING (patient_id = portal_patient_id());

DROP POLICY IF EXISTS "portal_read_own_prescriptions" ON public.prescriptions;
CREATE POLICY "portal_read_own_prescriptions" ON public.prescriptions
  FOR SELECT USING (patient_id = portal_patient_id());

DROP POLICY IF EXISTS "portal_read_own_medical_history" ON public.medical_history;
CREATE POLICY "portal_read_own_medical_history" ON public.medical_history
  FOR SELECT USING (patient_id = portal_patient_id());

DROP POLICY IF EXISTS "portal_read_own_clinic" ON public.clinics;
CREATE POLICY "portal_read_own_clinic" ON public.clinics
  FOR SELECT USING (id = portal_clinic_id());

-- Make the API pick up the new tables right away
NOTIFY pgrst, 'reload schema';
