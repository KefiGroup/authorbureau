-- Audit log for cross-platform email sync (PublishNow → Authors Bureau)
CREATE TABLE IF NOT EXISTS public.email_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  old_email text,
  new_email text NOT NULL,
  source text NOT NULL DEFAULT 'publishnow',
  auth_updated boolean DEFAULT false,
  books_updated_count integer DEFAULT 0,
  settings_updated boolean DEFAULT false,
  error_message text,
  synced_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_sync_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the sync log
CREATE POLICY "Admins can view email sync log"
ON public.email_sync_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_email_sync_log_user_id ON public.email_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sync_log_synced_at ON public.email_sync_log(synced_at DESC);