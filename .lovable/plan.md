

## Issues and Status

### 1. Dead Links from Author Profile — Partially Fixed
The previous fix corrected the URL pattern (from `/authors/:slug` to `/:slug`). However, there is a remaining gap:

**The `author_profiles_public` view is missing columns** that the public pages need. Currently it only includes: `id, user_id, pen_name, bio_short, bio_long, tagline, photo_url, cover_photo_url, photo_zoom, photo_crop_y, location_city, location_country, genres, is_speaker, speaker_fee_range, availability_notes, directory_status, author_slug, site_theme, credentials, frameworks, created_at, updated_at`.

Missing columns used by `AuthorSite.tsx` and `AuthorBookPage.tsx`:
- `website_url`
- `linkedin_url`
- `twitter_url`
- `instagram_url`
- `youtube_url`
- `amazon_author_profile_url`

Without these, public pages render with blank social links and broken SEO `sameAs` data. This won't cause a 404 but degrades the page.

### 2. Theme Cannot Be Changed — Root Cause
The save logic in `SiteThemePicker.tsx` is correct — the code, RLS policies, and column all exist. The likely reason the user reported it as broken is that:
- The public page was failing to load (due to the routing/link issues), so they couldn't see the theme change reflected.
- OR there was a transient issue now resolved.

The DB currently shows all authors on `classic-elegant`, and there are zero `site_theme` update queries in the Postgres logs, suggesting the user may not have retried since the routing fixes.

## Plan

### Step 1: Update `author_profiles_public` view (Database Migration)
Add the missing social URL columns to the view so public pages render completely:

```sql
CREATE OR REPLACE VIEW public.author_profiles_public
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
```

### Step 2: Remove unnecessary `as any` cast in SiteThemePicker
The `site_theme` column exists in the generated types. Remove the `as any` to get proper type checking and ensure no silent failures.

### Step 3: Verify theme picker works end-to-end
After deploying, confirm the save produces no error and the value persists in the database.

## Technical Details
- The view update is safe — it only adds columns, no data changes
- RLS is already correct: anon users can SELECT listed/verified/featured profiles
- The theme update RLS policy (`auth.uid() = user_id`) is correct for authenticated authors
- No sensitive columns (API keys, stripe IDs, etc.) are exposed by adding social URLs

