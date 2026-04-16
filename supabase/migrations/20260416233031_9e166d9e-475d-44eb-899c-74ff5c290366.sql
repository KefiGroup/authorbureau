-- Sprint 34 Phase A: ABBY Email Engine schema additions
-- Reuses existing email_flows / email_flow_steps / email_send_log infrastructure

-- 1. New table: email_lists (author-owned subscriber lists)
CREATE TABLE IF NOT EXISTS public.email_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'manual',
  subscriber_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors view own lists" ON public.email_lists FOR SELECT
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Authors create own lists" ON public.email_lists FOR INSERT
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Authors update own lists" ON public.email_lists FOR UPDATE
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Authors delete own lists" ON public.email_lists FOR DELETE
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

CREATE TRIGGER trg_email_lists_updated_at BEFORE UPDATE ON public.email_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_email_lists_author ON public.email_lists(author_id);

-- 2. New table: lead_activities (append-only event log for ABBY scoring)
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors view own lead activities" ON public.lead_activities FOR SELECT
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role inserts lead activities" ON public.lead_activities FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_lead_activities_lead ON public.lead_activities(lead_id, created_at DESC);
CREATE INDEX idx_lead_activities_author ON public.lead_activities(author_id, created_at DESC);

-- 3. ALTER leads — add abby_score, total_revenue, stage
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leads') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='abby_score') THEN
      ALTER TABLE public.leads ADD COLUMN abby_score INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='total_revenue') THEN
      ALTER TABLE public.leads ADD COLUMN total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='stage') THEN
      ALTER TABLE public.leads ADD COLUMN stage TEXT NOT NULL DEFAULT 'new';
    END IF;
  END IF;
END $$;

-- 4. ALTER email_send_log — add lead/sequence tracking columns (nullable, non-breaking)
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS sequence_step_id UUID;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS to_name TEXT;

CREATE INDEX IF NOT EXISTS idx_email_send_log_lead ON public.email_send_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_author ON public.email_send_log(author_id, created_at DESC);

-- 5. ALTER email_flows — add metrics + node linkage
ALTER TABLE public.email_flows ADD COLUMN IF NOT EXISTS total_subscribers INT NOT NULL DEFAULT 0;
ALTER TABLE public.email_flows ADD COLUMN IF NOT EXISTS open_rate NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE public.email_flows ADD COLUMN IF NOT EXISTS click_rate NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE public.email_flows ADD COLUMN IF NOT EXISTS node_id TEXT;

-- 6. Backfill node_id from flow_type where mappable
UPDATE public.email_flows SET node_id = 'BP-01' WHERE flow_type IN ('welcome', 'nurture') AND node_id IS NULL;
UPDATE public.email_flows SET node_id = 'BP-02' WHERE flow_type = 'lead_magnet' AND node_id IS NULL;
UPDATE public.email_flows SET node_id = 'BP-05' WHERE flow_type = 'webinar' AND node_id IS NULL;