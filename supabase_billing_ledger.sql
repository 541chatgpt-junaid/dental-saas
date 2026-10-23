-- ============================================================
-- DENTEASE: ONE BILLING LEDGER (invoices + payments)
-- Run this script in the Supabase SQL Editor. It is safe to run more than
-- once: rows that were already moved into the ledger are marked
-- (ledger_migrated_at) and skipped, so totals never double.
--
-- Supabase may show a "destructive operations" warning. It comes from
-- DROP POLICY IF EXISTS (used so the policy can be re-created); no data is
-- removed by this script.
-- ============================================================

-- ── 1. SCHEMA ───────────────────────────────────────────────
-- payments already exists (id, clinic_id, invoice_id, amount,
-- payment_method, payment_date, notes). Add the patient link and a tag for
-- rows created by this migration.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS patient_id BIGINT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS source     TEXT;   -- 'legacy_registration' | 'legacy_visit' | NULL (entered in the app)

-- Markers: this patient's / visit's legacy fee fields are in the ledger
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS ledger_migrated_at TIMESTAMPTZ;
ALTER TABLE public.visits   ADD COLUMN IF NOT EXISTS ledger_migrated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS payments_invoice_id_idx   ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS payments_payment_date_idx ON public.payments (payment_date);
CREATE INDEX IF NOT EXISTS payments_patient_id_idx   ON public.payments (patient_id);
CREATE INDEX IF NOT EXISTS invoices_patient_id_idx   ON public.invoices (patient_id);
CREATE INDEX IF NOT EXISTS invoices_visit_id_idx     ON public.invoices (visit_id);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON public.invoice_items (invoice_id);

-- Same clinic rule as every other table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_clinic_access" ON public.payments;
CREATE POLICY "payments_clinic_access" ON public.payments
  FOR ALL USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id());

-- Existing payments: link them to their invoice's patient
UPDATE public.payments p SET patient_id = i.patient_id
  FROM public.invoices i
 WHERE p.invoice_id = i.id AND p.patient_id IS NULL AND i.patient_id IS NOT NULL;

-- ── 2. ONE-TIME MOVE OF LEGACY FEES INTO THE LEDGER ─────────
DO $$
DECLARE
  v           RECORD;
  p           RECORD;
  reg         RECORD;
  inv_id      public.invoices.id%TYPE;
  clinic      public.invoices.clinic_id%TYPE;
  visit_fee   NUMERIC;
  visit_paid  NUMERIC;
  reg_fee     NUMERIC;
  reg_paid    NUMERIC;
  already     NUMERIC;
BEGIN
  -- 2a. Visits: each visit with a fee becomes its own invoice (linked by
  --     visit_id) with one line item, plus a payment for what was paid.
  FOR v IN
    SELECT vi.*, pa.clinic_id AS patient_clinic
      FROM public.visits vi LEFT JOIN public.patients pa ON pa.id = vi.patient_id
     WHERE vi.ledger_migrated_at IS NULL
  LOOP
    clinic := COALESCE(v.clinic_id, v.patient_clinic);
    IF COALESCE(v.fee, 0) > 0 AND v.patient_id IS NOT NULL AND clinic IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE visit_id = v.id) THEN
      INSERT INTO public.invoices (clinic_id, patient_id, visit_id, invoice_number, status,
                                   subtotal, discount, total, amount_paid, notes, created_at)
      VALUES (clinic, v.patient_id, v.id, public.generate_invoice_number(clinic), 'unpaid',
              v.fee, 0, v.fee, 0, '[Visit]', COALESCE(NULLIF(v.visit_date::text, '')::timestamptz, v.created_at, NOW()))
      RETURNING id INTO inv_id;

      INSERT INTO public.invoice_items (invoice_id, clinic_id, description, quantity, unit_price)
      VALUES (inv_id, clinic, COALESCE(NULLIF(TRIM(v.treatment), ''), 'Visit'), 1, v.fee);

      IF COALESCE(v.fee_paid, 0) > 0 THEN
        INSERT INTO public.payments (invoice_id, clinic_id, patient_id, amount, payment_method, payment_date, notes, source)
        VALUES (inv_id, clinic, v.patient_id, v.fee_paid, 'Cash',
                COALESCE(NULLIF(v.visit_date::text, '')::timestamptz, v.created_at, NOW()), 'Paid at visit (moved from old records)', 'legacy_visit');
      END IF;
    END IF;
    UPDATE public.visits SET ledger_migrated_at = NOW() WHERE id = v.id;
  END LOOP;

  -- 2b. Registration fee. In the old system patients.fee_total / fee_paid
  --     also included every visit's fee / paid, so the visit part is taken
  --     off to get the registration part.
  FOR p IN SELECT * FROM public.patients WHERE ledger_migrated_at IS NULL LOOP
    SELECT COALESCE(SUM(fee), 0), COALESCE(SUM(fee_paid), 0) INTO visit_fee, visit_paid
      FROM public.visits WHERE patient_id = p.id;

    SELECT * INTO reg FROM public.invoices
     WHERE patient_id = p.id AND notes = '[Registration]'
     ORDER BY created_at LIMIT 1;

    -- A registration invoice with line items was made by the new app: nothing to move
    IF reg.id IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoice_items WHERE invoice_id = reg.id) THEN
      UPDATE public.patients SET ledger_migrated_at = NOW() WHERE id = p.id;
      CONTINUE;
    END IF;

    reg_fee  := COALESCE(p.fee_total, 0) - visit_fee;
    reg_paid := GREATEST(COALESCE(p.fee_paid, 0) - visit_paid, 0);
    IF reg_fee < 0 THEN reg_fee := COALESCE(reg.total, 0); END IF;  -- inconsistent old data: trust the invoice
    inv_id   := NULL;
    already  := 0;

    IF reg_fee > 0 AND p.clinic_id IS NOT NULL THEN
      IF reg.id IS NULL THEN
        INSERT INTO public.invoices (clinic_id, patient_id, invoice_number, status,
                                     subtotal, discount, total, amount_paid, notes, created_at)
        VALUES (p.clinic_id, p.id, public.generate_invoice_number(p.clinic_id), 'unpaid',
                reg_fee, 0, reg_fee, 0, '[Registration]', COALESCE(p.created_at, NOW()))
        RETURNING id INTO inv_id;
      ELSE
        inv_id := reg.id;
        UPDATE public.invoices SET subtotal = reg_fee, total = GREATEST(reg_fee - COALESCE(discount, 0), 0) WHERE id = inv_id;
      END IF;

      INSERT INTO public.invoice_items (invoice_id, clinic_id, description, quantity, unit_price)
      VALUES (inv_id, p.clinic_id, COALESCE(NULLIF(TRIM(p.treatment), ''), 'Registration / consultation'), 1, reg_fee);

      -- Payments taken with the old "Pay" button already have rows; add only the part that has none
      SELECT COALESCE(SUM(amount), 0) INTO already FROM public.payments WHERE invoice_id = inv_id;
      IF LEAST(reg_paid, reg_fee) - already > 0 THEN
        INSERT INTO public.payments (invoice_id, clinic_id, patient_id, amount, payment_method, payment_date, notes, source)
        VALUES (inv_id, p.clinic_id, p.id, LEAST(reg_paid, reg_fee) - already, 'Cash', COALESCE(p.created_at, NOW()),
                'Paid at registration (moved from old records)', 'legacy_registration');
        already := LEAST(reg_paid, reg_fee);
      END IF;
    END IF;

    -- Paid beyond the registration fee (the old "Pay" button counted it for the
    -- patient but capped it on the registration invoice): settle the patient's
    -- open visit invoices with it, oldest first, so the patient's total paid is unchanged.
    reg_paid := reg_paid - already;
    IF reg_paid > 0 THEN
      FOR v IN
        SELECT i.id, i.clinic_id, i.created_at,
               COALESCE(i.total, 0) - COALESCE((SELECT SUM(amount) FROM public.payments WHERE invoice_id = i.id), 0) AS due
          FROM public.invoices i
         WHERE i.patient_id = p.id AND i.visit_id IS NOT NULL AND i.status NOT IN ('draft', 'cancelled')
         ORDER BY i.created_at
      LOOP
        EXIT WHEN reg_paid <= 0;
        CONTINUE WHEN v.due <= 0;
        INSERT INTO public.payments (invoice_id, clinic_id, patient_id, amount, payment_method, payment_date, notes, source)
        VALUES (v.id, v.clinic_id, p.id, LEAST(v.due, reg_paid), 'Cash', COALESCE(p.created_at, NOW()),
                'Earlier payment (moved from old records)', 'legacy_registration');
        reg_paid := reg_paid - LEAST(v.due, reg_paid);
      END LOOP;
      IF reg_paid > 0 AND inv_id IS NOT NULL THEN
        -- Still left over: keep it as credit on the registration invoice so no income is lost
        INSERT INTO public.payments (invoice_id, clinic_id, patient_id, amount, payment_method, payment_date, notes, source)
        VALUES (inv_id, p.clinic_id, p.id, reg_paid, 'Cash', COALESCE(p.created_at, NOW()),
                'Advance / overpayment (moved from old records)', 'legacy_registration');
      ELSIF reg_paid > 0 THEN
        RAISE NOTICE 'Patient % has % paid with no invoice to put it on; left for manual review', p.id, reg_paid;
      END IF;
    END IF;

    UPDATE public.patients SET ledger_migrated_at = NOW() WHERE id = p.id;
  END LOOP;
END $$;

-- ── 3. KEEP STORED FIGURES IN STEP WITH THE LEDGER ──────────
-- (The app derives everything from items + payments; this only makes the
-- stored columns match for exports and anything reading them directly.
-- Re-running it changes nothing.)
UPDATE public.invoices i
   SET subtotal = s.items_total,
       total    = GREATEST(s.items_total - COALESCE(i.discount, 0), 0)
  FROM (SELECT invoice_id, SUM(COALESCE(quantity, 1) * COALESCE(unit_price, 0)) AS items_total
          FROM public.invoice_items GROUP BY invoice_id) s
 WHERE s.invoice_id = i.id;

UPDATE public.invoices i
   SET amount_paid = COALESCE((SELECT SUM(amount) FROM public.payments WHERE invoice_id = i.id), 0);

UPDATE public.invoices
   SET status = CASE
                  WHEN COALESCE(total, 0) - COALESCE(amount_paid, 0) <= 0 THEN 'paid'
                  WHEN COALESCE(amount_paid, 0) > 0 THEN 'partial'
                  WHEN status = 'sent' THEN 'sent'
                  ELSE 'unpaid'
                END
 WHERE status NOT IN ('draft', 'cancelled');
