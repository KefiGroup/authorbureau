
CREATE TABLE IF NOT EXISTS public.crm_daily_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  digest_date date NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (author_id, digest_date)
);

CREATE INDEX IF NOT EXISTS idx_crm_daily_digests_author_date
  ON public.crm_daily_digests (author_id, digest_date DESC);

ALTER TABLE public.crm_daily_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors view own daily digests"
  ON public.crm_daily_digests
  FOR SELECT
  USING (
    author_id IN (
      SELECT id FROM public.author_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages daily digests"
  ON public.crm_daily_digests
  FOR ALL
  USING (true)
  WITH CHECK (true);
