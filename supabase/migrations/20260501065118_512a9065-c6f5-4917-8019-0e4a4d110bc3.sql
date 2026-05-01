
-- ============================================================
-- Sprint 49 — DB-level node hardening (Half A)
-- ============================================================

-- 1. Create node_registry table
CREATE TABLE public.node_registry (
  node_id          text PRIMARY KEY,
  canonical_label  text NOT NULL,
  category         text NOT NULL CHECK (category IN ('brand','build','yield')),
  archetype        public.node_archetype NOT NULL,
  microsite_slug   text NULL,
  display_order    integer NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.node_registry ENABLE ROW LEVEL SECURITY;

-- Reference data: anyone (including anon) can read
CREATE POLICY "node_registry readable by all"
  ON public.node_registry FOR SELECT
  USING (true);

-- Only admins can mutate (no policy = denied for non-admins; service role bypasses RLS)
CREATE POLICY "node_registry admins manage"
  ON public.node_registry FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Seed all 28 nodes (mirrors _shared/canonical-node-labels.ts and compute_node_microsite_url)
INSERT INTO public.node_registry (node_id, canonical_label, category, archetype, microsite_slug, display_order) VALUES
  -- Brand Products (BP-01..BP-09)
  ('BP-01', 'Email Marketing',     'brand', 'B', NULL,              1),
  ('BP-02', 'Lead Magnet',         'brand', 'B', 'free-gift',       2),
  ('BP-03', 'Social Media',        'brand', 'B', NULL,              3),
  ('BP-04', 'Author Website',      'brand', 'B', 'author-website',  4),
  ('BP-05', 'Webinars',            'brand', 'B', 'webinar',         5),
  ('BP-06', 'Workbook',            'brand', 'A', 'workbook',        6),
  ('BP-07', 'Home Study Course',   'brand', 'A', 'home-study',      7),
  ('BP-08', 'Special Editions',    'brand', 'A', 'special-edition', 8),
  ('BP-09', 'Book Sales',          'brand', 'A', 'book',            9),
  -- Build Authority (BA-10..BA-18)
  ('BA-10', 'Online Course',       'build', 'A', 'online-course',   10),
  ('BA-11', 'Audiobook',           'build', 'A', 'audiobook',       11),
  ('BA-12', 'Membership',          'build', 'A', 'membership',      12),
  ('BA-13', 'Group Coaching',      'build', 'C', 'group-coaching',  13),
  ('BA-14', 'Podcast Tour',        'build', 'B', 'podcast',         14),
  ('BA-15', 'Media & PR',          'build', 'D', 'press',           15),
  ('BA-16', 'Affiliates',          'build', 'D', 'affiliates',      16),
  ('BA-17', 'Bundles',             'build', 'A', 'bundles',         17),
  ('BA-18', 'JV Partnerships',     'build', 'D', 'partners',        18),
  -- Yield Revenue (YR-19..YR-28)
  ('YR-19', '1-on-1 Coaching',     'yield', 'C', 'coaching',        19),
  ('YR-20', 'Big Ticket Consulting','yield','C', 'vip',             20),
  ('YR-21', 'Speaking',            'yield', 'C', 'speaking',        21),
  ('YR-22', 'Corporate Training',  'yield', 'C', 'corporate-training', 22),
  ('YR-23', 'Mastermind',          'yield', 'C', 'mastermind',      23),
  ('YR-24', 'Retreats',            'yield', 'D', 'retreat',         24),
  ('YR-25', 'Certification',       'yield', 'C', 'certification',   25),
  ('YR-26', 'Conference',          'yield', 'D', 'conference',      26),
  ('YR-27', 'Fundraising',         'yield', 'D', 'fundraising',     27),
  ('YR-28', 'Sponsors',            'yield', 'D', 'sponsors',        28);

-- Assertion: row count = 28
DO $$
BEGIN
  IF (SELECT count(*) FROM public.node_registry) <> 28 THEN
    RAISE EXCEPTION 'node_registry seed failed: expected 28 rows, got %', (SELECT count(*) FROM public.node_registry);
  END IF;
END $$;

-- 3. Pre-flight orphan check on author_nodes
DO $$
DECLARE
  v_orphans text;
BEGIN
  SELECT string_agg(DISTINCT node_id, ', ' ORDER BY node_id) INTO v_orphans
  FROM public.author_nodes
  WHERE node_id IS NOT NULL
    AND node_id NOT IN (SELECT node_id FROM public.node_registry);
  IF v_orphans IS NOT NULL THEN
    RAISE EXCEPTION 'author_nodes contains node_id values missing from node_registry: %', v_orphans;
  END IF;
END $$;

-- Pre-flight orphan check on crm_contacts
DO $$
DECLARE
  v_orphans text;
BEGIN
  SELECT string_agg(DISTINCT last_node_id, ', ' ORDER BY last_node_id) INTO v_orphans
  FROM public.crm_contacts
  WHERE last_node_id IS NOT NULL
    AND last_node_id NOT IN (SELECT node_id FROM public.node_registry);
  IF v_orphans IS NOT NULL THEN
    RAISE EXCEPTION 'crm_contacts contains last_node_id values missing from node_registry: %', v_orphans;
  END IF;
END $$;

-- 4. Backfill existing author_nodes.node_name to canonical labels
UPDATE public.author_nodes an
   SET node_name = nr.canonical_label
  FROM public.node_registry nr
 WHERE an.node_id = nr.node_id
   AND an.node_name IS DISTINCT FROM nr.canonical_label;

-- 5. Add foreign keys
ALTER TABLE public.author_nodes
  ADD CONSTRAINT author_nodes_node_id_fkey
  FOREIGN KEY (node_id) REFERENCES public.node_registry(node_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.crm_contacts
  ADD CONSTRAINT crm_contacts_last_node_id_fkey
  FOREIGN KEY (last_node_id) REFERENCES public.node_registry(node_id)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- 6. Trigger: force canonical node_name on author_nodes writes
CREATE OR REPLACE FUNCTION public.author_nodes_force_canonical_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_canonical text;
BEGIN
  IF NEW.node_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT canonical_label INTO v_canonical
    FROM public.node_registry
   WHERE node_id = NEW.node_id;
  IF v_canonical IS NOT NULL THEN
    NEW.node_name := v_canonical;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS author_nodes_force_canonical_name_trg ON public.author_nodes;
CREATE TRIGGER author_nodes_force_canonical_name_trg
  BEFORE INSERT OR UPDATE OF node_id, node_name ON public.author_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.author_nodes_force_canonical_name();

-- 7. Refactor compute_node_microsite_url to read from node_registry
CREATE OR REPLACE FUNCTION public.compute_node_microsite_url(p_author_id uuid, p_node_id text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text;
  v_author_slug text;
  v_origin text := 'https://authorsbureau.com';
BEGIN
  -- Nodes that should NOT produce a public microsite URL even though they have a slug
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

  RETURN v_origin || '/' || v_author_slug || '/' || v_slug;
END;
$function$;
