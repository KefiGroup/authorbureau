
ALTER TABLE public.author_profiles
  ADD COLUMN IF NOT EXISTS report_frequency text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS report_weekly_day smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS report_monthly_day smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_report_sent_at timestamptz;

ALTER TABLE public.author_profiles
  DROP CONSTRAINT IF EXISTS author_profiles_report_frequency_check;
ALTER TABLE public.author_profiles
  ADD CONSTRAINT author_profiles_report_frequency_check
  CHECK (report_frequency IN ('daily','weekly','monthly','off'));

ALTER TABLE public.author_profiles
  DROP CONSTRAINT IF EXISTS author_profiles_report_weekly_day_check;
ALTER TABLE public.author_profiles
  ADD CONSTRAINT author_profiles_report_weekly_day_check
  CHECK (report_weekly_day BETWEEN 0 AND 6);

ALTER TABLE public.author_profiles
  DROP CONSTRAINT IF EXISTS author_profiles_report_monthly_day_check;
ALTER TABLE public.author_profiles
  ADD CONSTRAINT author_profiles_report_monthly_day_check
  CHECK (report_monthly_day BETWEEN 1 AND 28);
