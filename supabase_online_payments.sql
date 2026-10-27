-- ============================================================
-- DENTEASE: ONLINE PAYMENTS (JazzCash, Easypaisa, Stripe), PAYMENT LINKS
-- AND AN ADVANCE BOOKING FEE
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- Money never gets a second record: every confirmed online payment becomes a
-- row in the existing payments table (the billing ledger). The new tables only
-- hold provider connections, shareable links and "someone started paying"
-- attempts. All three are readable only by the app's server (RLS on, no
-- policies), so credentials can never be read through the database API.
-- ============================================================

-- 1. The ledger learns where an online payment came from, and refuses to
--    record the same provider transaction twice.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider     TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_ref_uidx
  ON public.payments (provider, provider_ref) WHERE provider_ref IS NOT NULL;

-- 2. Each clinic's own merchant accounts. config_enc is encrypted by the app
--    (AES-256-GCM, key in the server environment), never plain text.
CREATE TABLE IF NOT EXISTS public.clinic_payment_providers (
  clinic_id   UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  provider    TEXT        NOT NULL CHECK (provider IN ('stripe', 'jazzcash', 'easypaisa')),
  enabled     BOOLEAN     NOT NULL DEFAULT FALSE,
  environment TEXT        NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'live')),
  config_enc  TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (clinic_id, provider)
);
ALTER TABLE public.clinic_payment_providers ENABLE ROW LEVEL SECURITY;

-- 3. Shareable payment links: one secret token per invoice.
CREATE TABLE IF NOT EXISTS public.payment_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  invoice_id  UUID        NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN     NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS payment_links_invoice_idx ON public.payment_links (invoice_id);
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- 4. Attempts: state only (pending / paid / failed / mismatch). Not money.
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  ref          TEXT          NOT NULL UNIQUE,
  clinic_id    UUID          NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  invoice_id   UUID          NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  link_id      UUID,
  provider     TEXT          NOT NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency     TEXT          NOT NULL,
  status       TEXT          NOT NULL DEFAULT 'pending',
  provider_ref TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS payment_attempts_invoice_idx ON public.payment_attempts (invoice_id);
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Advance booking fee. The amount is the clinic's own choice (empty or 0 =
--    no advance fee); there is no default amount.
ALTER TABLE public.booking_settings ADD COLUMN IF NOT EXISTS advance_fee NUMERIC(12,2)
  CHECK (advance_fee IS NULL OR advance_fee >= 0);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS advance_invoice_id UUID
  REFERENCES public.invoices(id) ON DELETE SET NULL;

-- 6. Make the API pick up the new columns right away
NOTIFY pgrst, 'reload schema';
