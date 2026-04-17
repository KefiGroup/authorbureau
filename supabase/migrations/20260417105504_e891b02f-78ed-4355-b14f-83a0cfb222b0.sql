-- 1. Delete the empty duplicate profile (no books, no nodes, no context)
DELETE FROM public.author_profiles
WHERE id = 'e42e62aa-8d08-4ba4-a965-9937dd11e957';

-- 2. Repoint the populated profile to her active shared-backend UID
UPDATE public.author_profiles
SET user_id = 'ef23c521-9cce-4d86-9128-dc687748b65b',
    updated_at = now()
WHERE id = '92326a2f-3ed0-4873-a8cf-7a0b1350995a';