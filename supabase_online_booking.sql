-- ============================================================
-- DENTEASE: ONLINE BOOKING
-- Run this script once in the Supabase SQL Editor.
-- (The DROP POLICY IF EXISTS line only replaces this file's own policy
-- so the script can be re-run; no data is removed.)
-- ============================================================

-- One row per clinic: public link + booking hours
CREATE TABLE IF NOT EXISTS public.booking_settings (
  clinic_id     UUID        PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  slug          TEXT        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,38})[a-z0-9]$'),
  enabled       BOOLEAN     NOT NULL DEFAULT true,
  slot_minutes  INT         NOT NULL DEFAULT 30 CHECK (slot_minutes IN (15, 20, 30, 45, 60)),
  open_time     TEXT        NOT NULL DEFAULT '10:00',
  close_time    TEXT        NOT NULL DEFAULT '20:00',
  working_days  TEXT        NOT NULL DEFAULT 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday',
  days_ahead    INT         NOT NULL DEFAULT 14 CHECK (days_ahead BETWEEN 1 AND 90),
  note          TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_isolation_booking_settings" ON public.booking_settings;
CREATE POLICY "clinic_isolation_booking_settings" ON public.booking_settings
  FOR ALL USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id());

-- Online requests are saved as appointments with status 'Requested'
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS phone  TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS source TEXT;
