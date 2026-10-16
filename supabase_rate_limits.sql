-- ============================================================
-- DENTEASE API RATE LIMITS
-- Run this script once in the Supabase SQL Editor.
-- Used by /api/register, /api/reviews and /api/demo-requests to cap how
-- often one visitor (hashed IP) can submit. Accessed only with the
-- service role key, so RLS stays on with no policies.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id         BIGSERIAL   PRIMARY KEY,
  key        TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_rate_limits_key_created_at_idx
  ON public.api_rate_limits (key, created_at);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
