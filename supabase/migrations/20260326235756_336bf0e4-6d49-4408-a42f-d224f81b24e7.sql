
-- Sprint 13A: Add microsite columns to author_nodes
ALTER TABLE public.author_nodes ADD COLUMN IF NOT EXISTS microsite_url text;
ALTER TABLE public.author_nodes ADD COLUMN IF NOT EXISTS third_party_url text;
ALTER TABLE public.author_nodes ADD COLUMN IF NOT EXISTS payment_link text;
