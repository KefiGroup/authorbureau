
-- ============================================================
-- 1. reader_start_dates: scope to owner email
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read start dates" ON public.reader_start_dates;
DROP POLICY IF EXISTS "Anyone can insert start dates" ON public.reader_start_dates;
DROP POLICY IF EXISTS "Anyone can update start dates" ON public.reader_start_dates;

CREATE POLICY "Users can read own start dates"
  ON public.reader_start_dates FOR SELECT
  USING (user_email = auth.email());

CREATE POLICY "Users can insert own start dates"
  ON public.reader_start_dates FOR INSERT
  TO authenticated
  WITH CHECK (user_email = auth.email());

CREATE POLICY "Users can update own start dates"
  ON public.reader_start_dates FOR UPDATE
  TO authenticated
  USING (user_email = auth.email());

-- Service role needs full access for backend operations
CREATE POLICY "Service role manages start dates"
  ON public.reader_start_dates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. reader_progress: scope to owner email, service role for writes
-- ============================================================
DROP POLICY IF EXISTS "Service role manages reader progress" ON public.reader_progress;

CREATE POLICY "Users can read own progress"
  ON public.reader_progress FOR SELECT
  TO authenticated
  USING (user_email = auth.email());

CREATE POLICY "Service role can manage progress"
  ON public.reader_progress FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. author_profiles: replace open public SELECT with restricted one
-- ============================================================
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.author_profiles;

CREATE POLICY "Listed profiles viewable by authenticated"
  ON public.author_profiles FOR SELECT
  TO authenticated
  USING (
    directory_status IN ('listed', 'featured')
    OR auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 4. purchases: restrict INSERT to service_role only
-- ============================================================
DROP POLICY IF EXISTS "Service can insert purchases" ON public.purchases;

CREATE POLICY "Service role can insert purchases"
  ON public.purchases FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- 5. reader_badges: restrict INSERT to service_role only
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert badges" ON public.reader_badges;

CREATE POLICY "Service role inserts badges"
  ON public.reader_badges FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- 6. reading_club_discussions: require auth + membership check
-- ============================================================
DROP POLICY IF EXISTS "Members can post discussions" ON public.reading_club_discussions;

CREATE POLICY "Authenticated members can post discussions"
  ON public.reading_club_discussions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reading_club_members rm
      WHERE rm.id = member_id AND rm.user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. reading_club_challenge_participants: require auth + membership
-- ============================================================
DROP POLICY IF EXISTS "Members can join challenges" ON public.reading_club_challenge_participants;

CREATE POLICY "Authenticated members can join challenges"
  ON public.reading_club_challenge_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reading_club_members rm
      WHERE rm.id = member_id AND rm.user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. course-videos storage: add folder ownership
-- ============================================================
DROP POLICY IF EXISTS "Authors can upload course videos" ON storage.objects;
DROP POLICY IF EXISTS "Authors can update course videos" ON storage.objects;
DROP POLICY IF EXISTS "Authors can delete course videos" ON storage.objects;

CREATE POLICY "Authors can upload own course videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authors can update own course videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authors can delete own course videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 9. social-media-graphics storage: add folder ownership for INSERT
-- ============================================================
DROP POLICY IF EXISTS "Authors can upload social graphics" ON storage.objects;

CREATE POLICY "Authors can upload own social graphics"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'social-media-graphics'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
