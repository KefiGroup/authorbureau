-- Relink Pauline's book to her correct Cloud auth UID (the previous filter used the wrong email)
UPDATE public.books
SET author_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33'
WHERE id = 'e5b857ac-48ce-4ffc-a761-3c09e95a318e'
  AND author_id = 'ef23c521-9cce-4d86-9128-dc687748b65b';

-- Remove the empty orphan author_profile created during a stray sign-in (no pen_name, no slug)
DELETE FROM public.author_profiles
WHERE id = 'e2513590-a067-4da5-9364-94b5a4ac3885'
  AND pen_name IS NULL
  AND author_slug IS NULL;