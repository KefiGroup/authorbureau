
-- ============================================
-- STEP 1 DOMAIN TABLES: Digital Products
-- Per 42-page plan Section 12, all link to book_id
-- ============================================

-- 1. WORKBOOKS (Section 4.5)
CREATE TABLE public.workbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  source_asset_id uuid REFERENCES public.generated_assets(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  content_markdown text NOT NULL DEFAULT '',
  cover_image_url text,
  page_count integer,
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  download_url text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own workbooks"
  ON public.workbooks FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Published workbooks are public"
  ON public.workbooks FOR SELECT
  USING (status = 'published');

CREATE TRIGGER update_workbooks_updated_at
  BEFORE UPDATE ON public.workbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. HOME STUDY COURSES (Section 4.2)
CREATE TABLE public.home_study_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  source_asset_id uuid REFERENCES public.generated_assets(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  content_markdown text NOT NULL DEFAULT '',
  study_schedule_json jsonb DEFAULT '[]'::jsonb,
  duration_days integer DEFAULT 30,
  cover_image_url text,
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  download_url text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.home_study_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own home study courses"
  ON public.home_study_courses FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Published home study courses are public"
  ON public.home_study_courses FOR SELECT
  USING (status = 'published');

CREATE TRIGGER update_home_study_courses_updated_at
  BEFORE UPDATE ON public.home_study_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. WEBINARS (Section 4.3)
CREATE TABLE public.webinars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  source_asset_id uuid REFERENCES public.generated_assets(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  script_markdown text NOT NULL DEFAULT '',
  slide_deck_url text,
  registration_page_copy text,
  replay_url text,
  scheduled_at timestamptz,
  duration_minutes integer DEFAULT 60,
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  is_free boolean DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own webinars"
  ON public.webinars FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Published webinars are public"
  ON public.webinars FOR SELECT
  USING (status = 'published');

CREATE TRIGGER update_webinars_updated_at
  BEFORE UPDATE ON public.webinars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. WEBINAR REGISTRATIONS
CREATE TABLE public.webinar_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id uuid REFERENCES public.webinars(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  name text,
  attended boolean DEFAULT false,
  registered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view their webinar registrations"
  ON public.webinar_registrations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM webinars w WHERE w.id = webinar_registrations.webinar_id AND w.author_id = auth.uid()
  ));

CREATE POLICY "Anyone can register for a webinar"
  ON public.webinar_registrations FOR INSERT
  WITH CHECK (true);

-- 5. AUDIOBOOKS (Section 4.4)
CREATE TABLE public.audiobooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  source_asset_id uuid REFERENCES public.generated_assets(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  script_markdown text NOT NULL DEFAULT '',
  audio_url text,
  duration_minutes integer,
  narrator_type text DEFAULT 'author',
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audiobooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own audiobooks"
  ON public.audiobooks FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Published audiobooks are public"
  ON public.audiobooks FOR SELECT
  USING (status = 'published');

CREATE TRIGGER update_audiobooks_updated_at
  BEFORE UPDATE ON public.audiobooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. COURSE QUIZZES (Section 4.1 - extends existing courses)
CREATE TABLE public.course_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer integer NOT NULL DEFAULT 0,
  explanation text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage quizzes"
  ON public.course_quizzes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM course_lessons cl
    JOIN course_modules cm ON cm.id = cl.module_id
    JOIN courses c ON c.id = cm.course_id
    WHERE cl.id = course_quizzes.lesson_id AND c.author_id = auth.uid()
  ));

CREATE POLICY "Published course quizzes are public"
  ON public.course_quizzes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM course_lessons cl
    JOIN course_modules cm ON cm.id = cl.module_id
    JOIN courses c ON c.id = cm.course_id
    WHERE cl.id = course_quizzes.lesson_id AND c.status = 'published'
  ));

-- 7. COURSE ENROLLMENTS (Section 4.1 - student tracking)
CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  progress_percent integer DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  UNIQUE(course_id, user_id)
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrollments"
  ON public.course_enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollment"
  ON public.course_enrollments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authors can view enrollments for their courses"
  ON public.course_enrollments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM courses c WHERE c.id = course_enrollments.course_id AND c.author_id = auth.uid()
  ));

-- 8. SOCIAL MEDIA CONTENT (Section 4.10)
CREATE TABLE public.social_media_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  source_asset_id uuid REFERENCES public.generated_assets(id) ON DELETE SET NULL,
  platform text NOT NULL DEFAULT 'all',
  content_type text NOT NULL DEFAULT 'post',
  content_text text NOT NULL DEFAULT '',
  image_prompt text,
  scheduled_date date,
  day_number integer,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_media_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own social content"
  ON public.social_media_content FOR ALL
  USING (auth.uid() = author_id);

-- 9. Add book_id to courses table (currently missing per plan requirement)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE SET NULL;

-- 10. Add source_asset_id to courses (link back to generated_assets)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS source_asset_id uuid REFERENCES public.generated_assets(id) ON DELETE SET NULL;
