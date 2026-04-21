-- 1) Restore the missing auth user for pl@paulineteo.com using the ORIGINAL UUID
-- so all downstream FKs (author_profiles, books, stripe_customers, subscriptions,
-- author_nodes, courses) remain valid with zero re-pointing.
-- Password is set to a random unusable value; Pauline must use "Forgot password" to set a new one.
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'ef23c521-9cce-4d86-9128-dc687748b65b',
  'authenticated',
  'authenticated',
  'pl@paulineteo.com',
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Ensure an identities row exists so the email login provider works after password reset.
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'ef23c521-9cce-4d86-9128-dc687748b65b',
  jsonb_build_object('sub', 'ef23c521-9cce-4d86-9128-dc687748b65b', 'email', 'pl@paulineteo.com', 'email_verified', true),
  'email',
  'ef23c521-9cce-4d86-9128-dc687748b65b',
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities
  WHERE user_id = 'ef23c521-9cce-4d86-9128-dc687748b65b' AND provider = 'email'
);

-- 2) Attach the ghost-UID warning trigger to author_profiles (function already exists)
DROP TRIGGER IF EXISTS trg_warn_ghost_author_uid ON public.author_profiles;
CREATE TRIGGER trg_warn_ghost_author_uid
AFTER INSERT OR UPDATE OF user_id ON public.author_profiles
FOR EACH ROW
EXECUTE FUNCTION public.warn_ghost_author_uid();