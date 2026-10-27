-- DentEase: onboarding wizard, removable sample data, signup details carried into Settings.
-- Safe to run more than once.

-- 1. Track whether a clinic has finished the 3-step setup wizard.
--    Clinics that already exist are marked finished the first time this runs,
--    so only clinics created after this migration see the wizard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE public.clinics ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
    UPDATE public.clinics SET onboarding_completed_at = NOW();
  END IF;
END $$;

-- 2. Sample data is flagged so it can be removed with one click.
ALTER TABLE public.patients     ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Clinics created at signup had no row in settings, so the Settings page opened blank.
--    Copy the details entered at signup into settings for every clinic that has none.
INSERT INTO public.settings (clinic_id, clinic_name, clinic_email, clinic_phone, clinic_address)
SELECT c.id, c.name, c.email, c.phone, c.address
FROM public.clinics c
WHERE NOT EXISTS (SELECT 1 FROM public.settings s WHERE s.clinic_id = c.id);

-- 4. Make the API pick up the new columns right away
NOTIFY pgrst, 'reload schema';
