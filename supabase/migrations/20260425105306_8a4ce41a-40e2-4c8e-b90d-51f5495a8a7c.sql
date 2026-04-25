
-- ─── 1. Archetype enum + column on author_nodes ─────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.node_archetype AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.author_nodes
  ADD COLUMN IF NOT EXISTS archetype public.node_archetype;

-- Backfill archetype from node_id (single source of truth)
UPDATE public.author_nodes SET archetype = CASE
  -- Archetype A — Digital Self-Serve (instant delivery)
  WHEN node_id IN ('BP-06','BP-07','BP-08','BP-09','BA-10','BA-11','BA-12','BA-17') THEN 'A'::public.node_archetype
  -- Archetype B — Lead Capture (free → nurture)
  WHEN node_id IN ('BP-01','BP-02','BP-03','BP-04','BP-05','BA-14') THEN 'B'::public.node_archetype
  -- Archetype C — High-Touch Service (application + scheduling)
  WHEN node_id IN ('BA-13','YR-19','YR-20','YR-21','YR-22','YR-23','YR-25') THEN 'C'::public.node_archetype
  -- Archetype D — Event / External (tickets, retreats, partners)
  WHEN node_id IN ('BA-15','BA-16','BA-18','YR-24','YR-26','YR-27','YR-28') THEN 'D'::public.node_archetype
  ELSE NULL
END
WHERE archetype IS NULL;

CREATE INDEX IF NOT EXISTS idx_author_nodes_archetype ON public.author_nodes(archetype);

-- ─── 2. Tighten delivery_type to canonical set ──────────────────────────────
-- Keep existing free-form values that don't match by rewriting them; legacy
-- values like 'workbook', 'home_study', 'speaking_kit', 'special_edition',
-- 'digital_audio' all collapse to 'digital_download' for Archetype A nodes.
UPDATE public.author_nodes SET delivery_type = CASE
  WHEN delivery_type IN ('digital_download','course_access','application','external_link','event') THEN delivery_type
  WHEN archetype = 'A' THEN 'digital_download'
  WHEN archetype = 'B' THEN 'external_link'   -- lead-capture page is the "delivery"
  WHEN archetype = 'C' THEN 'application'
  WHEN archetype = 'D' THEN 'external_link'
  ELSE delivery_type
END
WHERE delivery_type IS NOT NULL OR archetype IS NOT NULL;

ALTER TABLE public.author_nodes DROP CONSTRAINT IF EXISTS author_nodes_delivery_type_check;
ALTER TABLE public.author_nodes
  ADD CONSTRAINT author_nodes_delivery_type_check
  CHECK (delivery_type IS NULL OR delivery_type IN (
    'digital_download','course_access','application','external_link','event'
  ));

-- ─── 3. Helper function: compute canonical reader URL for a node ────────────
CREATE OR REPLACE FUNCTION public.compute_node_microsite_url(
  p_author_id uuid,
  p_node_id text
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_author_slug text;
  v_origin text := 'https://authorsbureau.com';
BEGIN
  -- Mirror src/lib/node-slug-map.ts NODE_SLUG_MAP
  v_slug := CASE p_node_id
    WHEN 'BP-02' THEN 'free-gift'
    WHEN 'BP-04' THEN 'author-website'
    WHEN 'BP-05' THEN 'webinar'
    WHEN 'BP-06' THEN 'workbook'
    WHEN 'BP-07' THEN 'home-study'
    WHEN 'BP-08' THEN 'special-edition'
    WHEN 'BP-09' THEN 'book'
    WHEN 'BA-10' THEN 'online-course'
    WHEN 'BA-11' THEN 'audiobook'
    WHEN 'BA-12' THEN 'membership'
    WHEN 'BA-13' THEN 'group-coaching'
    WHEN 'BA-14' THEN 'podcast'
    WHEN 'BA-15' THEN 'press'
    WHEN 'BA-16' THEN 'affiliates'
    WHEN 'BA-17' THEN 'bundles'
    WHEN 'BA-18' THEN 'partners'
    WHEN 'YR-19' THEN 'coaching'
    WHEN 'YR-20' THEN 'vip'
    WHEN 'YR-21' THEN 'speaking'
    WHEN 'YR-22' THEN 'corporate-training'
    WHEN 'YR-23' THEN 'mastermind'
    WHEN 'YR-24' THEN 'retreat'
    WHEN 'YR-25' THEN 'certification'
    WHEN 'YR-26' THEN 'conference'
    WHEN 'YR-27' THEN 'fundraising'
    WHEN 'YR-28' THEN 'sponsors'
    ELSE NULL
  END;

  -- Nodes with no public page (BP-01, BP-03, BP-08, BP-09 per NO_MICROSITE_NODES)
  -- BP-09 (book) does have a slug but is library-only — handled below
  IF v_slug IS NULL THEN RETURN NULL; END IF;
  IF p_node_id IN ('BP-01','BP-03','BP-08','BP-09') THEN RETURN NULL; END IF;

  SELECT author_slug INTO v_author_slug
  FROM public.author_profiles
  WHERE id = p_author_id
  LIMIT 1;

  IF v_author_slug IS NULL THEN RETURN NULL; END IF;
  RETURN v_origin || '/' || v_author_slug || '/' || v_slug;
END;
$$;

-- ─── 4. Backfill delivery_url on every LIVE node missing one ────────────────
-- This is the actual fix for broken Buy/CTA links: most live nodes had NULL
-- delivery_url. Until commerce ships per-archetype delivery (signed download
-- URLs for A, application form for C), the public microsite URL is the
-- correct reader-facing landing page for every archetype.
UPDATE public.author_nodes
SET delivery_url = public.compute_node_microsite_url(author_id, node_id)
WHERE status = 'live'
  AND (delivery_url IS NULL OR delivery_url = '')
  AND public.compute_node_microsite_url(author_id, node_id) IS NOT NULL;

-- ─── 5. Trigger: auto-fill delivery_url whenever a node goes live ───────────
CREATE OR REPLACE FUNCTION public.author_nodes_autofill_delivery_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when the row is (becoming) live and delivery_url is empty
  IF NEW.status = 'live' AND (NEW.delivery_url IS NULL OR NEW.delivery_url = '') THEN
    NEW.delivery_url := public.compute_node_microsite_url(NEW.author_id, NEW.node_id);
  END IF;
  -- Backfill archetype too if missing (defensive)
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

DROP TRIGGER IF EXISTS author_nodes_autofill_delivery_url_trg ON public.author_nodes;
CREATE TRIGGER author_nodes_autofill_delivery_url_trg
  BEFORE INSERT OR UPDATE OF status, delivery_url ON public.author_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.author_nodes_autofill_delivery_url();

-- ─── 6. Monitoring view: every live node + its resolved CTA target ──────────
CREATE OR REPLACE VIEW public.link_audit_v AS
SELECT
  n.id                AS author_node_id,
  n.author_id,
  ap.pen_name,
  ap.author_slug,
  n.node_id,
  n.node_name,
  n.archetype,
  n.status,
  n.price_usd,
  n.stripe_price_id,
  n.delivery_type,
  n.delivery_url,
  public.compute_node_microsite_url(n.author_id, n.node_id) AS expected_microsite_url,
  CASE
    WHEN n.status <> 'live' THEN 'not_live'
    WHEN n.delivery_url IS NULL OR n.delivery_url = '' THEN 'MISSING_DELIVERY_URL'
    WHEN n.archetype = 'A' AND COALESCE(n.price_usd, 0) > 0 AND n.stripe_price_id IS NULL THEN 'MISSING_STRIPE_PRICE'
    ELSE 'ok'
  END AS link_status
FROM public.author_nodes n
LEFT JOIN public.author_profiles ap ON ap.id = n.author_id;

GRANT SELECT ON public.link_audit_v TO authenticated;
