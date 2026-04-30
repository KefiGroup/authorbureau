-- Pure recursive scrubber: jsonb -> jsonb (no violation reporting here).
CREATE OR REPLACE FUNCTION public.scrub_microsite_jsonb(v jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  k text;
  child jsonb;
  cleaned text;
  arr jsonb := '[]'::jsonb;
  obj jsonb := '{}'::jsonb;
  i int;
BEGIN
  IF v IS NULL THEN RETURN v; END IF;

  IF jsonb_typeof(v) = 'string' THEN
    cleaned := v #>> '{}';
    -- Pass through URL/email-like strings untouched.
    IF cleaned ~* '^(https?://|mailto:|/)' OR cleaned ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RETURN v;
    END IF;
    -- Strip emdash/endash.
    cleaned := regexp_replace(cleaned, '(\d)\s*[—–]\s*(\d)', '\1 - \2', 'g');
    cleaned := regexp_replace(cleaned, '\s*[—–]\s*', ', ', 'g');
    cleaned := regexp_replace(cleaned, ',\s*,', ',', 'g');
    -- Strip bracket placeholders.
    cleaned := regexp_replace(cleaned, '\[insert[^\]]*\]', '', 'gi');
    cleaned := regexp_replace(cleaned, '\{\{[^}]+\}\}', '', 'g');
    cleaned := regexp_replace(cleaned, '<<[^>]+>>', '', 'g');
    cleaned := regexp_replace(cleaned, '\s{2,}', ' ', 'g');
    cleaned := trim(cleaned);
    RETURN to_jsonb(cleaned);
  END IF;

  IF jsonb_typeof(v) = 'array' THEN
    FOR i IN 0 .. jsonb_array_length(v) - 1 LOOP
      arr := arr || jsonb_build_array(public.scrub_microsite_jsonb(v->i));
    END LOOP;
    RETURN arr;
  END IF;

  IF jsonb_typeof(v) = 'object' THEN
    FOR k, child IN SELECT * FROM jsonb_each(v) LOOP
      obj := obj || jsonb_build_object(k, public.scrub_microsite_jsonb(child));
    END LOOP;
    RETURN obj;
  END IF;

  RETURN v;
END;
$$;

-- Lightweight detector: returns the rule name if v as a flat string contains a violation.
CREATE OR REPLACE FUNCTION public.detect_microsite_violations(v jsonb)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  flat text;
  hits text[] := ARRAY[]::text[];
BEGIN
  IF v IS NULL THEN RETURN hits; END IF;
  flat := v::text;
  IF flat ~ '[—–]' THEN hits := hits || 'emdash'; END IF;
  IF flat ~* '(\[insert|\{\{|<<|Lorem ipsum)' THEN hits := hits || 'placeholder'; END IF;
  RETURN hits;
END;
$$;

-- Trigger: scrub + log.
CREATE OR REPLACE FUNCTION public.author_nodes_scrub_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule text;
  hits text[];
BEGIN
  IF NEW.content_json IS NULL THEN
    RETURN NEW;
  END IF;

  hits := public.detect_microsite_violations(NEW.content_json);
  NEW.content_json := public.scrub_microsite_jsonb(NEW.content_json);

  IF array_length(hits, 1) IS NOT NULL THEN
    BEGIN
      FOREACH rule IN ARRAY hits LOOP
        INSERT INTO public.content_quality_log(author_id, node_id, rule, sample, field_path, source)
        VALUES (NEW.author_id, NEW.node_id, rule, NULL, NULL, 'db_trigger');
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_author_nodes_scrub_content ON public.author_nodes;
CREATE TRIGGER trg_author_nodes_scrub_content
  BEFORE INSERT OR UPDATE OF content_json ON public.author_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.author_nodes_scrub_content();