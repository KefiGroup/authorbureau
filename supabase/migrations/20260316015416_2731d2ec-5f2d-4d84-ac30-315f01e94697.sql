
-- 1. Extend courses table with workshop-specific fields
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS course_format text DEFAULT '2_day',
  ADD COLUMN IF NOT EXISTS target_student text,
  ADD COLUMN IF NOT EXISTS transformation_promises jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS workshop_schedule jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS subtitle text;

-- 2. Extend course_modules with pedagogical fields
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS blooms_level text,
  ADD COLUMN IF NOT EXISTS kolbs_stage text,
  ADD COLUMN IF NOT EXISTS learning_objectives jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS facilitator_activity text,
  ADD COLUMN IF NOT EXISTS debrief_points jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS workbook_page_description text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS source_chapters jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS module_number integer DEFAULT 0;

-- 3. Create course_deliverables table
CREATE TABLE IF NOT EXISTS public.course_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'workbook',
  title text NOT NULL DEFAULT '',
  content text DEFAULT '',
  file_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.course_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their course deliverables"
  ON public.course_deliverables FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = course_deliverables.course_id AND c.author_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = course_deliverables.course_id AND c.author_id = auth.uid()
  ));

CREATE POLICY "Published course deliverables are public"
  ON public.course_deliverables FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = course_deliverables.course_id AND c.status = 'published'
  ));

-- 4. Create module_progress table
CREATE TABLE IF NOT EXISTS public.module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES public.course_enrollments(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES public.course_modules(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  activity_completed boolean DEFAULT false,
  debrief_completed boolean DEFAULT false,
  workbook_completed boolean DEFAULT false,
  UNIQUE (enrollment_id, module_id)
);

ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own module progress"
  ON public.module_progress FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_enrollments ce WHERE ce.id = module_progress.enrollment_id AND ce.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own module progress"
  ON public.module_progress FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_enrollments ce WHERE ce.id = module_progress.enrollment_id AND ce.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own module progress"
  ON public.module_progress FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.course_enrollments ce WHERE ce.id = module_progress.enrollment_id AND ce.user_id = auth.uid()
  ));

CREATE POLICY "Authors can view progress for their courses"
  ON public.module_progress FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.id = module_progress.enrollment_id AND c.author_id = auth.uid()
  ));

-- 5. Add certificate_url to course_enrollments
ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS certificate_url text;
