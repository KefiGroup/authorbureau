UPDATE public.author_nodes
SET status = 'live'
WHERE book_id IN ('3c65a5f1-96da-4538-80c3-7bb23fb622fb','e5b857ac-48ce-4ffc-a761-3c09e95a318e')
  AND status = 'content_ready';