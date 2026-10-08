ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS pulse_post_id text,
  ADD COLUMN IF NOT EXISTS pulse_status text,
  ADD COLUMN IF NOT EXISTS external_url text;
CREATE INDEX IF NOT EXISTS social_posts_pulse_pending_idx ON public.social_posts (pulse_status) WHERE pulse_post_id IS NOT NULL;