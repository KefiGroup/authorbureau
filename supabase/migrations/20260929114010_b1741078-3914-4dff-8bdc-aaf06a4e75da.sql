ALTER TABLE public.email_flows DROP CONSTRAINT IF EXISTS uniq_node_flow_per_author;
DROP INDEX IF EXISTS public.uniq_node_flow_per_author;