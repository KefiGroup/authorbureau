DROP VIEW IF EXISTS public.author_profiles_public;

CREATE VIEW public.author_profiles_public
WITH (security_invoker = on) AS
SELECT
  id, user_id, pen_name, bio_short, bio_long, tagline,
  photo_url, cover_photo_url, photo_zoom, photo_crop_y,
  location_city, location_country,
  genres, is_speaker, speaker_fee_range, availability_notes,
  directory_status, author_slug, site_theme,
  credentials, frameworks,
  website_url, linkedin_url, twitter_url,
  instagram_url, youtube_url, amazon_author_profile_url,
  created_at, updated_at
FROM public.author_profiles
WHERE directory_status IN ('listed', 'featured', 'verified');