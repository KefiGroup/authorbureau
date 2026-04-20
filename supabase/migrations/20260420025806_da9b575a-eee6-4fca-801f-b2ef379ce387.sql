-- ============ AUTHOR TESTIMONIALS ============
CREATE TABLE public.author_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  quote TEXT NOT NULL,
  avatar_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_author_testimonials_author ON public.author_testimonials(author_id, sort_order);
ALTER TABLE public.author_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view testimonials"
  ON public.author_testimonials FOR SELECT USING (true);
CREATE POLICY "Authors can insert their own testimonials"
  ON public.author_testimonials FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their own testimonials"
  ON public.author_testimonials FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete their own testimonials"
  ON public.author_testimonials FOR DELETE USING (auth.uid() = author_id);

CREATE TRIGGER trg_author_testimonials_updated_at
  BEFORE UPDATE ON public.author_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ EXTEND WEBINARS ============
ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS room_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_webinars_author_slug
  ON public.webinars(author_id, slug) WHERE slug IS NOT NULL;

ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published webinars" ON public.webinars;
DROP POLICY IF EXISTS "Authors can insert their own webinars" ON public.webinars;
DROP POLICY IF EXISTS "Authors can update their own webinars" ON public.webinars;
DROP POLICY IF EXISTS "Authors can delete their own webinars" ON public.webinars;

CREATE POLICY "Anyone can view published webinars"
  ON public.webinars FOR SELECT
  USING (status = 'published' OR auth.uid() = author_id);
CREATE POLICY "Authors can insert their own webinars"
  ON public.webinars FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their own webinars"
  ON public.webinars FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete their own webinars"
  ON public.webinars FOR DELETE USING (auth.uid() = author_id);

-- ============ EXTEND WEBINAR REGISTRATIONS ============
ALTER TABLE public.webinar_registrations
  ADD COLUMN IF NOT EXISTS author_id UUID,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_15m_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_sameday_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_day3_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_day7_sent_at TIMESTAMPTZ;

-- Backfill author_id from parent webinar
UPDATE public.webinar_registrations wr
  SET author_id = w.author_id
  FROM public.webinars w
  WHERE wr.webinar_id = w.id AND wr.author_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_webinar_regs_author ON public.webinar_registrations(author_id);

ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can register for a webinar" ON public.webinar_registrations;
DROP POLICY IF EXISTS "Authors can view their webinar registrations" ON public.webinar_registrations;
DROP POLICY IF EXISTS "Authors can update their webinar registrations" ON public.webinar_registrations;
DROP POLICY IF EXISTS "Authors can delete their webinar registrations" ON public.webinar_registrations;

CREATE POLICY "Anyone can register for a webinar"
  ON public.webinar_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Authors can view their webinar registrations"
  ON public.webinar_registrations FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Authors can update their webinar registrations"
  ON public.webinar_registrations FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete their webinar registrations"
  ON public.webinar_registrations FOR DELETE USING (auth.uid() = author_id);