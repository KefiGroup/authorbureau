ALTER TABLE public.books ADD COLUMN IF NOT EXISTS owner_email text;
CREATE INDEX IF NOT EXISTS idx_books_owner_email ON public.books(owner_email);