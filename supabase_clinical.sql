-- ============================================================
-- DENTEASE: CLINICAL SIDE OF THE PATIENT RECORD — PRESCRIPTIONS
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- Most clinical memory already lives on existing tables:
--   • tooth-wise work done  -> visits.tooth_number + visits.treatment (master)
--   • visit notes           -> visits.notes (per visit, with date + doctor)
--   • medical alerts        -> medical_history.allergies / conditions
-- The one piece with no structured home is prescriptions, added here as a
-- proper table linked to the patient and the visit that prescribed them.
--
-- Clinic-scoped with RLS exactly like every other table: a second clinic
-- sees zero rows. Nothing about the ledger, statuses, saves or permissions
-- changes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id  BIGINT,
  visit_id    BIGINT,
  medicine    TEXT        NOT NULL,
  dosage      TEXT,
  duration    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prescriptions_clinic_patient_idx ON public.prescriptions (clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS prescriptions_visit_idx          ON public.prescriptions (visit_id);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_isolation_prescriptions" ON public.prescriptions;
CREATE POLICY "clinic_isolation_prescriptions" ON public.prescriptions
  FOR ALL USING (clinic_id = get_my_clinic_id())
          WITH CHECK (clinic_id = get_my_clinic_id());
