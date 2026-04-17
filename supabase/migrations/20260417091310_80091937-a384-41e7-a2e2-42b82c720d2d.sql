-- Sprint 36b: Buffer-backed social scheduling tables (label as Social Accounts / Social Calendar to authors)

CREATE TABLE IF NOT EXISTS public.social_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  channel_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (author_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_social_connections_author ON public.social_connections(author_id);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view their own social connections"
ON public.social_connections FOR SELECT
USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Authors can insert their own social connections"
ON public.social_connections FOR INSERT
WITH CHECK (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Authors can update their own social connections"
ON public.social_connections FOR UPDATE
USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Authors can delete their own social connections"
ON public.social_connections FOR DELETE
USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

CREATE TRIGGER update_social_connections_updated_at
BEFORE UPDATE ON public.social_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  node_id TEXT NOT NULL DEFAULT 'BP-03',
  buffer_post_id TEXT,
  channel_id TEXT,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_author ON public.social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON public.social_posts(author_id, scheduled_at);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view their own social posts"
ON public.social_posts FOR SELECT
USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Authors can insert their own social posts"
ON public.social_posts FOR INSERT
WITH CHECK (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Authors can update their own social posts"
ON public.social_posts FOR UPDATE
USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Authors can delete their own social posts"
ON public.social_posts FOR DELETE
USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

CREATE TRIGGER update_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();