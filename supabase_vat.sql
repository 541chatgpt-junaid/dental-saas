-- ============================================================
-- DENTEASE: GULF VAT (value-added tax) ON INVOICES
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- settings.vat_enabled   a clinic switches VAT on (off for every existing clinic)
-- settings.vat_rate      the clinic's rate in percent (5 = UAE / Saudi standard rate)
-- settings.vat_trn       the clinic's optional VAT registration number (TRN)
-- invoices.vat_rate      the rate that applied when the invoice was made. It is
--                        kept on the invoice, so changing the clinic's rate later
--                        never changes an invoice already issued
-- invoices.vat_amount    the VAT on that invoice
--
-- Every existing invoice gets vat_rate 0 and vat_amount 0, so no existing
-- total, balance or payment changes. For an invoice with VAT:
--   VAT   = (items - discount) x vat_rate / 100, rounded to 2 decimals
--   total = items - discount + VAT          (balance = total - paid, as before)
-- No exchange rates are involved: amounts stay in the clinic's own currency.
-- ============================================================

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN       NOT NULL DEFAULT FALSE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS vat_rate    NUMERIC(5, 2) NOT NULL DEFAULT 5;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS vat_trn     TEXT;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_rate   NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_amount NUMERIC       NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.settings ADD CONSTRAINT settings_vat_rate_range CHECK (vat_rate >= 0 AND vat_rate <= 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_vat_rate_range CHECK (vat_rate >= 0 AND vat_rate <= 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
