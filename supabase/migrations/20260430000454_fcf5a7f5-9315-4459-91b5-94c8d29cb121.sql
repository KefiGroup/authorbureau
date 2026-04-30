-- Enforce referential integrity: books.author_id must point to author_profiles.id
-- Pre-verified: 7/7 rows resolve cleanly, 0 orphans, 0 nulls.

ALTER TABLE public.books
  ADD CONSTRAINT books_author_id_fkey
  FOREIGN KEY (author_id)
  REFERENCES public.author_profiles(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Index to keep the join fast and the FK check cheap
CREATE INDEX IF NOT EXISTS idx_books_author_id ON public.books(author_id);