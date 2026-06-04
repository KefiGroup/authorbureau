-- ============================================================
-- 1) Fix cross-author RLS mismatch: author_id stores author_profiles.id,
--    so policies must join through author_profiles on user_id.
-- ============================================================

-- ai_usage_logs (SELECT)
DROP POLICY IF EXISTS "Authors can view their own usage" ON public.ai_usage_logs;
CREATE POLICY "Authors can view their own usage" ON public.ai_usage_logs
  FOR SELECT TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- audiobooks (ALL)
DROP POLICY IF EXISTS "Authors can manage their own audiobooks" ON public.audiobooks;
CREATE POLICY "Authors can manage their own audiobooks" ON public.audiobooks
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- author_subscribers (ALL)
DROP POLICY IF EXISTS "Authors can manage their own subscribers" ON public.author_subscribers;
CREATE POLICY "Authors can manage their own subscribers" ON public.author_subscribers
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- coaching_packages (ALL)
DROP POLICY IF EXISTS "Authors can manage their coaching packages" ON public.coaching_packages;
CREATE POLICY "Authors can manage their coaching packages" ON public.coaching_packages
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- crm_activity_log (ALL)
DROP POLICY IF EXISTS "Authors can manage their own activity logs" ON public.crm_activity_log;
CREATE POLICY "Authors can manage their own activity logs" ON public.crm_activity_log
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- crm_contact_tags (ALL)
DROP POLICY IF EXISTS "Authors can manage their own contact tags" ON public.crm_contact_tags;
CREATE POLICY "Authors can manage their own contact tags" ON public.crm_contact_tags
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- crm_contacts (ALL)
DROP POLICY IF EXISTS "Authors can manage their own contacts" ON public.crm_contacts;
CREATE POLICY "Authors can manage their own contacts" ON public.crm_contacts
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- cross_builder_pushes (ALL)
DROP POLICY IF EXISTS "Authors can manage their own pushes" ON public.cross_builder_pushes;
CREATE POLICY "Authors can manage their own pushes" ON public.cross_builder_pushes
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- email_campaigns (ALL)
DROP POLICY IF EXISTS "Authors can manage their own campaigns" ON public.email_campaigns;
CREATE POLICY "Authors can manage their own campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- email_templates (ALL)
DROP POLICY IF EXISTS "Authors can manage their own templates" ON public.email_templates;
CREATE POLICY "Authors can manage their own templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- feature_requests (ALL)
DROP POLICY IF EXISTS "Authors can manage their own requests" ON public.feature_requests;
CREATE POLICY "Authors can manage their own requests" ON public.feature_requests
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- home_study_courses (ALL)
DROP POLICY IF EXISTS "Authors can manage their own home study courses" ON public.home_study_courses;
CREATE POLICY "Authors can manage their own home study courses" ON public.home_study_courses
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- podcast_episodes (ALL)
DROP POLICY IF EXISTS "Authors can manage their own episodes" ON public.podcast_episodes;
CREATE POLICY "Authors can manage their own episodes" ON public.podcast_episodes
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- podcasts (ALL)
DROP POLICY IF EXISTS "Authors can manage their own podcasts" ON public.podcasts;
CREATE POLICY "Authors can manage their own podcasts" ON public.podcasts
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- purchases (SELECT)
DROP POLICY IF EXISTS "Authors can view their own purchases" ON public.purchases;
CREATE POLICY "Authors can view their own purchases" ON public.purchases
  FOR SELECT TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- social_media_content (ALL)
DROP POLICY IF EXISTS "Authors can manage their own social content" ON public.social_media_content;
CREATE POLICY "Authors can manage their own social content" ON public.social_media_content
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- speaking_topics (ALL)
DROP POLICY IF EXISTS "Authors can manage their speaking topics" ON public.speaking_topics;
CREATE POLICY "Authors can manage their speaking topics" ON public.speaking_topics
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- special_editions (ALL)
DROP POLICY IF EXISTS "Authors can manage their own special editions" ON public.special_editions;
CREATE POLICY "Authors can manage their own special editions" ON public.special_editions
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- testimonials (ALL)
DROP POLICY IF EXISTS "Authors can manage their own testimonials" ON public.testimonials;
CREATE POLICY "Authors can manage their own testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- workbooks (ALL)
DROP POLICY IF EXISTS "Authors can manage their own workbooks" ON public.workbooks;
CREATE POLICY "Authors can manage their own workbooks" ON public.workbooks
  FOR ALL TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

-- ============================================================
-- 2) author_profiles: restrict anonymous column access to safe
--    marketing fields only (blocks Stripe IDs and admin fields).
--    Row-level anon policy stays; column privileges enforce columns.
-- ============================================================
REVOKE SELECT ON public.author_profiles FROM anon;
GRANT SELECT (
  id, user_id, pen_name, bio_short, bio_long, tagline, photo_url, cover_photo_url,
  location_city, location_country, website_url, linkedin_url, twitter_url, instagram_url,
  youtube_url, facebook_url, genres, credentials, is_speaker, speaker_fee_range,
  availability_notes, created_at, updated_at, amazon_author_profile_url, directory_status,
  author_slug, photo_crop_y, photo_zoom, frameworks, site_theme, methodology_name,
  sign_off_phrase, quiz_name, podcast_spotify_url, podcast_apple_url, podcast_rss_url, timezone
) ON public.author_profiles TO anon;

-- ============================================================
-- 3) membership_content: restrict anonymous column access to safe
--    marketing fields only (blocks Stripe IDs and email templates).
-- ============================================================
REVOKE SELECT ON public.membership_content FROM anon;
GRANT SELECT (
  author_id, name, tagline, benefits, sales_copy, monthly_price, currency, status,
  created_at, updated_at
) ON public.membership_content TO anon;
