
-- Training Programs table (facilitated workshops with pedagogical structure)
CREATE TABLE public.training_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  book_id UUID REFERENCES public.books(id),
  source_asset_id UUID REFERENCES public.generated_assets(id),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  course_format TEXT DEFAULT '2_day',
  target_student TEXT,
  transformation_promises JSONB DEFAULT '[]'::jsonb,
  workshop_schedule JSONB DEFAULT '{}'::jsonb,
  cover_image_url TEXT,
  price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training modules table (with full pedagogical columns)
CREATE TABLE public.training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  module_number INTEGER DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  blooms_level TEXT,
  kolbs_stage TEXT,
  learning_objectives JSONB DEFAULT '[]'::jsonb,
  facilitator_activity TEXT,
  debrief_points JSONB DEFAULT '[]'::jsonb,
  workbook_page_description TEXT,
  slide_content TEXT,
  duration_minutes INTEGER DEFAULT 60,
  source_chapters JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training deliverables (workbook, slides, trainer's manual, mindmap)
CREATE TABLE public.training_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'workbook',
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_deliverables ENABLE ROW LEVEL SECURITY;

-- RLS: training_programs
CREATE POLICY "Authors can manage their own training programs"
  ON public.training_programs FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Published training programs are public"
  ON public.training_programs FOR SELECT
  USING (status = 'published');

-- RLS: training_modules
CREATE POLICY "Authors can manage modules of their training programs"
  ON public.training_modules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.training_programs
    WHERE training_programs.id = training_modules.training_id
    AND training_programs.author_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.training_programs
    WHERE training_programs.id = training_modules.training_id
    AND training_programs.author_id = auth.uid()
  ));

CREATE POLICY "Published training modules are public"
  ON public.training_modules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.training_programs
    WHERE training_programs.id = training_modules.training_id
    AND training_programs.status = 'published'
  ));

-- RLS: training_deliverables
CREATE POLICY "Authors can manage their training deliverables"
  ON public.training_deliverables FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.training_programs
    WHERE training_programs.id = training_deliverables.training_id
    AND training_programs.author_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.training_programs
    WHERE training_programs.id = training_deliverables.training_id
    AND training_programs.author_id = auth.uid()
  ));

CREATE POLICY "Published training deliverables are public"
  ON public.training_deliverables FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.training_programs
    WHERE training_programs.id = training_deliverables.training_id
    AND training_programs.status = 'published'
  ));
