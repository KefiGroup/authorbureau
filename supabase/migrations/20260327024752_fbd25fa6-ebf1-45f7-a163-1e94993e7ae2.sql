ALTER TABLE public.author_nodes ADD COLUMN IF NOT EXISTS current_step integer DEFAULT 1;
ALTER TABLE public.author_profiles ADD COLUMN IF NOT EXISTS ghl_provisioning_failed boolean DEFAULT false;
ALTER TABLE public.author_profiles ADD COLUMN IF NOT EXISTS ghl_provisioning_attempts integer DEFAULT 0;