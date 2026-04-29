-- Audit #1: Demote stale BP-04 'live' rows that contain only autofilled stubs
-- (i.e. content_json has 1 key or fewer, no real microsite content).
UPDATE public.author_nodes
SET status = 'content_ready'
WHERE node_id = 'BP-04'
  AND status = 'live'
  AND id IN (
    '82b18901-3420-4e51-a814-6feb9343f795',
    'cf24c427-2a22-4d4d-aeb7-b7b26ef91e87',
    '13030fe9-13a8-412a-9ed5-b74607b8f4a3'
  );