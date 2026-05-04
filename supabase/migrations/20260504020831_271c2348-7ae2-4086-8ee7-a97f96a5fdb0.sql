CREATE OR REPLACE FUNCTION public.detect_microsite_violations(v jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  flat text;
  hits text[] := ARRAY[]::text[];
BEGIN
  IF v IS NULL THEN RETURN hits; END IF;
  flat := v::text;
  IF flat ~ '[—–]' THEN hits := array_append(hits, 'emdash'); END IF;
  IF flat ~* '(\[insert|\{\{|<<|Lorem ipsum)' THEN hits := array_append(hits, 'placeholder'); END IF;
  RETURN hits;
END;
$function$;