ALTER TABLE public.audiobooks 
  ADD COLUMN IF NOT EXISTS distribution_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS narrator_credit text,
  ADD COLUMN IF NOT EXISTS preview_chapter_index integer,
  ADD COLUMN IF NOT EXISTS distribution_manifest jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS distributed_at timestamptz;