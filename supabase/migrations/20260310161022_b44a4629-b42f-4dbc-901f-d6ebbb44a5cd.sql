
-- Create webinars table (workbooks already exists)
CREATE TABLE IF NOT EXISTS public.webinars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  content_markdown text NOT NULL DEFAULT '',
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  scheduled_at timestamptz,
  duration_minutes integer DEFAULT 60,
  source_asset_id uuid REFERENCES public.generated_assets(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authors can manage their own webinars" ON public.webinars;
CREATE POLICY "Authors can manage their own webinars" ON public.webinars FOR ALL USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Published webinars are public" ON public.webinars;
CREATE POLICY "Published webinars are public" ON public.webinars FOR SELECT USING (status = 'published');

-- Create social_media_content table
CREATE TABLE IF NOT EXISTS public.social_media_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  platform text DEFAULT 'multi',
  source_asset_id uuid REFERENCES public.generated_assets(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_media_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authors can manage their own social content" ON public.social_media_content;
CREATE POLICY "Authors can manage their own social content" ON public.social_media_content FOR ALL USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Published social content is public" ON public.social_media_content;
CREATE POLICY "Published social content is public" ON public.social_media_content FOR SELECT USING (status = 'published');

-- Create feature_requests table
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id),
  request_type text NOT NULL DEFAULT 'reading_club',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authors can manage their own requests" ON public.feature_requests;
CREATE POLICY "Authors can manage their own requests" ON public.feature_requests FOR ALL USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Admins can view all requests" ON public.feature_requests;
CREATE POLICY "Admins can view all requests" ON public.feature_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update all requests" ON public.feature_requests;
CREATE POLICY "Admins can update all requests" ON public.feature_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
