-- ============================================================
-- DENTEASE: COMPLETE THE PATIENT IDENTITY FIELDS
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- Adds the identity fields the patient record was missing. All are optional
-- and nullable: existing records keep working untouched (new fields simply
-- read blank) — there is no backfill and nothing is broken.
--
-- The patients table already has RLS (clinic_isolation_patients) and sits
-- behind the Patients permission; these columns inherit both. No new table,
-- no new policy, no new permission.
-- ============================================================

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS dob               DATE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS cnic              TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS email             TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS blood_group       TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS guardian          TEXT;
