-- 1) New columns on author_profiles
ALTER TABLE public.author_profiles
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS podcast_spotify_url text,
  ADD COLUMN IF NOT EXISTS podcast_apple_url text,
  ADD COLUMN IF NOT EXISTS podcast_rss_url text;

-- 2) Backfill content_json.book_id from the top-level book_id column
--    on live nodes so the per-book filter can find them.
UPDATE public.author_nodes
SET content_json = COALESCE(content_json, '{}'::jsonb)
                    || jsonb_build_object('book_id', book_id::text)
WHERE status = 'live'
  AND book_id IS NOT NULL
  AND (content_json IS NULL OR (content_json ->> 'book_id') IS NULL);

-- 3) Clear contaminated per-book bios for Pauline Teo's two books
--    (the Amazon category breadcrumb). The public profile bio_long/bio_short
--    will take over via component-level fallback.
UPDATE public.books
SET author_bio = NULL
WHERE id IN (
  'e5b857ac-48ce-4ffc-a761-3c09e95a318e',  -- Be SUCKcessful
  '3c65a5f1-96da-4538-80c3-7bb23fb622fb'   -- Invest Like Buffett for Parents
)
AND (author_bio ILIKE '%Kindle Store%' OR author_bio ILIKE '%›%' OR author_bio ILIKE '%Amazon%');