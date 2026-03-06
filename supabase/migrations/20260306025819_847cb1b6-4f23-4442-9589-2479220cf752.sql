
-- Podcasts table (series-level config)
CREATE TABLE public.podcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  rss_title TEXT,
  rss_description TEXT,
  rss_author TEXT,
  rss_language TEXT DEFAULT 'en',
  rss_category TEXT,
  episode_count INTEGER DEFAULT 0,
  episode_format TEXT DEFAULT 'mix',
  tone TEXT DEFAULT 'Conversational',
  target_audience TEXT,
  monetization_goals TEXT[],
  sponsorship_media_kit TEXT,
  rate_card_json JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  source_asset_id UUID REFERENCES public.generated_assets(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Podcast episodes table
CREATE TABLE public.podcast_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  episode_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL DEFAULT 'solo_teaching',
  script_markdown TEXT NOT NULL DEFAULT '',
  show_notes TEXT,
  intro_script TEXT,
  outro_script TEXT,
  pull_quotes JSONB DEFAULT '[]',
  guest_questions JSONB DEFAULT '[]',
  ad_markers JSONB DEFAULT '[]',
  duration_minutes INTEGER,
  audio_url TEXT,
  tts_voice_id TEXT,
  tts_status TEXT DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for podcasts
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own podcasts"
ON public.podcasts FOR ALL
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Published podcasts are public"
ON public.podcasts FOR SELECT
TO authenticated
USING (status = 'published');

-- RLS for podcast_episodes
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own episodes"
ON public.podcast_episodes FOR ALL
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Published episodes are public"
ON public.podcast_episodes FOR SELECT
TO authenticated
USING (status = 'published');

-- Updated_at triggers
CREATE TRIGGER update_podcasts_updated_at
  BEFORE UPDATE ON public.podcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_podcast_episodes_updated_at
  BEFORE UPDATE ON public.podcast_episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
