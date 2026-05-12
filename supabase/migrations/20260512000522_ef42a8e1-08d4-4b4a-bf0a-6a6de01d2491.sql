-- Short-lived cache so the OAuth callback can pause for the user to pick a Facebook Page.
CREATE TABLE IF NOT EXISTS public.social_connect_pending (
  temp_token text PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  user_access_token text NOT NULL,
  pages_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_connect_pending ENABLE ROW LEVEL SECURITY;

-- Service role only — no end-user access. Edge functions use the service role key.
CREATE POLICY "service role manages pending connects"
  ON public.social_connect_pending
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_social_connect_pending_expires
  ON public.social_connect_pending(expires_at);
