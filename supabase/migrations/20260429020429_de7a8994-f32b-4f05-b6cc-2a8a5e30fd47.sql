-- Flip courses.status to 'live' when the matching BA-10 author_node is live.
-- courses.author_id references auth.users, so join via author_profiles.user_id.
UPDATE public.courses c
   SET status = 'live'
  FROM public.author_nodes n
  JOIN public.author_profiles ap ON ap.id = n.author_id
 WHERE n.node_id = 'BA-10'
   AND n.status  = 'live'
   AND c.author_id = ap.user_id
   AND (n.book_id = c.book_id OR (n.book_id IS NULL AND c.book_id IS NULL))
   AND c.status <> 'live';

-- Flip membership_content.status to 'live' when BA-12 node is live.
UPDATE public.membership_content m
   SET status = 'live'
  FROM public.author_nodes n
 WHERE n.node_id = 'BA-12'
   AND n.status  = 'live'
   AND n.author_id = m.author_id
   AND m.status <> 'live';