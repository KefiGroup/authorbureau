-- Author timezone for daily-report scheduling
ALTER TABLE public.author_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Per-author scoping for email open-rate analytics
ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS author_id UUID;
CREATE INDEX IF NOT EXISTS email_send_log_author_id_idx
  ON public.email_send_log(author_id);
CREATE INDEX IF NOT EXISTS email_send_log_author_template_created_idx
  ON public.email_send_log(author_id, template_name, created_at DESC);