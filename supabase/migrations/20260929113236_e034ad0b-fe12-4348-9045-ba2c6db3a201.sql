ALTER TABLE public.author_email_settings
  ADD COLUMN IF NOT EXISTS welcome_flow_mode text NOT NULL DEFAULT 'master';

ALTER TABLE public.author_email_settings
  DROP CONSTRAINT IF EXISTS author_email_settings_welcome_flow_mode_check;

ALTER TABLE public.author_email_settings
  ADD CONSTRAINT author_email_settings_welcome_flow_mode_check
  CHECK (welcome_flow_mode IN ('master', 'book_specific'));

CREATE UNIQUE INDEX IF NOT EXISTS email_flows_bp01_master_uniq
  ON public.email_flows (author_id, node_id)
  WHERE node_id = 'BP-01' AND book_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS email_flows_bp01_book_uniq
  ON public.email_flows (author_id, node_id, book_id)
  WHERE node_id = 'BP-01' AND book_id IS NOT NULL;