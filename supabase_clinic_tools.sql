-- ============================================================
-- DENTEASE: WALK-IN QUEUE, PATIENT FILES (X-RAYS/PHOTOS),
--           INVENTORY EXPIRY
-- Run this script once in the Supabase SQL Editor.
-- Supabase will warn about "destructive operations" because of the
-- DROP POLICY IF EXISTS lines; they only replace this file's own
-- policies so the script can be re-run. No tables or data are removed.
-- ============================================================

-- ── 1. WALK-IN QUEUE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.queue_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  token_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  token_no     INT         NOT NULL,
  patient_id   BIGINT,
  patient_name TEXT        NOT NULL,
  phone        TEXT,
  doctor_name  TEXT,
  reason       TEXT,
  status       TEXT        NOT NULL DEFAULT 'waiting'
               CHECK (status IN ('waiting', 'in_chair', 'done', 'skipped')),
  called_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS queue_tokens_clinic_day_idx ON public.queue_tokens (clinic_id, token_date, token_no);

ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_isolation_queue_tokens" ON public.queue_tokens;
CREATE POLICY "clinic_isolation_queue_tokens" ON public.queue_tokens
  FOR ALL USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id());

-- ── 2. PATIENT FILES (X-rays, OPG, photos, documents) ───────
CREATE TABLE IF NOT EXISTS public.patient_files (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id  BIGINT      NOT NULL,
  file_path   TEXT        NOT NULL,          -- path inside the patient-files bucket
  file_name   TEXT        NOT NULL,
  mime_type   TEXT,
  size_bytes  BIGINT,
  category    TEXT        NOT NULL DEFAULT 'xray'
              CHECK (category IN ('xray', 'opg', 'before', 'after', 'document')),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS patient_files_patient_idx ON public.patient_files (clinic_id, patient_id, created_at DESC);

ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_isolation_patient_files" ON public.patient_files;
CREATE POLICY "clinic_isolation_patient_files" ON public.patient_files
  FOR ALL USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id());

-- Private storage bucket: max 10 MB per file, images and PDFs only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('patient-files', 'patient-files', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Files are stored as <clinic_id>/<patient_id>/<file>; staff can only
-- touch files inside their own clinic's folder.
DROP POLICY IF EXISTS "patient_files_read" ON storage.objects;
CREATE POLICY "patient_files_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-files' AND (storage.foldername(name))[1] = get_my_clinic_id()::text);

DROP POLICY IF EXISTS "patient_files_upload" ON storage.objects;
CREATE POLICY "patient_files_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-files' AND (storage.foldername(name))[1] = get_my_clinic_id()::text);

DROP POLICY IF EXISTS "patient_files_delete" ON storage.objects;
CREATE POLICY "patient_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-files' AND (storage.foldername(name))[1] = get_my_clinic_id()::text);

-- ── 3. INVENTORY EXPIRY ─────────────────────────────────────
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS expiry_date DATE;
