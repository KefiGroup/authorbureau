
-- Extended author profiles for the dashboard
CREATE TABLE public.author_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  pen_name TEXT,
  bio_short TEXT,
  bio_long TEXT,
  tagline TEXT,
  photo_url TEXT,
  cover_photo_url TEXT,
  location_city TEXT,
  location_country TEXT,
  website_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  genres TEXT[] DEFAULT '{}',
  credentials JSONB DEFAULT '[]',
  is_speaker BOOLEAN DEFAULT false,
  speaker_fee_range TEXT,
  availability_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view their own profile" ON public.author_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authors can insert their own profile" ON public.author_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can update their own profile" ON public.author_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public profiles are viewable" ON public.author_profiles FOR SELECT USING (true);
CREATE POLICY "Admins can view all profiles" ON public.author_profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_author_profiles_updated_at BEFORE UPDATE ON public.author_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Courses
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can manage their own courses" ON public.courses FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "Published courses are public" ON public.courses FOR SELECT USING (status = 'published');

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Course modules
CREATE TABLE public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can manage modules of their courses" ON public.course_modules FOR ALL
  USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_modules.course_id AND courses.author_id = auth.uid()));
CREATE POLICY "Published course modules are public" ON public.course_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_modules.course_id AND courses.status = 'published'));

-- Course lessons
CREATE TABLE public.course_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can manage lessons" ON public.course_lessons FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = course_lessons.module_id AND c.author_id = auth.uid()
  ));
CREATE POLICY "Published course lessons are public" ON public.course_lessons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = course_lessons.module_id AND c.status = 'published'
  ));

-- Coaching packages
CREATE TABLE public.coaching_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT '1on1',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  duration_minutes INT DEFAULT 60,
  sessions_count INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can manage their coaching packages" ON public.coaching_packages FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "Active packages are public" ON public.coaching_packages FOR SELECT USING (status = 'active');

CREATE TRIGGER update_coaching_packages_updated_at BEFORE UPDATE ON public.coaching_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Speaking topics
CREATE TABLE public.speaking_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INT DEFAULT 60,
  fee NUMERIC(10,2),
  fee_currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.speaking_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can manage their speaking topics" ON public.speaking_topics FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "Active topics are public" ON public.speaking_topics FOR SELECT USING (status = 'active');
