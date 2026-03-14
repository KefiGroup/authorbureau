
-- =============================================
-- P0: Reader Profiles, Reading Challenges, Logs, Badges
-- =============================================

-- 1. reader_profiles
CREATE TABLE public.reader_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  reading_goal integer DEFAULT 12,
  favorite_genres jsonb DEFAULT '[]'::jsonb,
  total_books_read integer DEFAULT 0,
  total_streak_days integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.reader_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Readers can view own profile" ON public.reader_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Readers can insert own profile" ON public.reader_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Readers can update own profile" ON public.reader_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public reader profiles are viewable" ON public.reader_profiles FOR SELECT USING (true);

-- 2. reading_challenges
CREATE TABLE public.reading_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id uuid REFERENCES public.reader_profiles(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  challenge_config_id uuid REFERENCES public.reading_club_challenges(id) ON DELETE SET NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  target_days integer DEFAULT 100 NOT NULL,
  commitment_minutes integer DEFAULT 2,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  total_days_read integer DEFAULT 0,
  status text DEFAULT 'active' NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.reading_challenges ENABLE ROW LEVEL SECURITY;

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_reading_challenge_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'completed', 'abandoned') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_reading_challenge_status
  BEFORE INSERT OR UPDATE ON public.reading_challenges
  FOR EACH ROW EXECUTE FUNCTION public.validate_reading_challenge_status();

-- RLS: readers access own challenges via reader_profiles
CREATE POLICY "Readers can view own challenges" ON public.reading_challenges FOR SELECT
  USING (reader_id IN (SELECT id FROM public.reader_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Readers can insert own challenges" ON public.reading_challenges FOR INSERT
  WITH CHECK (reader_id IN (SELECT id FROM public.reader_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Readers can update own challenges" ON public.reading_challenges FOR UPDATE
  USING (reader_id IN (SELECT id FROM public.reader_profiles WHERE user_id = auth.uid()));
-- Public leaderboard visibility
CREATE POLICY "Anyone can view active challenges for leaderboard" ON public.reading_challenges FOR SELECT
  USING (status = 'active');

-- 3. reading_logs
CREATE TABLE public.reading_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.reading_challenges(id) ON DELETE CASCADE NOT NULL,
  reader_id uuid REFERENCES public.reader_profiles(id) ON DELETE CASCADE NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  minutes_read integer DEFAULT 2,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (challenge_id, log_date)
);

ALTER TABLE public.reading_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Readers can view own logs" ON public.reading_logs FOR SELECT
  USING (reader_id IN (SELECT id FROM public.reader_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Readers can insert own logs" ON public.reading_logs FOR INSERT
  WITH CHECK (reader_id IN (SELECT id FROM public.reader_profiles WHERE user_id = auth.uid()));
-- Public access for leaderboard aggregation
CREATE POLICY "Anyone can view logs for leaderboard" ON public.reading_logs FOR SELECT
  USING (true);

-- 4. reader_badges
CREATE TABLE public.reader_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id uuid REFERENCES public.reader_profiles(id) ON DELETE CASCADE NOT NULL,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  earned_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.reader_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Readers can view own badges" ON public.reader_badges FOR SELECT
  USING (reader_id IN (SELECT id FROM public.reader_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role can insert badges" ON public.reader_badges FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Anyone can view badges" ON public.reader_badges FOR SELECT
  USING (true);

-- 5. Function to calculate and update streaks
CREATE OR REPLACE FUNCTION public.update_reading_streak()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_challenge reading_challenges%ROWTYPE;
  v_yesterday_logged boolean;
  v_new_streak integer;
  v_badge_exists boolean;
BEGIN
  SELECT * INTO v_challenge FROM reading_challenges WHERE id = NEW.challenge_id;
  
  -- Check if yesterday was logged
  SELECT EXISTS(
    SELECT 1 FROM reading_logs 
    WHERE challenge_id = NEW.challenge_id 
    AND log_date = NEW.log_date - 1
  ) INTO v_yesterday_logged;
  
  -- Calculate streak
  IF v_yesterday_logged THEN
    v_new_streak := v_challenge.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;
  
  -- Update challenge
  UPDATE reading_challenges SET
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    total_days_read = total_days_read + 1,
    status = CASE WHEN total_days_read + 1 >= target_days THEN 'completed' ELSE status END,
    completed_at = CASE WHEN total_days_read + 1 >= target_days THEN now() ELSE completed_at END
  WHERE id = NEW.challenge_id;
  
  -- Award badges based on streak milestones
  -- 7-day streak
  IF v_new_streak >= 7 THEN
    SELECT EXISTS(SELECT 1 FROM reader_badges WHERE reader_id = NEW.reader_id AND badge_type = 'streak_7') INTO v_badge_exists;
    IF NOT v_badge_exists THEN
      INSERT INTO reader_badges (reader_id, badge_type, badge_name, metadata)
      VALUES (NEW.reader_id, 'streak_7', 'Week Warrior', jsonb_build_object('challenge_id', NEW.challenge_id));
    END IF;
  END IF;
  
  -- 30-day streak
  IF v_new_streak >= 30 THEN
    SELECT EXISTS(SELECT 1 FROM reader_badges WHERE reader_id = NEW.reader_id AND badge_type = 'streak_30') INTO v_badge_exists;
    IF NOT v_badge_exists THEN
      INSERT INTO reader_badges (reader_id, badge_type, badge_name, metadata)
      VALUES (NEW.reader_id, 'streak_30', 'Monthly Master', jsonb_build_object('challenge_id', NEW.challenge_id));
    END IF;
  END IF;
  
  -- 100-day streak
  IF v_new_streak >= 100 THEN
    SELECT EXISTS(SELECT 1 FROM reader_badges WHERE reader_id = NEW.reader_id AND badge_type = 'streak_100') INTO v_badge_exists;
    IF NOT v_badge_exists THEN
      INSERT INTO reader_badges (reader_id, badge_type, badge_name, metadata)
      VALUES (NEW.reader_id, 'streak_100', 'Century Champion', jsonb_build_object('challenge_id', NEW.challenge_id));
    END IF;
  END IF;
  
  -- First log badge
  SELECT EXISTS(SELECT 1 FROM reader_badges WHERE reader_id = NEW.reader_id AND badge_type = 'first_log') INTO v_badge_exists;
  IF NOT v_badge_exists THEN
    INSERT INTO reader_badges (reader_id, badge_type, badge_name, metadata)
    VALUES (NEW.reader_id, 'first_log', 'First Page', jsonb_build_object('challenge_id', NEW.challenge_id));
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_reading_streak
  AFTER INSERT ON public.reading_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_reading_streak();
