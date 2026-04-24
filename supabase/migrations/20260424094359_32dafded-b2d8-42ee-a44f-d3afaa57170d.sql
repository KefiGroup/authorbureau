-- 1) Add book_id column (nullable so backfill works first; FK to books)
ALTER TABLE public.author_nodes
  ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE CASCADE;

-- 2) Backfill: assign every existing author_nodes row to the author's OLDEST book
WITH oldest_books AS (
  SELECT DISTINCT ON (author_id)
    author_id,
    id AS book_id
  FROM public.books
  ORDER BY author_id, created_at ASC
)
UPDATE public.author_nodes an
SET book_id = ob.book_id
FROM public.author_profiles ap
JOIN oldest_books ob ON ob.author_id = ap.user_id
WHERE an.author_id = ap.id
  AND an.book_id IS NULL;

-- 3) Drop the old (author_id, node_id) unique constraint if present, replace with
--    (author_id, node_id, book_id) so two books can each have their own copy of a node.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.author_nodes'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(author_id, node_id)%'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.author_nodes DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- Drop a matching unique index if it exists (in case it was index-only, not constraint)
DROP INDEX IF EXISTS public.author_nodes_author_id_node_id_key;
DROP INDEX IF EXISTS public.author_nodes_author_node_unique;

-- 4) Create new partial unique index that treats NULL book_id as a single legacy bucket
--    (so legacy rows still can't duplicate during the migration window) AND enforces
--    uniqueness per book for new per-book rows.
CREATE UNIQUE INDEX IF NOT EXISTS author_nodes_author_node_book_uniq
  ON public.author_nodes (author_id, node_id, COALESCE(book_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 5) Helpful index for per-book reads (sidebar counters, microsite Go Deeper section)
CREATE INDEX IF NOT EXISTS author_nodes_book_id_idx ON public.author_nodes (book_id);