
-- Daily audit runs: one row per audit execution
CREATE TABLE public.daily_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('green','amber','red')),
  issue_count int NOT NULL DEFAULT 0,
  triggered_by text NOT NULL DEFAULT 'manual', -- 'manual' | 'cron' | 'cli'
  report jsonb NOT NULL
);

ALTER TABLE public.daily_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit runs"
  ON public.daily_audit_runs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role inserts; no client write policies (service role bypasses RLS).

CREATE INDEX idx_daily_audit_runs_generated_at
  ON public.daily_audit_runs (generated_at DESC);
