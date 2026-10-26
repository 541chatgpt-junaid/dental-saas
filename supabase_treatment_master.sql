-- ============================================================
-- DENTEASE: TREATMENT MASTER LIST + MERGE OF FREE-TEXT VARIANTS
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- Treatments were typed free-hand on several screens, so the same
-- treatment existed under many spellings and fees varied by typo. This
-- script makes the existing treatment_presets table the single master
-- list (name + unique code + default fee), folds every free-text variant
-- (case / spacing / punctuation) into one master entry, and rewrites the
-- treatment text on patients, visits, appointments and treatment-plan
-- procedures to the canonical master name so reports can group reliably.
--
-- Invoices are left completely untouched: no invoice_items row and no fee
-- already charged is changed. Only the treatment *reference* on the other
-- tables is normalised. Clinic isolation, RLS and permissions are unchanged.
--
-- A Supabase "destructive operations" warning may appear; it is only the
-- duplicate-preset cleanup (variants merged into one row) and nothing a
-- clinic can see is lost — the surviving row keeps the canonical name.
-- ============================================================

-- ── 1. SCHEMA: code column on the master ────────────────────
ALTER TABLE public.treatment_presets ADD COLUMN IF NOT EXISTS code TEXT;

-- Normalisation key: lower-case, strip everything but letters/digits.
-- "Root Canal", "root  canal", "Root-Canal!" all collapse to "rootcanal".
CREATE OR REPLACE FUNCTION public.treatment_key(t TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', '', 'g');
$$;

-- ── 2. GATHER EVERY FREE-TEXT TREATMENT VALUE PER CLINIC ────
DROP TABLE IF EXISTS _tm_raw;
CREATE TEMP TABLE _tm_raw (clinic_id UUID, val TEXT, is_preset BOOLEAN, fee NUMERIC);
INSERT INTO _tm_raw
  SELECT clinic_id, treatment, false, NULLIF(fee, 0)      FROM public.visits               WHERE NULLIF(TRIM(treatment), '') IS NOT NULL AND clinic_id IS NOT NULL
  UNION ALL
  SELECT clinic_id, treatment, false, NULL                FROM public.appointments         WHERE NULLIF(TRIM(treatment), '') IS NOT NULL AND clinic_id IS NOT NULL
  UNION ALL
  SELECT clinic_id, treatment, false, NULLIF(fee_total,0) FROM public.patients             WHERE NULLIF(TRIM(treatment), '') IS NOT NULL AND clinic_id IS NOT NULL
  UNION ALL
  SELECT clinic_id, procedure, false, NULLIF(fee, 0)      FROM public.treatment_plan_items WHERE NULLIF(TRIM(procedure), '') IS NOT NULL AND clinic_id IS NOT NULL
  UNION ALL
  SELECT clinic_id, name, true, NULLIF(price, 0)          FROM public.treatment_presets    WHERE NULLIF(TRIM(name), '') IS NOT NULL AND clinic_id IS NOT NULL;

-- Canonical name per (clinic, key): prefer an existing preset name,
-- then the most common raw value, then the longest.
DROP TABLE IF EXISTS _tm_canon;
CREATE TEMP TABLE _tm_canon AS
WITH counted AS (
  SELECT clinic_id, public.treatment_key(val) AS k,
         -- tidy the display name: trim and collapse runs of whitespace
         trim(regexp_replace(val, '\s+', ' ', 'g')) AS val,
         bool_or(is_preset) AS is_preset, COUNT(*) AS cnt
  FROM _tm_raw GROUP BY clinic_id, public.treatment_key(val),
         trim(regexp_replace(val, '\s+', ' ', 'g'))
)
SELECT DISTINCT ON (clinic_id, k) clinic_id, k, val AS canon
FROM counted
WHERE k <> ''
-- prefer an existing preset, then the most used, then a properly-capitalised
-- spelling, then the longest, so the tidiest variant becomes canonical
ORDER BY clinic_id, k, is_preset DESC, cnt DESC, (val ~ '^[A-Z]') DESC, length(val) DESC, val;

-- Default fee per (clinic, key): the most common non-zero fee seen.
DROP TABLE IF EXISTS _tm_fee;
CREATE TEMP TABLE _tm_fee AS
SELECT DISTINCT ON (clinic_id, k) clinic_id, k, fee
FROM (
  SELECT clinic_id, public.treatment_key(val) AS k, fee, COUNT(*) AS cnt
  FROM _tm_raw WHERE fee IS NOT NULL AND fee > 0
  GROUP BY clinic_id, public.treatment_key(val), fee
) f
ORDER BY clinic_id, k, cnt DESC, fee DESC;

-- ── 3. BUILD THE MASTER: one preset row per (clinic, key) ───
-- 3a. Create a master row for groups that have no preset yet.
INSERT INTO public.treatment_presets (clinic_id, name, price)
SELECT c.clinic_id, c.canon, COALESCE(f.fee, 0)
FROM _tm_canon c
LEFT JOIN _tm_fee f ON f.clinic_id = c.clinic_id AND f.k = c.k
WHERE NOT EXISTS (
  SELECT 1 FROM public.treatment_presets p
  WHERE p.clinic_id = c.clinic_id AND public.treatment_key(p.name) = c.k
);

-- 3b. Within each group keep the oldest preset row, rename it to canonical,
--     and remove the duplicate variant rows (the picklist has no FKs).
WITH ranked AS (
  SELECT p.id, p.clinic_id, public.treatment_key(p.name) AS k,
         row_number() OVER (PARTITION BY p.clinic_id, public.treatment_key(p.name)
                            ORDER BY p.created_at NULLS FIRST, p.id) AS rn
  FROM public.treatment_presets p
)
DELETE FROM public.treatment_presets p
USING ranked r
WHERE p.id = r.id AND r.rn > 1;

UPDATE public.treatment_presets p
SET name = c.canon
FROM _tm_canon c
WHERE p.clinic_id = c.clinic_id AND public.treatment_key(p.name) = c.k AND p.name <> c.canon;

-- ── 4. ASSIGN A UNIQUE CODE PER CLINIC TO ANY ROW MISSING ONE ──
DO $$
DECLARE
  r      RECORD;
  base   TEXT;
  cand   TEXT;
  n      INT;
BEGIN
  FOR r IN SELECT id, clinic_id, name FROM public.treatment_presets WHERE code IS NULL OR code = '' LOOP
    base := trim(both '-' from regexp_replace(lower(r.name), '[^a-z0-9]+', '-', 'g'));
    IF base = '' THEN base := 'treatment'; END IF;
    base := left(base, 40);
    cand := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM public.treatment_presets WHERE clinic_id = r.clinic_id AND code = cand AND id <> r.id) LOOP
      n := n + 1; cand := base || '-' || n;
    END LOOP;
    UPDATE public.treatment_presets SET code = cand WHERE id = r.id;
  END LOOP;
END $$;

-- One code per clinic
CREATE UNIQUE INDEX IF NOT EXISTS treatment_presets_clinic_code_idx
  ON public.treatment_presets (clinic_id, code);

-- ── 5. REWRITE FREE-TEXT COLUMNS TO THE CANONICAL NAME ──────
-- (text/grouping fields only — never invoices, never any fee)
UPDATE public.visits v SET treatment = c.canon
  FROM _tm_canon c WHERE v.clinic_id = c.clinic_id AND public.treatment_key(v.treatment) = c.k AND v.treatment <> c.canon;
UPDATE public.appointments a SET treatment = c.canon
  FROM _tm_canon c WHERE a.clinic_id = c.clinic_id AND public.treatment_key(a.treatment) = c.k AND a.treatment <> c.canon;
UPDATE public.patients pt SET treatment = c.canon
  FROM _tm_canon c WHERE pt.clinic_id = c.clinic_id AND public.treatment_key(pt.treatment) = c.k AND pt.treatment <> c.canon;
UPDATE public.treatment_plan_items ti SET procedure = c.canon
  FROM _tm_canon c WHERE ti.clinic_id = c.clinic_id AND public.treatment_key(ti.procedure) = c.k AND ti.procedure <> c.canon;

DROP TABLE IF EXISTS _tm_raw;
DROP TABLE IF EXISTS _tm_canon;
DROP TABLE IF EXISTS _tm_fee;

-- After this, the app offers only master treatments in a dropdown; a new
-- treatment is added to this table first, so no free-hand value returns.
