
-- Step 3: Non-blocking validation guard for author_profiles.user_id

CREATE TABLE IF NOT EXISTS public.auth_uid_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_profile_id uuid,
  user_id uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_uid_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view auth uid warnings" ON public.auth_uid_warnings;
CREATE POLICY "Admins can view auth uid warnings"
  ON public.auth_uid_warnings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.warn_ghost_author_uid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.user_id) INTO v_exists;

  IF NOT v_exists THEN
    BEGIN
      INSERT INTO public.auth_uid_warnings (author_profile_id, user_id, note)
      VALUES (NEW.id, NEW.user_id,
        'author_profiles.user_id does not exist in auth.users (ghost UID)');
    EXCEPTION WHEN OTHERS THEN
      -- Never block the write
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS warn_ghost_author_uid_trigger ON public.author_profiles;
CREATE TRIGGER warn_ghost_author_uid_trigger
  BEFORE INSERT OR UPDATE OF user_id ON public.author_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.warn_ghost_author_uid();

CREATE OR REPLACE VIEW public.v_author_profiles_orphans AS
SELECT ap.id, ap.user_id, ap.pen_name, ap.author_slug, ap.created_at
FROM public.author_profiles ap
LEFT JOIN auth.users u ON u.id = ap.user_id
WHERE u.id IS NULL;
