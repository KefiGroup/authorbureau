-- Normalize legacy statuses first
UPDATE public.social_posts SET status = 'draft' WHERE status NOT IN ('draft','ready','posted');

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS graphic_url TEXT,
  ADD COLUMN IF NOT EXISTS post_index INT,
  ADD COLUMN IF NOT EXISTS post_type TEXT,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

ALTER TABLE public.social_posts
  DROP COLUMN IF EXISTS buffer_post_id;

DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.social_posts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.social_posts DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.social_posts
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_status_check
  CHECK (status IN ('draft', 'ready', 'posted'));

CREATE INDEX IF NOT EXISTS idx_social_posts_author_status ON public.social_posts(author_id, status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON public.social_posts(scheduled_at);