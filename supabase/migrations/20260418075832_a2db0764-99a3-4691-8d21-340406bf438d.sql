ALTER TABLE public.author_email_settings
  ADD COLUMN IF NOT EXISTS verification_token text,
  ADD COLUMN IF NOT EXISTS verification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_author_email_settings_verification_token
  ON public.author_email_settings (verification_token)
  WHERE verification_token IS NOT NULL;