
-- BP-03 Spec Reconciliation v2: archetype + graphics + carousel + dedupe

-- 1) social_posts: archetype, graphics JSONB, carousel slides
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS archetype TEXT,
  ADD COLUMN IF NOT EXISTS graphics JSONB,
  ADD COLUMN IF NOT EXISTS carousel_slides JSONB;

-- Constrain archetype to the 6 canonical values (or NULL for legacy rows)
ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_archetype_check;
ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_archetype_check
  CHECK (archetype IS NULL OR archetype IN ('Quote','Lesson','Question','Story','Framework','Proof'));

-- Backfill graphics from legacy graphic_url -> graphics.square (best guess)
UPDATE public.social_posts
   SET graphics = jsonb_build_object('square', graphic_url)
 WHERE graphic_url IS NOT NULL
   AND graphic_url <> ''
   AND graphics IS NULL;

-- 2) social_connections: collapse duplicate (user_id, platform) rows + unique index
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id, platform ORDER BY created_at DESC, id DESC) AS rn
    FROM public.social_connections
   WHERE user_id IS NOT NULL
)
DELETE FROM public.social_connections sc
 USING ranked r
 WHERE sc.id = r.id
   AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS social_connections_user_platform_unique
  ON public.social_connections (user_id, platform)
  WHERE user_id IS NOT NULL;
