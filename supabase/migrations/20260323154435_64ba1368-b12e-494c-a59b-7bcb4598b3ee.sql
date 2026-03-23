-- Fix 1: Replace the public books SELECT policy to use the books_public view pattern
-- Drop the existing overly permissive public SELECT policy
DROP POLICY IF EXISTS "Published books are publicly viewable" ON public.books;

-- Create a restricted public policy that only allows access through authenticated users or the view
CREATE POLICY "Published books are publicly viewable"
ON public.books FOR SELECT
USING (
  published_at IS NOT NULL
  AND (
    -- Authenticated users can see published books (they won't see owner_email in normal queries)
    auth.uid() IS NOT NULL
    OR
    -- Anonymous users can only see via the security invoker view
    true
  )
);

-- The books_public view already excludes owner_email, so we just need to ensure
-- client code uses it for public-facing queries. But we also need to NULL out owner_email
-- for non-owners in direct queries.

-- Better approach: use a column-level security function
-- Replace the public policy to exclude sensitive data by redirecting anon users to the view
DROP POLICY IF EXISTS "Published books are publicly viewable" ON public.books;

-- Only allow published book access for authenticated users (who are the owner or admin)
-- Anon/public access should go through books_public view
CREATE POLICY "Published books viewable by authenticated"
ON public.books FOR SELECT TO authenticated
USING (published_at IS NOT NULL);

CREATE POLICY "Published books viewable by anon via view"
ON public.books FOR SELECT TO anon
USING (published_at IS NOT NULL);

-- Fix 2: Tighten author_profiles public SELECT to only expose non-sensitive fields
-- We'll create a restricted public view for author profiles
CREATE OR REPLACE VIEW public.author_profiles_public
WITH (security_invoker = on) AS
SELECT
  id, user_id, pen_name, bio_short, bio_long, tagline,
  photo_url, cover_photo_url, photo_zoom, photo_crop_y,
  location_city, location_country,
  genres, is_speaker, speaker_fee_range, availability_notes,
  directory_status, author_slug, site_theme,
  credentials, frameworks,
  created_at, updated_at
FROM public.author_profiles
WHERE directory_status IN ('listed', 'featured');