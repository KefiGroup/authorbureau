
-- Reading Club Challenges
CREATE TABLE public.reading_club_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_club_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
  ON public.reading_club_challenges FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage challenges"
  ON public.reading_club_challenges FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Challenge Participants
CREATE TABLE public.reading_club_challenge_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid NOT NULL REFERENCES public.reading_club_challenges(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.reading_club_members(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, member_id)
);

ALTER TABLE public.reading_club_challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants"
  ON public.reading_club_challenge_participants FOR SELECT
  USING (true);

CREATE POLICY "Members can join challenges"
  ON public.reading_club_challenge_participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members can update own progress"
  ON public.reading_club_challenge_participants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM reading_club_members rm
    WHERE rm.id = reading_club_challenge_participants.member_id
    AND rm.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage participants"
  ON public.reading_club_challenge_participants FOR ALL
  USING (has_role(auth.uid(), 'admin'));
