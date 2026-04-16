
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS rejection_note text;

-- Backfill: books with published_at set are already approved
UPDATE public.books SET approval_status = 'approved' WHERE published_at IS NOT NULL AND approval_status = 'pending';
