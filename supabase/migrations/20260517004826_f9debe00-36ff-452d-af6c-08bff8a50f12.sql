-- 1. citext for case-insensitive email
CREATE EXTENSION IF NOT EXISTS citext;

-- 2. claim_email column for unclaimed profiles
ALTER TABLE public.author_profiles
  ADD COLUMN IF NOT EXISTS claim_email citext;

-- 3. Prevent duplicate unclaimed profiles per email
CREATE UNIQUE INDEX IF NOT EXISTS idx_author_profiles_unclaimed_email
  ON public.author_profiles (lower(claim_email::text))
  WHERE user_id IS NULL AND claim_email IS NOT NULL;

-- 4. Ghost-warning trigger: treat NULL user_id as legitimately unclaimed
CREATE OR REPLACE FUNCTION public.warn_ghost_author_uid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Unclaimed profiles are valid; only warn when user_id is set but ghost
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
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Claim trigger: also attach by claim_email when no explicit claim ID
CREATE OR REPLACE FUNCTION public.handle_claim_author_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim_id uuid;
  v_new_email citext;
BEGIN
  BEGIN
    v_claim_id := NULLIF(NEW.raw_user_meta_data->>'claim_author_profile_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_claim_id := NULL;
  END;

  -- Path A: explicit claim ID from invite metadata
  IF v_claim_id IS NOT NULL THEN
    UPDATE public.author_profiles ap
       SET user_id = NEW.id,
           claim_email = NULL,
           updated_at = now()
     WHERE ap.id = v_claim_id
       AND (
         ap.user_id IS NULL
         OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ap.user_id)
       );
  END IF;

  -- Path B: auto-attach by matching claim_email on signup
  v_new_email := NULLIF(lower(NEW.email), '')::citext;
  IF v_new_email IS NOT NULL THEN
    UPDATE public.author_profiles ap
       SET user_id = NEW.id,
           claim_email = NULL,
           updated_at = now()
     WHERE ap.user_id IS NULL
       AND lower(ap.claim_email::text) = lower(v_new_email::text);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;