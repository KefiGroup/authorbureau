
-- 1. Create the slug-generation function
CREATE OR REPLACE FUNCTION public.generate_unique_author_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  counter int := 1;
BEGIN
  -- Skip if slug is already set
  IF NEW.author_slug IS NOT NULL AND NEW.author_slug != '' THEN
    RETURN NEW;
  END IF;

  -- Skip if no pen_name
  IF NEW.pen_name IS NULL OR trim(NEW.pen_name) = '' THEN
    RETURN NEW;
  END IF;

  -- Generate base slug from pen_name
  base_slug := regexp_replace(lower(trim(NEW.pen_name)), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  -- Find unique candidate
  candidate := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM author_profiles
    WHERE author_slug = candidate AND user_id IS DISTINCT FROM NEW.user_id
  ) LOOP
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;

  NEW.author_slug := candidate;
  RETURN NEW;
END;
$$;

-- 2. Attach trigger
CREATE TRIGGER trg_generate_author_slug
BEFORE INSERT OR UPDATE ON public.author_profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_unique_author_slug();

-- 3. Backfill existing profiles
DO $$
DECLARE
  r record;
  base_slug text;
  candidate text;
  counter int;
BEGIN
  FOR r IN
    SELECT id, user_id, pen_name
    FROM author_profiles
    WHERE (author_slug IS NULL OR author_slug = '')
      AND pen_name IS NOT NULL AND trim(pen_name) != ''
  LOOP
    base_slug := regexp_replace(lower(trim(r.pen_name)), '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    candidate := base_slug;
    counter := 1;

    WHILE EXISTS (
      SELECT 1 FROM author_profiles
      WHERE author_slug = candidate AND user_id != r.user_id
    ) LOOP
      counter := counter + 1;
      candidate := base_slug || '-' || counter;
    END LOOP;

    UPDATE author_profiles SET author_slug = candidate WHERE id = r.id;
  END LOOP;
END;
$$;
