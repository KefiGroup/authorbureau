
-- ============================================================
-- 1. books: remove anon direct-table access (use books_public view instead)
-- ============================================================
DROP POLICY IF EXISTS "Published books viewable by anon via view" ON public.books;

-- ============================================================
-- 2. Create a safe authenticated view for cross-author profile reads
-- (excludes Stripe, GHL, promo codes, business plan)
-- ============================================================
CREATE OR REPLACE VIEW public.author_profiles_safe AS
SELECT
  id, user_id, account_id, pen_name, bio_short, bio_long, tagline,
  photo_url, cover_photo_url, photo_zoom, photo_crop_y,
  location_city, location_country, genres, is_speaker, speaker_fee_range,
  availability_notes, directory_status, author_slug, site_theme,
  credentials, frameworks, subscription_tier, onboarding_completed,
  has_seen_journey_onboarding, website_url, linkedin_url, twitter_url,
  instagram_url, youtube_url, amazon_author_profile_url,
  created_at, updated_at
FROM author_profiles;
