
-- Add quiz columns to crm_contacts
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS quiz_stage text,
  ADD COLUMN IF NOT EXISTS quiz_score integer,
  ADD COLUMN IF NOT EXISTS quiz_completed_at timestamptz;

-- Add quiz columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS quiz_stage text,
  ADD COLUMN IF NOT EXISTS quiz_score integer,
  ADD COLUMN IF NOT EXISTS quiz_completed_at timestamptz;

-- Create quiz_responses table
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  answer_selected text,
  answer_text text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- No public access policies — service role inserts only via edge functions
