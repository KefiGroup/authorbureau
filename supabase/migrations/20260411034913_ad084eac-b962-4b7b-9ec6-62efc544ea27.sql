
-- Update the public view to include 'verified' authors (they have completed verification but aren't listed/featured yet)
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
WHERE directory_status IN ('listed', 'featured', 'verified');

-- Update the user's directory_status to 'verified' so their microsite and book pages are accessible
UPDATE public.author_profiles
SET directory_status = 'verified'
WHERE id = '92326a2f-3ed0-4873-a8cf-7a0b1350995a'
  AND directory_status = 'unlisted';
