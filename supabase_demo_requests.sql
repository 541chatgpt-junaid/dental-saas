-- ============================================================
-- DENTEASE LANDING PAGE DEMO REQUESTS
-- Run this script once in the Supabase SQL Editor.
-- Rows are inserted by /api/demo-requests using the service role key,
-- so no public (anon) policies are needed.
-- View submissions in Supabase → Table Editor → demo_requests.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.demo_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  clinic      TEXT,
  plan        TEXT        NOT NULL,
  clinic_size TEXT        NOT NULL,
  features    TEXT[]      NOT NULL DEFAULT '{}',
  status      TEXT        NOT NULL DEFAULT 'new',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS on with no policies: only the service role can read or write.
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
