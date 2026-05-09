-- Sprint 56: per-book uniqueness + book-scoped public URL

-- 1. Replace (author_id, node_id) unique with (author_id, node_id, book_id)
ALTER TABLE public.author_nodes
  DROP CONSTRAINT IF EXISTS author_nodes_author_node_unique;

ALTER TABLE public.author_nodes
  ADD CONSTRAINT author_nodes_author_node_book_unique
  UNIQUE (author_id, node_id, book_id);

-- 2. Block regression to author-level (NULL book_id) rows.
--    Per Sprint 8 memory: AUTHOR_LEVEL_NODES is empty; every node row is book-scoped.
CREATE UNIQUE INDEX IF NOT EXISTS author_nodes_no_null_book_guard
  ON public.author_nodes (author_id, node_id)
  WHERE book_id IS NULL;

-- 3. Harden compute_node_microsite_url: require book context, drop 2-segment fallback.
CREATE OR REPLACE FUNCTION public.compute_node_microsite_url(p_author_id uuid, p_node_id text, p_book_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text;
  v_author_slug text;
  v_book_slug text;
  v_origin text := 'https://authorsbureau.com';
BEGIN
  -- Nodes that should NOT produce a public microsite URL
  IF p_node_id IN ('BP-01','BP-03','BP-08','BP-09') THEN
    RETURN NULL;
  END IF;

  SELECT microsite_slug INTO v_slug
    FROM public.node_registry
   WHERE node_id = p_node_id;

  IF v_slug IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT author_slug INTO v_author_slug
    FROM public.author_profiles
   WHERE id = p_author_id
   LIMIT 1;

  IF v_author_slug IS NULL THEN
    RETURN NULL;
  END IF;

  -- Sprint 56: book context is required. Without a book slug we return NULL
  -- rather than emit an ambiguous /{author}/{node} URL that would collide for
  -- multi-book authors.
  IF p_book_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT slug INTO v_book_slug FROM public.books WHERE id = p_book_id LIMIT 1;
  IF v_book_slug IS NULL OR v_book_slug = '' THEN
    RETURN NULL;
  END IF;

  RETURN v_origin || '/' || v_author_slug || '/' || v_book_slug || '/' || v_slug;
END;
$function$;

-- 4. The 2-arg overload now also returns NULL (no book context = no URL).
CREATE OR REPLACE FUNCTION public.compute_node_microsite_url(p_author_id uuid, p_node_id text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT public.compute_node_microsite_url(p_author_id, p_node_id, NULL::uuid);
$function$;