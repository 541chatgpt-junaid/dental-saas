-- ============================================================
-- DENTEASE: CLINIC LOGO FOR THE ONLINE BOOKING PAGE
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- A clinic's logo is shown on its public booking page, so it is stored in a
-- PUBLIC storage bucket (anyone with the link can view that one image).
-- Uploads and removals are done only by the app's server, for the clinic
-- owner, using the service role key; no storage policies are needed for that.
-- Limits: 1 MB per file, PNG / JPEG / WebP only.
-- ============================================================

-- The column already exists from the first migration; this is a safety net.
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS logo_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clinic-logos', 'clinic-logos', true, 1048576, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 1048576, allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];
