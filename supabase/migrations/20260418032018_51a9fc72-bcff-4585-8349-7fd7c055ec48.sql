ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS account_id TEXT,
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS account_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS page_id TEXT,
  ADD COLUMN IF NOT EXISTS ig_business_id TEXT,
  ADD COLUMN IF NOT EXISTS scopes TEXT[],
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.social_connections DROP CONSTRAINT IF EXISTS social_connections_platform_check;
ALTER TABLE public.social_connections
  ADD CONSTRAINT social_connections_platform_check
  CHECK (platform IN ('linkedin','facebook','instagram','x','threads','youtube','buffer'));

UPDATE public.social_connections sc
SET user_id = ap.user_id
FROM public.author_profiles ap
WHERE sc.author_id = ap.id AND sc.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_social_connections_user ON public.social_connections(user_id);

DROP POLICY IF EXISTS "Users view their own social connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users insert their own social connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users update their own social connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users delete their own social connections" ON public.social_connections;

CREATE POLICY "Users view their own social connections"
  ON public.social_connections FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own social connections"
  ON public.social_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own social connections"
  ON public.social_connections FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own social connections"
  ON public.social_connections FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE public.social_media_content
  ADD COLUMN IF NOT EXISTS published_post_url TEXT,
  ADD COLUMN IF NOT EXISTS published_post_id TEXT,
  ADD COLUMN IF NOT EXISTS publish_error TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;