
-- Special Editions main table
CREATE TABLE public.special_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  edition_type text NOT NULL DEFAULT 'signed',
  print_run text NOT NULL DEFAULT 'limited',
  print_quantity int DEFAULT 100,
  extras text,
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  occasion text DEFAULT 'none',
  occasion_date date,
  occasion_tagline text,
  cover_concept text,
  gift_buyer_persona text,
  edition_identity_json jsonb DEFAULT '{}'::jsonb,
  sales_copy_json jsonb DEFAULT '{}'::jsonb,
  bundle_strategy_json jsonb DEFAULT '{}'::jsonb,
  print_specs_json jsonb DEFAULT '{}'::jsonb,
  cross_builder_json jsonb DEFAULT '{}'::jsonb,
  marketing_calendar_json jsonb DEFAULT '{}'::jsonb,
  source_asset_id uuid REFERENCES public.generated_assets(id),
  status text NOT NULL DEFAULT 'draft',
  slug text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.special_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own special editions"
  ON public.special_editions FOR ALL
  TO public
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Published special editions are public"
  ON public.special_editions FOR SELECT
  TO public
  USING (status = 'published');

-- Bonus content for themed editions
CREATE TABLE public.special_edition_bonus_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  special_edition_id uuid REFERENCES public.special_editions(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_custom_upload boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.special_edition_bonus_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage bonus content"
  ON public.special_edition_bonus_content FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.special_editions se
    WHERE se.id = special_edition_bonus_content.special_edition_id
    AND se.author_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.special_editions se
    WHERE se.id = special_edition_bonus_content.special_edition_id
    AND se.author_id = auth.uid()
  ));

CREATE POLICY "Published bonus content is public"
  ON public.special_edition_bonus_content FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.special_editions se
    WHERE se.id = special_edition_bonus_content.special_edition_id
    AND se.status = 'published'
  ));

-- Bundle tiers for themed editions
CREATE TABLE public.special_edition_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  special_edition_id uuid REFERENCES public.special_editions(id) ON DELETE CASCADE NOT NULL,
  tier text NOT NULL,
  name text NOT NULL,
  description text,
  price_cents int NOT NULL DEFAULT 0,
  included_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  stripe_price_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.special_edition_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage bundles"
  ON public.special_edition_bundles FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.special_editions se
    WHERE se.id = special_edition_bundles.special_edition_id
    AND se.author_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.special_editions se
    WHERE se.id = special_edition_bundles.special_edition_id
    AND se.author_id = auth.uid()
  ));

CREATE POLICY "Published bundles are public"
  ON public.special_edition_bundles FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.special_editions se
    WHERE se.id = special_edition_bundles.special_edition_id
    AND se.status = 'published'
  ));

-- Marketing calendar for themed editions
CREATE TABLE public.special_edition_marketing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  special_edition_id uuid REFERENCES public.special_editions(id) ON DELETE CASCADE NOT NULL,
  day_number int NOT NULL,
  week_theme text,
  channel text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  scheduled_date date,
  is_published boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.special_edition_marketing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage marketing"
  ON public.special_edition_marketing FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.special_editions se
    WHERE se.id = special_edition_marketing.special_edition_id
    AND se.author_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.special_editions se
    WHERE se.id = special_edition_marketing.special_edition_id
    AND se.author_id = auth.uid()
  ));

CREATE POLICY "Published marketing is public"
  ON public.special_edition_marketing FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.special_editions se
    WHERE se.id = special_edition_marketing.special_edition_id
    AND se.status = 'published'
  ));

-- Updated_at trigger for special_editions
CREATE TRIGGER update_special_editions_updated_at
  BEFORE UPDATE ON public.special_editions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
