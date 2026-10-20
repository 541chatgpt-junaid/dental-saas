-- ============================================================
-- DENTEASE: TREATMENT PLANS, DOCTOR COMMISSION, RECALLS
-- Run this script once in the Supabase SQL Editor.
-- Every table is scoped to the clinic with the same RLS rule as the
-- rest of the app: clinic_id = get_my_clinic_id().
-- ============================================================

-- ── 1. TREATMENT PLANS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id   BIGINT,
  patient_name TEXT        NOT NULL,
  doctor_name  TEXT,
  title        TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'proposed'
               CHECK (status IN ('proposed', 'accepted', 'in_progress', 'completed', 'declined')),
  discount     NUMERIC     NOT NULL DEFAULT 0,
  notes        TEXT,
  invoice_id   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.treatment_plan_items (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    UUID    NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  clinic_id  UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  tooth      TEXT,
  procedure  TEXT    NOT NULL,
  fee        NUMERIC NOT NULL DEFAULT 0,
  done       BOOLEAN NOT NULL DEFAULT false,
  position   INT     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS treatment_plans_clinic_idx ON public.treatment_plans (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS treatment_plan_items_plan_idx ON public.treatment_plan_items (plan_id);

-- ── 2. DOCTOR COMMISSION ────────────────────────────────────
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS commission_percent NUMERIC NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.doctor_payouts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_name TEXT        NOT NULL,
  month       TEXT        NOT NULL,            -- 'YYYY-MM' the payout is for
  amount      NUMERIC     NOT NULL CHECK (amount > 0),
  paid_on     DATE        NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS doctor_payouts_clinic_month_idx ON public.doctor_payouts (clinic_id, month);

-- ── 3. RECALLS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recalls (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id   BIGINT,
  patient_name TEXT        NOT NULL,
  phone        TEXT,
  reason       TEXT        NOT NULL,
  due_date     DATE        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'contacted', 'booked', 'done', 'cancelled')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recalls_clinic_due_idx ON public.recalls (clinic_id, due_date);

-- ── 4. ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE public.treatment_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_payouts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recalls              ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_isolation_treatment_plans" ON public.treatment_plans;
CREATE POLICY "clinic_isolation_treatment_plans" ON public.treatment_plans
  FOR ALL USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id());

DROP POLICY IF EXISTS "clinic_isolation_treatment_plan_items" ON public.treatment_plan_items;
CREATE POLICY "clinic_isolation_treatment_plan_items" ON public.treatment_plan_items
  FOR ALL USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id());

DROP POLICY IF EXISTS "clinic_isolation_doctor_payouts" ON public.doctor_payouts;
CREATE POLICY "clinic_isolation_doctor_payouts" ON public.doctor_payouts
  FOR ALL USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id());

DROP POLICY IF EXISTS "clinic_isolation_recalls" ON public.recalls;
CREATE POLICY "clinic_isolation_recalls" ON public.recalls
  FOR ALL USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id());
