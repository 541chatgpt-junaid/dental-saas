-- ============================================================
-- DENTEASE: BRANCHES, AUDIT LOG AND BACKUP RECORDS
-- Run this script in the Supabase SQL Editor. Safe to run more than once.
--
-- 1. BRANCHES. Every clinic gets one "Main branch" and all its existing
--    data is placed in it, so a one-branch clinic sees no change at all.
--    Branch-scoped tables gain branch_id, and a RESTRICTIVE row-level-security
--    rule is added to each: a signed-in staff member can only see and write
--    rows of a branch they may use, ON TOP OF the existing clinic rule.
--      owner / admin ........ every branch of the clinic
--      other staff .......... the branches assigned to them; with no
--                             assignment, the Main branch only
--    The branch a screen is working in comes from the "x-branch-id" header
--    the app sends; it can only NARROW what the user may already see. New
--    rows get their branch from the patient / invoice they belong to, else the
--    active branch, else the Main branch.
-- 2. AUDIT LOG. Database triggers record who created, changed or deleted
--    sensitive records, and when. Written by the database itself (not by app
--    code), readable only by the clinic's admins, never editable or deletable
--    through the API.
-- 3. clinic_backups. The list of snapshots the scheduled backup has taken.
--    The snapshot files live in a PRIVATE storage bucket.
-- ============================================================

-- ── helpers ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_clinic_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid() AND lower(coalesce(role, '')) IN ('admin', 'superadmin'));
$$;

-- ── 1. BRANCHES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  address    TEXT,
  phone      TEXT,
  is_main    BOOLEAN     NOT NULL DEFAULT FALSE,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_main_branch_per_clinic ON public.branches (clinic_id) WHERE is_main;
CREATE INDEX IF NOT EXISTS branches_clinic_idx ON public.branches (clinic_id);

CREATE TABLE IF NOT EXISTS public.staff_branches (
  staff_id  BIGINT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  branch_id UUID   NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  clinic_id UUID   NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, branch_id)
);

-- every clinic has a Main branch (existing clinics now, new clinics from here on)
INSERT INTO public.branches (clinic_id, name, is_main)
SELECT c.id, 'Main branch', TRUE FROM public.clinics c
WHERE NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.clinic_id = c.id AND b.is_main);

CREATE OR REPLACE FUNCTION public.main_branch_of(p_clinic UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b UUID;
BEGIN
  SELECT id INTO b FROM public.branches WHERE clinic_id = p_clinic AND is_main;
  IF b IS NULL THEN
    INSERT INTO public.branches (clinic_id, name, is_main) VALUES (p_clinic, 'Main branch', TRUE)
    ON CONFLICT DO NOTHING RETURNING id INTO b;
    IF b IS NULL THEN SELECT id INTO b FROM public.branches WHERE clinic_id = p_clinic AND is_main; END IF;
  END IF;
  RETURN b;
END $$;

CREATE OR REPLACE FUNCTION public.new_clinic_main_branch() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.main_branch_of(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS clinic_main_branch ON public.clinics;
CREATE TRIGGER clinic_main_branch AFTER INSERT ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.new_clinic_main_branch();

-- branches the signed-in staff member may use
CREATE OR REPLACE FUNCTION public.my_branch_ids() RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT id, clinic_id, lower(coalesce(role, '')) AS role FROM public.staff WHERE user_id = auth.uid() LIMIT 1)
  SELECT coalesce(array_agg(b.id), '{}') FROM public.branches b, me
  WHERE b.clinic_id = me.clinic_id AND (
        me.role IN ('admin', 'superadmin')
     OR b.id IN (SELECT sb.branch_id FROM public.staff_branches sb WHERE sb.staff_id = me.id)
     OR (b.is_main AND NOT EXISTS (SELECT 1 FROM public.staff_branches sb WHERE sb.staff_id = me.id)));
$$;

-- the branch the app says it is working in (header "x-branch-id"); NULL = all the user may see
CREATE OR REPLACE FUNCTION public.request_branch() RETURNS UUID
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN h ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN h::uuid END
  FROM (SELECT nullif(nullif(current_setting('request.headers', true), '')::json ->> 'x-branch-id', '') AS h) s;
$$;

-- New rows get their branch from the parent record, else the active branch, else the Main branch
CREATE OR REPLACE FUNCTION public.set_branch() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  parent TEXT := TG_ARGV[0];
  b UUID;
  mine UUID[];
  hdr UUID;
  j JSONB;
BEGIN
  -- the parent is looked up through the row's JSON, so one function serves tables with different columns
  j := to_jsonb(NEW);
  IF parent = 'patient' AND j ->> 'patient_id' IS NOT NULL THEN
    SELECT branch_id INTO b FROM public.patients WHERE id = (j ->> 'patient_id')::bigint;
  ELSIF parent = 'invoice' AND j ->> 'invoice_id' IS NOT NULL THEN
    SELECT branch_id INTO b FROM public.invoices WHERE id = (j ->> 'invoice_id')::uuid;
  ELSIF parent = 'plan' AND j ->> 'plan_id' IS NOT NULL THEN
    SELECT branch_id INTO b FROM public.treatment_plans WHERE id = (j ->> 'plan_id')::uuid;
  END IF;
  IF b IS NULL THEN b := NEW.branch_id; END IF;
  IF b IS NULL THEN
    hdr := public.request_branch();
    mine := public.my_branch_ids();
    IF hdr IS NOT NULL AND hdr = ANY (mine) THEN b := hdr;
    ELSIF cardinality(mine) > 0 THEN
      SELECT x INTO b FROM unnest(mine) x ORDER BY (x = public.main_branch_of(NEW.clinic_id)) DESC, x LIMIT 1;
    END IF;
  END IF;
  IF b IS NULL THEN b := public.main_branch_of(NEW.clinic_id); END IF;
  NEW.branch_id := b;
  RETURN NEW;
END $$;

-- branch-scoped tables: [table, how the branch is found]
DO $$
DECLARE
  spec TEXT[]; t TEXT; parent TEXT;
  specs TEXT[][] := ARRAY[
    ['patients', 'self'], ['appointments', 'patient'], ['visits', 'patient'], ['prescriptions', 'patient'],
    ['medical_history', 'patient'], ['patient_files', 'patient'], ['recalls', 'patient'], ['queue_tokens', 'patient'],
    ['treatment_plans', 'patient'], ['treatment_plan_items', 'plan'], ['invoices', 'patient'], ['invoice_items', 'invoice'],
    ['payments', 'invoice'], ['consent_records', 'patient'], ['patient_forms', 'patient'], ['patient_form_submissions', 'patient'],
    ['message_outbox', 'patient'], ['patient_portal_users', 'patient'],
    ['expenses', 'self'], ['purchases', 'self'], ['materials', 'self'], ['labs', 'self'], ['doctor_payouts', 'self']
  ];
BEGIN
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    t := spec[1]; parent := spec[2];
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT', t);
    -- existing rows belong to the clinic's Main branch (parents first, so children follow them)
    EXECUTE format('UPDATE public.%I x SET branch_id = (SELECT b.id FROM public.branches b WHERE b.clinic_id = x.clinic_id AND b.is_main) WHERE x.branch_id IS NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (clinic_id, branch_id)', t || '_branch_idx', t);
    EXECUTE format('DROP TRIGGER IF EXISTS set_branch_trg ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_branch_trg BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_branch(%L)', t, parent);
    -- the branch rule, AND-ed with the existing clinic rules
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS branch_scope ON public.%I', t);
    EXECUTE format($p$CREATE POLICY branch_scope ON public.%I AS RESTRICTIVE FOR ALL
      USING (NOT (SELECT public.is_clinic_staff()) OR (branch_id = ANY (((SELECT public.my_branch_ids()))::uuid[]) AND ((SELECT public.request_branch()) IS NULL OR branch_id = (SELECT public.request_branch()))))
      WITH CHECK (NOT (SELECT public.is_clinic_staff()) OR (branch_id = ANY (((SELECT public.my_branch_ids()))::uuid[]) AND ((SELECT public.request_branch()) IS NULL OR branch_id = (SELECT public.request_branch()))))$p$, t);
  END LOOP;
END $$;

ALTER TABLE public.branches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_branches" ON public.branches;
CREATE POLICY "staff_read_branches" ON public.branches FOR SELECT
  USING (clinic_id = get_my_clinic_id() AND id = ANY (public.my_branch_ids()));
DROP POLICY IF EXISTS "admin_read_staff_branches" ON public.staff_branches;
CREATE POLICY "admin_read_staff_branches" ON public.staff_branches FOR SELECT
  USING (clinic_id = get_my_clinic_id() AND public.is_clinic_admin());

-- ── 2. AUDIT LOG ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          BIGSERIAL   PRIMARY KEY,
  clinic_id   UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  branch_id   UUID,
  actor_id    UUID,
  actor_name  TEXT,
  actor_email TEXT,
  action      TEXT        NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  table_name  TEXT        NOT NULL,
  record_id   TEXT,
  summary     TEXT,
  changes     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_clinic_idx ON public.audit_log (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_record_idx ON public.audit_log (clinic_id, table_name, record_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_audit_log" ON public.audit_log;
CREATE POLICY "admin_read_audit_log" ON public.audit_log FOR SELECT
  USING (clinic_id = get_my_clinic_id() AND public.is_clinic_admin());
-- no insert / update / delete policy: nobody can write or rewrite the log through the API

CREATE OR REPLACE FUNCTION public.audit_clip(v JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(v) = 'string' AND length(v #>> '{}') > 200 THEN to_jsonb('[long text]'::text) ELSE v END;
$$;

CREATE OR REPLACE FUNCTION public.audit_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r JSONB; o JSONB; d JSONB := '{}'::jsonb; k TEXT; act TEXT; cid UUID;
  skip TEXT[] := ARRAY['updated_at', 'signature_png', 'token', 'token_enc', 'config_enc', 'integrity_hash', 'ip_hash', 'password'] || TG_ARGV;
  who RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); act := 'delete';
  ELSE r := to_jsonb(NEW); act := CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE 'update' END; END IF;
  cid := (r ->> 'clinic_id')::uuid;
  IF cid IS NULL THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' THEN
    o := to_jsonb(OLD);
    FOR k IN SELECT jsonb_object_keys(r) LOOP
      IF NOT (k = ANY (skip)) AND (r -> k) IS DISTINCT FROM (o -> k) THEN
        d := d || jsonb_build_object(k, jsonb_build_array(public.audit_clip(o -> k), public.audit_clip(r -> k)));
      END IF;
    END LOOP;
    IF d = '{}'::jsonb THEN RETURN NULL; END IF;   -- nothing worth recording changed
  ELSE
    FOR k IN SELECT jsonb_object_keys(r) LOOP
      IF NOT (k = ANY (skip)) AND (r -> k) IS NOT NULL AND r -> k <> 'null'::jsonb THEN d := d || jsonb_build_object(k, public.audit_clip(r -> k)); END IF;
    END LOOP;
  END IF;
  SELECT s.name, s.email INTO who FROM public.staff s WHERE s.user_id = auth.uid() LIMIT 1;
  INSERT INTO public.audit_log (clinic_id, branch_id, actor_id, actor_name, actor_email, action, table_name, record_id, summary, changes)
  VALUES (cid, nullif(r ->> 'branch_id', '')::uuid, auth.uid(), who.name, who.email, act, TG_TABLE_NAME,
          coalesce(r ->> 'id', r ->> 'staff_id'),
          left(coalesce(r ->> 'name', r ->> 'invoice_number', r ->> 'patient_name', r ->> 'title', r ->> 'medicine', r ->> 'email', ''), 120), d);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- the log must never be the reason a clinic cannot save its work
  RAISE WARNING 'audit_row failed for %: %', TG_TABLE_NAME, SQLERRM;
  RETURN NULL;
END $$;

DO $$
DECLARE spec TEXT[]; t TEXT;
  specs TEXT[][] := ARRAY[
    ['patients', ''], ['medical_history', ''], ['visits', ''], ['prescriptions', ''], ['appointments', ''],
    ['invoices', 'subtotal'], ['invoice_items', ''], ['payments', ''], ['expenses', ''], ['purchases', ''], ['materials', ''],
    ['labs', ''], ['doctors', ''], ['doctor_payouts', ''], ['treatment_plans', ''], ['staff', ''], ['settings', ''],
    ['branches', ''], ['staff_branches', ''], ['booking_settings', ''], ['patient_portal_users', ''], ['consent_records', ''], ['patient_files', '']
  ];
BEGIN
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    t := spec[1];
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN CONTINUE; END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS audit_trg ON public.%I', t);
    IF t = 'invoices' THEN
      -- totals are recomputed after every payment; those derived figures are not an edit
      EXECUTE 'CREATE TRIGGER audit_trg AFTER INSERT OR UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.audit_row(''subtotal'', ''total'', ''amount_paid'', ''balance'', ''vat_amount'')';
    ELSE
      EXECUTE format('CREATE TRIGGER audit_trg AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row()', t);
    END IF;
  END LOOP;
END $$;

-- ── 3. BACKUP RECORDS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinic_backups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  kind       TEXT        NOT NULL DEFAULT 'auto' CHECK (kind IN ('auto', 'manual')),
  path       TEXT        NOT NULL,
  size_bytes BIGINT      NOT NULL DEFAULT 0,
  row_counts JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS clinic_backups_clinic_idx ON public.clinic_backups (clinic_id, created_at DESC);
ALTER TABLE public.clinic_backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_clinic_backups" ON public.clinic_backups;
CREATE POLICY "admin_read_clinic_backups" ON public.clinic_backups FOR SELECT
  USING (clinic_id = get_my_clinic_id() AND public.is_clinic_admin());

-- snapshots are private: only the app's server (service role) reads or writes the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('clinic-backups', 'clinic-backups', false, 262144000)
ON CONFLICT (id) DO UPDATE SET public = false;

NOTIFY pgrst, 'reload schema';
