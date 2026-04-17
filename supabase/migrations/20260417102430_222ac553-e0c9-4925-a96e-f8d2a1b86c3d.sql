UPDATE public.author_profiles
SET user_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33'
WHERE id = '92326a2f-3ed0-4873-a8cf-7a0b1350995a'
  AND user_id = 'ef23c521-9cce-4d86-9128-dc687748b65b';

UPDATE public.books
SET author_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33'
WHERE author_id = 'ef23c521-9cce-4d86-9128-dc687748b65b'
  AND owner_email = 'paulinet77@gmail.com';

UPDATE public.notifications
SET user_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33'
WHERE user_id = 'ef23c521-9cce-4d86-9128-dc687748b65b';

UPDATE public.consultation_sessions
SET user_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33'
WHERE user_id = 'ef23c521-9cce-4d86-9128-dc687748b65b';