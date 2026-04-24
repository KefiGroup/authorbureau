-- 1. Add column
ALTER TABLE public.author_context
  ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE CASCADE;

-- 2. Backfill: prefer matching by book_title (case-insensitive trim) within the author's books
WITH author_books AS (
  SELECT
    ap.id AS author_profile_id,
    b.id AS book_id,
    b.title,
    b.created_at
  FROM public.author_profiles ap
  JOIN public.books b ON b.author_id = ap.user_id
)
UPDATE public.author_context ac
SET book_id = ab.book_id
FROM author_books ab
WHERE ac.book_id IS NULL
  AND ac.author_id = ab.author_profile_id
  AND lower(trim(ac.book_title)) = lower(trim(ab.title));

-- 3. For any still-null rows, attach the author's oldest book
WITH oldest_books AS (
  SELECT DISTINCT ON (ap.id)
    ap.id AS author_profile_id,
    b.id AS book_id
  FROM public.author_profiles ap
  JOIN public.books b ON b.author_id = ap.user_id
  ORDER BY ap.id, b.created_at ASC
)
UPDATE public.author_context ac
SET book_id = ob.book_id
FROM oldest_books ob
WHERE ac.book_id IS NULL
  AND ac.author_id = ob.author_profile_id;

-- 4. Deduplicate: keep the most recent row per (author_id, book_id)
DELETE FROM public.author_context ac
USING public.author_context ac2
WHERE ac.book_id IS NOT NULL
  AND ac.author_id = ac2.author_id
  AND ac.book_id = ac2.book_id
  AND ac.created_at < ac2.created_at;

-- 5. Unique index now safe
CREATE UNIQUE INDEX IF NOT EXISTS author_context_author_book_uniq
  ON public.author_context (author_id, book_id)
  WHERE book_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS author_context_book_id_idx
  ON public.author_context (book_id);
