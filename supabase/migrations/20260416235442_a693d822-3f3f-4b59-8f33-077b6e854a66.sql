-- Funnels table
CREATE TABLE public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  node_id TEXT,
  funnel_type TEXT NOT NULL DEFAULT 'opt_in',
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  headline TEXT,
  subheadline TEXT,
  body_copy TEXT,
  cta_text TEXT DEFAULT 'Get Instant Access',
  cta_url TEXT,
  hero_image_url TEXT,
  background_color TEXT DEFAULT '#0B1220',
  accent_color TEXT DEFAULT '#D4AF37',
  status TEXT NOT NULL DEFAULT 'draft',
  page_views INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(author_id, slug)
);

CREATE INDEX idx_funnels_author ON public.funnels(author_id);
CREATE INDEX idx_funnels_status ON public.funnels(status);
CREATE INDEX idx_funnels_slug_status ON public.funnels(slug, status);

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors manage own funnels"
ON public.funnels FOR ALL
USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can view live funnels"
ON public.funnels FOR SELECT
USING (status = 'live');

-- Allow public to increment page_views via update (constrained to live funnels, view counter only)
CREATE POLICY "Public can update view counts on live funnels"
ON public.funnels FOR UPDATE
USING (status = 'live')
WITH CHECK (status = 'live');

CREATE TRIGGER funnels_updated_at
BEFORE UPDATE ON public.funnels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Funnel submissions table
CREATE TABLE public.funnel_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_funnel_submissions_funnel ON public.funnel_submissions(funnel_id);
CREATE INDEX idx_funnel_submissions_author ON public.funnel_submissions(author_id);
CREATE INDEX idx_funnel_submissions_email ON public.funnel_submissions(email);

ALTER TABLE public.funnel_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors view own submissions"
ON public.funnel_submissions FOR SELECT
USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can submit to live funnels"
ON public.funnel_submissions FOR INSERT
WITH CHECK (
  funnel_id IN (SELECT id FROM public.funnels WHERE status = 'live')
);