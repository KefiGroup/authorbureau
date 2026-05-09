
CREATE TABLE IF NOT EXISTS public.dev_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id text,
  title text NOT NULL,
  summary text,
  files_touched text[] DEFAULT '{}'::text[],
  category text NOT NULL DEFAULT 'sprint' CHECK (category IN ('sprint','audit-fix','hotfix','feature')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dev_activity_log_created_at ON public.dev_activity_log (created_at DESC);
ALTER TABLE public.dev_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read dev activity" ON public.dev_activity_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.daily_ops_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_ops_reports_date ON public.daily_ops_reports (report_date DESC);
ALTER TABLE public.daily_ops_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read daily ops reports" ON public.daily_ops_reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
