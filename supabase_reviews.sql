-- ============================================================
-- DENTEASE LANDING PAGE REVIEWS
-- Run this script in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  clinic      TEXT        CHECK (clinic IS NULL OR char_length(clinic) <= 120),
  review      TEXT        NOT NULL CHECK (char_length(review) BETWEEN 10 AND 1000),
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  is_approved BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserts go through /api/reviews with the service role key, which bypasses RLS.
-- RLS stays on with no policies so the anon key cannot read or write this table.
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
