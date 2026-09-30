CREATE OR REPLACE FUNCTION public.replace_forbidden_words_jsonb(v jsonb)
 RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
DECLARE k text; child jsonb; t text; arr jsonb := '[]'::jsonb; obj jsonb := '{}'::jsonb; i int;
BEGIN
  IF v IS NULL OR v::text !~* '(next-steps?|next\s+steps|try this|exercise)' THEN RETURN v; END IF;
  IF jsonb_typeof(v) = 'string' THEN
    t := v #>> '{}';
    IF t ~* '^(https?://|mailto:|/)' THEN RETURN v; END IF;
    t := regexp_replace(t, '\mNext-steps?\M', 'Next step', 'g');
    t := regexp_replace(t, '\mnext-steps?\M', 'next step', 'gi');
    t := regexp_replace(t, '\mNext\s+steps\M', 'Next step', 'g');
    t := regexp_replace(t, '\mnext\s+steps\M', 'next step', 'gi');
    t := regexp_replace(t, '\mTry this\M', 'Apply this', 'g');
    t := regexp_replace(t, '\mtry this\M', 'apply this', 'gi');
    t := regexp_replace(t, '\mExercises?\M', 'Practice', 'g');
    t := regexp_replace(t, '\mexercises?\M', 'practice', 'gi');
    RETURN to_jsonb(t);
  END IF;
  IF jsonb_typeof(v) = 'array' THEN
    FOR i IN 0 .. jsonb_array_length(v) - 1 LOOP
      arr := arr || jsonb_build_array(public.replace_forbidden_words_jsonb(v->i));
    END LOOP;
    RETURN arr;
  END IF;
  IF jsonb_typeof(v) = 'object' THEN
    FOR k, child IN SELECT * FROM jsonb_each(v) LOOP
      obj := obj || jsonb_build_object(k, public.replace_forbidden_words_jsonb(child));
    END LOOP;
    RETURN obj;
  END IF;
  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.author_nodes_scrub_content()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE rule text; hits text[];
BEGIN
  IF NEW.content_json IS NULL THEN RETURN NEW; END IF;
  NEW.content_json := public.fill_author_placeholders_jsonb(NEW.content_json, NEW.author_id);
  hits := public.detect_microsite_violations(NEW.content_json);
  NEW.content_json := public.scrub_microsite_jsonb(NEW.content_json);
  -- BP-01/BP-02 (lead magnets / welcome) keep assessment vocabulary.
  IF NEW.node_id !~* '^BP-0(1|2)' THEN
    NEW.content_json := public.replace_forbidden_words_jsonb(NEW.content_json);
  END IF;
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