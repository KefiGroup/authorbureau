-- 1. Scrubber: keep {{first_name}} merge tag, strip every other leftover placeholder.
CREATE OR REPLACE FUNCTION public.scrub_microsite_jsonb(v jsonb)
 RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
DECLARE
  k text; child jsonb; cleaned text; arr jsonb := '[]'::jsonb; obj jsonb := '{}'::jsonb; i int;
BEGIN
  IF v IS NULL THEN RETURN v; END IF;
  IF jsonb_typeof(v) = 'string' THEN
    cleaned := v #>> '{}';
    IF cleaned ~* '^(https?://|mailto:|/)' OR cleaned ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RETURN v;
    END IF;
    cleaned := regexp_replace(cleaned, '(\d)\s*[—–]\s*(\d)', '\1 - \2', 'g');
    cleaned := regexp_replace(cleaned, '\s*[—–]\s*', ', ', 'g');
    cleaned := regexp_replace(cleaned, ',\s*,', ',', 'g');
    cleaned := regexp_replace(cleaned, '\[(insert|your)[^\]]*\]', '', 'gi');
    cleaned := regexp_replace(cleaned, '\{\{(?!\s*first_name\s*\}\})[^}]+\}\}', '', 'g');
    cleaned := regexp_replace(cleaned, '<<[^>]+>>', '', 'g');
    cleaned := regexp_replace(cleaned, '[ \t]{2,}', ' ', 'g');
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
$function$;

-- 2. Detector also catches "[Your ...]" placeholders; ignores the {{first_name}} merge tag.
CREATE OR REPLACE FUNCTION public.detect_microsite_violations(v jsonb)
 RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
DECLARE flat text; hits text[] := ARRAY[]::text[];
BEGIN
  IF v IS NULL THEN RETURN hits; END IF;
  flat := regexp_replace(v::text, '\{\{\s*first_name\s*\}\}', '', 'g');
  IF flat ~ '[—–]' THEN hits := array_append(hits, 'emdash'); END IF;
  IF flat ~* '(\[insert|\[your |\{\{|<<|Lorem ipsum)' THEN hits := array_append(hits, 'placeholder'); END IF;
  RETURN hits;
END;
$function$;

-- 3. Fill "[Your Name]" style placeholders with the author's real details (plain text).
CREATE OR REPLACE FUNCTION public.fill_author_placeholders(t text, p_author_id uuid)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE nm text; site text;
BEGIN
  IF t IS NULL OR t !~* '\[(your|author name|insert)' THEN RETURN t; END IF;
  SELECT coalesce(nullif(pen_name,''), 'the author'),
         coalesce(nullif(website_url,''), 'https://authorsbureau.com/' || author_slug)
    INTO nm, site FROM author_profiles WHERE id = p_author_id OR user_id = p_author_id LIMIT 1;
  nm := coalesce(nm, 'the author');
  site := coalesce(site, 'https://authorsbureau.com');
  t := regexp_replace(t, '\[(your )?(name|author name)[^\]]*\]', nm, 'gi');
  t := regexp_replace(t, '\[your (brand|company|organi[sz]ation)[^\]]*\]', nm, 'gi');
  t := regexp_replace(t, '\[your (website|link|social|email|contact)[^\]]*\]', site, 'gi');
  t := regexp_replace(t, '\[your title[^\]]*\]', 'Author', 'gi');
  t := regexp_replace(t, '\[(your|insert)[^\]]*\]', '', 'gi');
  t := regexp_replace(t, '[ \t]{2,}', ' ', 'g');
  RETURN t;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fill_author_placeholders_jsonb(v jsonb, p_author_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE k text; child jsonb; arr jsonb := '[]'::jsonb; obj jsonb := '{}'::jsonb; i int;
BEGIN
  IF v IS NULL OR v::text !~* '\[(your|author name|insert)' THEN RETURN v; END IF;
  IF jsonb_typeof(v) = 'string' THEN RETURN to_jsonb(public.fill_author_placeholders(v #>> '{}', p_author_id)); END IF;
  IF jsonb_typeof(v) = 'array' THEN
    FOR i IN 0 .. jsonb_array_length(v) - 1 LOOP
      arr := arr || jsonb_build_array(public.fill_author_placeholders_jsonb(v->i, p_author_id));
    END LOOP;
    RETURN arr;
  END IF;
  IF jsonb_typeof(v) = 'object' THEN
    FOR k, child IN SELECT * FROM jsonb_each(v) LOOP
      obj := obj || jsonb_build_object(k, public.fill_author_placeholders_jsonb(child, p_author_id));
    END LOOP;
    RETURN obj;
  END IF;
  RETURN v;
END;
$function$;

-- 4. author_nodes trigger: fill real details first, then scrub.
CREATE OR REPLACE FUNCTION public.author_nodes_scrub_content()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE rule text; hits text[];
BEGIN
  IF NEW.content_json IS NULL THEN RETURN NEW; END IF;
  NEW.content_json := public.fill_author_placeholders_jsonb(NEW.content_json, NEW.author_id);
  hits := public.detect_microsite_violations(NEW.content_json);
  NEW.content_json := public.scrub_microsite_jsonb(NEW.content_json);
  IF array_length(hits, 1) IS NOT NULL THEN
    BEGIN
      FOREACH rule IN ARRAY hits LOOP
        INSERT INTO public.content_quality_log(author_id, node_id, rule, sample, field_path, source)
        VALUES (NEW.author_id, NEW.node_id, rule, NULL, NULL, 'db_trigger');
      END LOOP;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Social posts: same cleaning on every save.
CREATE OR REPLACE FUNCTION public.social_posts_scrub_content()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.content IS NOT NULL THEN
    NEW.content := public.fill_author_placeholders(NEW.content, NEW.author_id);
    NEW.content := regexp_replace(NEW.content, '(\d)\s*[—–]\s*(\d)', '\1 - \2', 'g');
    NEW.content := regexp_replace(NEW.content, '[ \t]*[—–][ \t]*', ', ', 'g');
    NEW.content := regexp_replace(NEW.content, ',\s*,', ',', 'g');
  END IF;
  IF NEW.carousel_slides IS NOT NULL THEN
    NEW.carousel_slides := public.scrub_microsite_jsonb(public.fill_author_placeholders_jsonb(NEW.carousel_slides, NEW.author_id));
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_social_posts_scrub_content ON public.social_posts;
CREATE TRIGGER trg_social_posts_scrub_content BEFORE INSERT OR UPDATE OF content, carousel_slides ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.social_posts_scrub_content();

-- 6. Generated documents (business plans, drafts): strip dashes on save.
CREATE OR REPLACE FUNCTION public.generated_assets_scrub_content()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.asset_type <> 'source_material' THEN
    IF NEW.content IS NOT NULL THEN
      NEW.content := regexp_replace(NEW.content, '(\d)\s*[—–]\s*(\d)', '\1 - \2', 'g');
      NEW.content := regexp_replace(NEW.content, '[ \t]*[—–][ \t]*', ', ', 'g');
    END IF;
    IF NEW.title IS NOT NULL THEN NEW.title := regexp_replace(NEW.title, '[ \t]*[—–][ \t]*', ', ', 'g'); END IF;
    IF NEW.description IS NOT NULL THEN NEW.description := regexp_replace(NEW.description, '[ \t]*[—–][ \t]*', ', ', 'g'); END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_generated_assets_scrub_content ON public.generated_assets;
CREATE TRIGGER trg_generated_assets_scrub_content BEFORE INSERT OR UPDATE OF content, title, description ON public.generated_assets
FOR EACH ROW EXECUTE FUNCTION public.generated_assets_scrub_content();

REVOKE EXECUTE ON FUNCTION public.fill_author_placeholders(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fill_author_placeholders_jsonb(jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.social_posts_scrub_content() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generated_assets_scrub_content() FROM PUBLIC, anon, authenticated;