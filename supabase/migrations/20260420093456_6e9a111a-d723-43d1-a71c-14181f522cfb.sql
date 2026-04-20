UPDATE public.books b
SET owner_email = u.email
FROM auth.users u
WHERE b.owner_email IS NULL AND b.author_id = u.id;