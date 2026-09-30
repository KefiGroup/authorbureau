DROP POLICY IF EXISTS "Anyone can view logs for leaderboard" ON public.reading_logs;
DROP POLICY IF EXISTS "Public reader profiles are viewable" ON public.reader_profiles;
DROP POLICY IF EXISTS "Anyone can view badges" ON public.reader_badges;
DROP POLICY IF EXISTS "Anyone can view participants" ON public.reading_club_challenge_participants;
CREATE POLICY "Signed-in users can view participants" ON public.reading_club_challenge_participants
  FOR SELECT TO authenticated USING (true);