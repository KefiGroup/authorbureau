DROP POLICY IF EXISTS "Signed-in users can view participants" ON public.reading_club_challenge_participants;
CREATE POLICY "Participants, book authors and admins can view participants" ON public.reading_club_challenge_participants FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.reading_club_members rm WHERE rm.id = member_id AND rm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.reading_club_challenges c JOIN public.books b ON b.id = c.book_id
             JOIN public.author_profiles ap ON ap.id = b.author_id
             WHERE c.id = challenge_id AND ap.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
DROP POLICY IF EXISTS "Signed-in users can play the free audiobook sample" ON storage.objects;