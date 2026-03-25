
-- Function to generate a random AB-XXXXXX account ID
CREATE OR REPLACE FUNCTION public.generate_account_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'AB-';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Add account_id column with unique constraint and auto-generation
ALTER TABLE public.author_profiles
  ADD COLUMN IF NOT EXISTS account_id text UNIQUE DEFAULT public.generate_account_id();

-- Backfill existing rows that have NULL account_id
UPDATE public.author_profiles
  SET account_id = public.generate_account_id()
  WHERE account_id IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.author_profiles
  ALTER COLUMN account_id SET NOT NULL;
