ALTER TABLE public.author_profiles
  ADD COLUMN IF NOT EXISTS methodology_name text,
  ADD COLUMN IF NOT EXISTS sign_off_phrase text,
  ADD COLUMN IF NOT EXISTS quiz_name text;

-- Seed Pauline Teo's record
UPDATE public.author_profiles
SET methodology_name = 'SUCKCESS',
    sign_off_phrase = 'To your SUCKCESS',
    quiz_name = 'SUCKCESS Stage Quiz'
WHERE pen_name = 'Pauline Teo';