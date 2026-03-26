
-- 1. Add new columns to author_profiles
ALTER TABLE public.author_profiles
  ADD COLUMN IF NOT EXISTS business_plan_json jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';

-- 2. Create author_context table
CREATE TABLE IF NOT EXISTS public.author_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  book_title text NOT NULL,
  book_subtitle text,
  core_thesis text NOT NULL,
  key_frameworks jsonb DEFAULT '[]'::jsonb,
  target_audience_persona jsonb DEFAULT '{}'::jsonb,
  unique_insights jsonb DEFAULT '[]'::jsonb,
  commercial_angles jsonb DEFAULT '{}'::jsonb,
  competitor_books jsonb DEFAULT '[]'::jsonb,
  manuscript_url text,
  parsed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.author_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage own context"
  ON public.author_context FOR ALL
  TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- 3. Create author_nodes table
CREATE TABLE IF NOT EXISTS public.author_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_name text NOT NULL,
  personalised_name text,
  status text NOT NULL DEFAULT 'locked',
  ghl_resource_id text,
  content_json jsonb,
  activated_at timestamptz,
  revenue_to_date decimal NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (author_id, node_id)
);

ALTER TABLE public.author_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage own nodes"
  ON public.author_nodes FOR ALL
  TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));
