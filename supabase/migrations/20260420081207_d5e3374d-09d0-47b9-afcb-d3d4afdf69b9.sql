-- ============ COURSES table extensions ============
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS course_slug text,
  ADD COLUMN IF NOT EXISTS delivery_url text,
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS tagline text;

-- Unique slug per author
CREATE UNIQUE INDEX IF NOT EXISTS courses_author_slug_unique
  ON public.courses(author_id, course_slug)
  WHERE course_slug IS NOT NULL;

-- Auto-generate course_slug from title (scoped per author)
CREATE OR REPLACE FUNCTION public.generate_course_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  candidate text;
  counter int := 1;
BEGIN
  IF NEW.course_slug IS NOT NULL AND NEW.course_slug <> '' THEN
    RETURN NEW;
  END IF;
  IF NEW.title IS NULL OR trim(NEW.title) = '' THEN
    RETURN NEW;
  END IF;

  base_slug := regexp_replace(lower(trim(NEW.title)), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'course'; END IF;

  candidate := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.courses
    WHERE author_id = NEW.author_id
      AND course_slug = candidate
      AND id IS DISTINCT FROM NEW.id
  ) LOOP
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;

  NEW.course_slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_courses_generate_slug ON public.courses;
CREATE TRIGGER trg_courses_generate_slug
BEFORE INSERT OR UPDATE OF title ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.generate_course_slug();

-- ============ COURSE_LESSONS extensions ============
ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS outline text;

-- ============ SUBSCRIPTIONS table ============
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  subscriber_email text NOT NULL,
  subscriber_name text,
  subscriber_user_id uuid,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'incomplete',
  price_usd numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_author_id_idx ON public.subscriptions(author_id);
CREATE INDEX IF NOT EXISTS subscriptions_subscriber_email_idx ON public.subscriptions(subscriber_email);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    author_id IN (
      SELECT id FROM public.author_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Subscribers can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (subscriber_user_id = auth.uid());

CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MEMBERSHIP_CONTENT table (single row per author) ============
CREATE TABLE IF NOT EXISTS public.membership_content (
  author_id uuid PRIMARY KEY REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Membership',
  tagline text,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  sales_copy jsonb NOT NULL DEFAULT '{}'::jsonb,
  welcome_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  monthly_newsletter_template jsonb,
  monthly_price numeric(10,2) NOT NULL DEFAULT 27.00,
  currency text NOT NULL DEFAULT 'usd',
  stripe_product_id text,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read membership content"
  ON public.membership_content FOR SELECT
  USING (true);

CREATE POLICY "Authors manage their own membership content"
  ON public.membership_content FOR ALL
  USING (
    author_id IN (
      SELECT id FROM public.author_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    author_id IN (
      SELECT id FROM public.author_profiles WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_membership_content_updated_at
BEFORE UPDATE ON public.membership_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();