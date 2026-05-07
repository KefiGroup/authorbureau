-- Sprint 8 follow-up: per-book microsite URL paths to prevent collisions
-- New signature accepts optional book_id; old 2-arg signature kept as wrapper for back-compat.

CREATE OR REPLACE FUNCTION public.compute_node_microsite_url(
  p_author_id uuid,
  p_node_id text,
  p_book_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
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

  IF p_book_id IS NOT NULL THEN
    SELECT slug INTO v_book_slug FROM public.books WHERE id = p_book_id LIMIT 1;
    IF v_book_slug IS NOT NULL AND v_book_slug <> '' THEN
      RETURN v_origin || '/' || v_author_slug || '/' || v_book_slug || '/' || v_slug;
    END IF;
  END IF;

  RETURN v_origin || '/' || v_author_slug || '/' || v_slug;
END;
$$;

-- Back-compat 2-arg wrapper (delegates to 3-arg with NULL book)
CREATE OR REPLACE FUNCTION public.compute_node_microsite_url(
  p_author_id uuid,
  p_node_id text
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT public.compute_node_microsite_url(p_author_id, p_node_id, NULL::uuid);
$$;

-- Update autofill trigger to pass book_id
CREATE OR REPLACE FUNCTION public.author_nodes_autofill_delivery_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'live' AND (NEW.delivery_url IS NULL OR NEW.delivery_url = '') THEN
    NEW.delivery_url := public.compute_node_microsite_url(NEW.author_id, NEW.node_id, NEW.book_id);
  END IF;
  IF NEW.archetype IS NULL THEN
    NEW.archetype := CASE
      WHEN NEW.node_id IN ('BP-06','BP-07','BP-08','BP-09','BA-10','BA-11','BA-12','BA-17') THEN 'A'::public.node_archetype
      WHEN NEW.node_id IN ('BP-01','BP-02','BP-03','BP-04','BP-05','BA-14') THEN 'B'::public.node_archetype
      WHEN NEW.node_id IN ('BA-13','YR-19','YR-20','YR-21','YR-22','YR-23','YR-25') THEN 'C'::public.node_archetype
      WHEN NEW.node_id IN ('BA-15','BA-16','BA-18','YR-24','YR-26','YR-27','YR-28') THEN 'D'::public.node_archetype
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill existing live nodes that have a book_id so their delivery_url uses the new per-book path
UPDATE public.author_nodes
   SET delivery_url = public.compute_node_microsite_url(author_id, node_id, book_id)
 WHERE status = 'live'
   AND book_id IS NOT NULL
   AND public.compute_node_microsite_url(author_id, node_id, book_id) IS NOT NULL
   AND COALESCE(delivery_url,'') IS DISTINCT FROM public.compute_node_microsite_url(author_id, node_id, book_id);
