-- ============================================================
-- DENTEASE: AUTOMATIC REMINDERS, NO-SHOW FOLLOW-UP AND REVIEW REQUESTS
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- 1. patients.contact_consent   whether the patient agreed to be messaged.
--                               Every existing patient starts as NOT agreed, so
--                               nothing is sent to anyone until it is recorded.
-- 2. reminder_settings          each clinic's times, review link and templates
-- 3. clinic_whatsapp            the clinic's own WhatsApp Cloud API connection
--                               (token encrypted; server only)
-- 4. message_outbox             every message the scheduler decided on: sent,
--                               ready for a one-tap send, or skipped with the reason
--
-- All writes go through the app's server (service role); signed-in staff can only
-- READ their own clinic's rows.
-- ============================================================

-- ── 1. CONSENT ──────────────────────────────────────────────
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS contact_consent        BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS contact_consent_at     TIMESTAMPTZ;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS contact_consent_source TEXT;

-- ── 2. SETTINGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  clinic_id           UUID        PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  enabled             BOOLEAN     NOT NULL DEFAULT FALSE,
  timezone            TEXT        NOT NULL DEFAULT 'Asia/Karachi',
  day_before_on       BOOLEAN     NOT NULL DEFAULT TRUE,
  day_before_time     TEXT        NOT NULL DEFAULT '18:00',
  same_day_on         BOOLEAN     NOT NULL DEFAULT TRUE,
  same_day_hours      INTEGER     NOT NULL DEFAULT 2  CHECK (same_day_hours BETWEEN 1 AND 12),
  noshow_on           BOOLEAN     NOT NULL DEFAULT TRUE,
  noshow_delay_hours  INTEGER     NOT NULL DEFAULT 2  CHECK (noshow_delay_hours BETWEEN 1 AND 72),
  review_on           BOOLEAN     NOT NULL DEFAULT TRUE,
  review_delay_hours  INTEGER     NOT NULL DEFAULT 2  CHECK (review_delay_hours BETWEEN 1 AND 72),
  google_review_url   TEXT,
  tpl_reminder        TEXT,
  tpl_noshow          TEXT,
  tpl_review          TEXT,
  tpl_lang            TEXT        NOT NULL DEFAULT 'en',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. WHATSAPP CONNECTION (server only: no policies) ───────
CREATE TABLE IF NOT EXISTS public.clinic_whatsapp (
  clinic_id       UUID        PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  enabled         BOOLEAN     NOT NULL DEFAULT FALSE,
  phone_number_id TEXT        NOT NULL,
  token_enc       TEXT        NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. OUTBOX ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_outbox (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id     BIGINT      NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id BIGINT      NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  kind           TEXT        NOT NULL CHECK (kind IN ('reminder_day_before', 'reminder_same_day', 'noshow_followup', 'review_request')),
  slot           TEXT        NOT NULL,
  due_at         TIMESTAMPTZ NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'ready', 'skipped', 'failed')),
  reason         TEXT,
  to_phone       TEXT,
  body           TEXT,
  token          TEXT        NOT NULL UNIQUE,
  attempts       INTEGER     NOT NULL DEFAULT 0,
  sent_at        TIMESTAMPTZ,
  sent_via       TEXT,
  provider_ref   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- one message per appointment, per kind, per booked time: a retried or
  -- repeated run can never send the same thing twice
  UNIQUE (appointment_id, kind, slot)
);
CREATE INDEX IF NOT EXISTS message_outbox_due_idx    ON public.message_outbox (status, due_at);
CREATE INDEX IF NOT EXISTS message_outbox_clinic_idx ON public.message_outbox (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_outbox_patient_idx ON public.message_outbox (patient_id, kind, sent_at DESC);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_whatsapp   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_outbox    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_reminder_settings" ON public.reminder_settings;
CREATE POLICY "staff_read_reminder_settings" ON public.reminder_settings
  FOR SELECT USING (clinic_id = get_my_clinic_id());

DROP POLICY IF EXISTS "staff_read_message_outbox" ON public.message_outbox;
CREATE POLICY "staff_read_message_outbox" ON public.message_outbox
  FOR SELECT USING (clinic_id = get_my_clinic_id());

NOTIFY pgrst, 'reload schema';
