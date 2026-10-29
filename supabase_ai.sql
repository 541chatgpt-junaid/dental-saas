-- ============================================================
-- DENTEASE: AI DRAFTING (recall / review messages) AND AI SCRIBE
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- ai_settings   a clinic switches AI drafting on (OFF for every clinic)
-- ai_drafts     every AI draft: what was sent to the AI provider (the facts),
--               what came back, and whether staff approved it, with who and when.
--               Written only by the app's server; readable by clinic admins.
-- message_outbox  gains the "recall_followup" kind, an optional recall link and
--               an ai_draft_id, so an approved AI recall message goes through the
--               same queue, consent rule, stop link and log as the automatic
--               messages. (appointment_id becomes optional: a recall has none.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_settings (
  clinic_id  UUID        PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_drafts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id  BIGINT,
  tool        TEXT        NOT NULL CHECK (tool IN ('recall', 'review_request', 'review_reply', 'visit_note')),
  ref         TEXT,
  facts       JSONB       NOT NULL,
  draft       JSONB       NOT NULL,
  warnings    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  status      TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  final       JSONB,
  provider    TEXT,
  model       TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ai_drafts_clinic_idx ON public.ai_drafts (clinic_id, created_at DESC);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_drafts   ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_ai_settings" ON public.ai_settings;
CREATE POLICY "staff_read_ai_settings" ON public.ai_settings FOR SELECT USING (clinic_id = get_my_clinic_id());
DROP POLICY IF EXISTS "admin_read_ai_drafts" ON public.ai_drafts;
CREATE POLICY "admin_read_ai_drafts" ON public.ai_drafts FOR SELECT USING (clinic_id = get_my_clinic_id() AND public.is_clinic_admin());

-- the shared message queue also carries approved recall messages
ALTER TABLE public.message_outbox ALTER COLUMN appointment_id DROP NOT NULL;
ALTER TABLE public.message_outbox ADD COLUMN IF NOT EXISTS recall_id   UUID REFERENCES public.recalls(id) ON DELETE SET NULL;
ALTER TABLE public.message_outbox ADD COLUMN IF NOT EXISTS ai_draft_id UUID REFERENCES public.ai_drafts(id) ON DELETE SET NULL;
ALTER TABLE public.message_outbox DROP CONSTRAINT IF EXISTS message_outbox_kind_check;
ALTER TABLE public.message_outbox ADD CONSTRAINT message_outbox_kind_check
  CHECK (kind IN ('reminder_day_before', 'reminder_same_day', 'noshow_followup', 'review_request', 'recall_followup'));
CREATE UNIQUE INDEX IF NOT EXISTS message_outbox_recall_slot_key ON public.message_outbox (recall_id, slot) WHERE recall_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
