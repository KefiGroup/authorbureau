ALTER TABLE public.crm_contacts 
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new_lead',
  ADD COLUMN IF NOT EXISTS abby_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();