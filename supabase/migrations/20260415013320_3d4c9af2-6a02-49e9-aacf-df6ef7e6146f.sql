
-- 1. leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  author_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'microsite',
  status TEXT NOT NULL DEFAULT 'active',
  nurture_stage TEXT NOT NULL DEFAULT 'welcome',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(author_id, email)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own leads" ON public.leads FOR SELECT USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  OR author_id = auth.uid()
);
CREATE POLICY "Authors can insert own leads" ON public.leads FOR INSERT WITH CHECK (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  OR author_id = auth.uid()
);
CREATE POLICY "Authors can update own leads" ON public.leads FOR UPDATE USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  OR author_id = auth.uid()
);

CREATE INDEX idx_leads_author_id ON public.leads(author_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_nurture_stage ON public.leads(nurture_stage);
CREATE INDEX idx_leads_book_id ON public.leads(book_id);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. nurture_events table
CREATE TABLE public.nurture_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nurture_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own lead events" ON public.nurture_events FOR SELECT USING (
  lead_id IN (
    SELECT l.id FROM public.leads l
    JOIN public.author_profiles ap ON (l.author_id = ap.id OR l.author_id = ap.user_id::text::uuid)
    WHERE ap.user_id = auth.uid()
  )
);

CREATE INDEX idx_nurture_events_lead_id ON public.nurture_events(lead_id);
CREATE INDEX idx_nurture_events_event_type ON public.nurture_events(event_type);
CREATE INDEX idx_nurture_events_created_at ON public.nurture_events(created_at);

-- 3. generated_emails table
CREATE TABLE public.generated_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  author_id UUID NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_markdown TEXT,
  trigger_condition TEXT NOT NULL DEFAULT 'welcome',
  status TEXT NOT NULL DEFAULT 'queued',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own generated emails" ON public.generated_emails FOR SELECT USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  OR author_id = auth.uid()
);

CREATE INDEX idx_generated_emails_author_id ON public.generated_emails(author_id);
CREATE INDEX idx_generated_emails_lead_id ON public.generated_emails(lead_id);
CREATE INDEX idx_generated_emails_status ON public.generated_emails(status);

CREATE TRIGGER update_generated_emails_updated_at
  BEFORE UPDATE ON public.generated_emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. marketing_assets table
CREATE TABLE public.marketing_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  asset_type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own assets" ON public.marketing_assets FOR SELECT USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  OR author_id = auth.uid()
);
CREATE POLICY "Authors can insert own assets" ON public.marketing_assets FOR INSERT WITH CHECK (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  OR author_id = auth.uid()
);
CREATE POLICY "Authors can update own assets" ON public.marketing_assets FOR UPDATE USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  OR author_id = auth.uid()
);
CREATE POLICY "Authors can delete own assets" ON public.marketing_assets FOR DELETE USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  OR author_id = auth.uid()
);

CREATE INDEX idx_marketing_assets_author_id ON public.marketing_assets(author_id);
CREATE INDEX idx_marketing_assets_book_id ON public.marketing_assets(book_id);
CREATE INDEX idx_marketing_assets_asset_type ON public.marketing_assets(asset_type);
CREATE INDEX idx_marketing_assets_status ON public.marketing_assets(status);

CREATE TRIGGER update_marketing_assets_updated_at
  BEFORE UPDATE ON public.marketing_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
