ALTER TABLE public.author_profiles 
ADD COLUMN IF NOT EXISTS directory_status text NOT NULL DEFAULT 'unlisted',
ADD COLUMN IF NOT EXISTS author_slug text;

-- Set existing legacy authors as 'featured'
UPDATE public.author_profiles 
SET directory_status = 'featured' 
WHERE pen_name IN ('Felicia Tan', 'Robert J. Battista', 'Pauline Teo');

-- Create index for directory queries
CREATE INDEX IF NOT EXISTS idx_author_profiles_directory_status ON public.author_profiles(directory_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_author_profiles_slug ON public.author_profiles(author_slug) WHERE author_slug IS NOT NULL;