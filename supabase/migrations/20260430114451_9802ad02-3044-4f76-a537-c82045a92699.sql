-- 1. Add book_id to social_posts
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_social_posts_author_book
  ON public.social_posts(author_id, book_id);

-- Backfill: social_posts are produced by BP-03 → use that node's book_id
UPDATE public.social_posts sp
SET book_id = an.book_id
FROM public.author_nodes an
WHERE sp.book_id IS NULL
  AND an.author_id = sp.author_id
  AND an.node_id = 'BP-03'
  AND an.book_id IS NOT NULL;

-- 2. Add book_id to crm_contacts
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_author_book
  ON public.crm_contacts(author_id, book_id);

-- Backfill: derive from last_node_id → author_nodes.book_id
UPDATE public.crm_contacts c
SET book_id = an.book_id
FROM public.author_nodes an
WHERE c.book_id IS NULL
  AND c.last_node_id IS NOT NULL
  AND an.author_id = c.author_id
  AND an.node_id = c.last_node_id
  AND an.book_id IS NOT NULL;