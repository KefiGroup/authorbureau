
-- Author email settings (per-author sender config & subdomain)
CREATE TABLE public.author_email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL UNIQUE,
  sender_name text NOT NULL DEFAULT '',
  reply_to_email text,
  subdomain text UNIQUE,
  domain_verified boolean NOT NULL DEFAULT false,
  resend_domain_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.author_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own email settings"
  ON public.author_email_settings FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all email settings"
  ON public.author_email_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_author_email_settings_updated_at
  BEFORE UPDATE ON public.author_email_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email templates (reusable per author)
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own templates"
  ON public.email_templates FOR ALL
  USING (auth.uid() = author_id);

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Author subscribers (unified list per author, consolidating newsletter_signups)
CREATE TABLE public.author_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  email text NOT NULL,
  name text,
  source text NOT NULL DEFAULT 'manual',
  source_detail text,
  status text NOT NULL DEFAULT 'active',
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(author_id, email)
);

ALTER TABLE public.author_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own subscribers"
  ON public.author_subscribers FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all subscribers"
  ON public.author_subscribers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Email campaigns (each newsletter an author composes)
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT '',
  preview_text text,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_html text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own campaigns"
  ON public.email_campaigns FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all campaigns"
  ON public.email_campaigns FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email send logs (per-recipient tracking)
CREATE TABLE public.email_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  subscriber_id uuid REFERENCES public.author_subscribers(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  resend_message_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view their own send logs"
  ON public.email_send_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.email_campaigns c
    WHERE c.id = email_send_logs.campaign_id AND c.author_id = auth.uid()
  ));

CREATE POLICY "Admins can view all send logs"
  ON public.email_send_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_author_subscribers_author_id ON public.author_subscribers(author_id);
CREATE INDEX idx_author_subscribers_status ON public.author_subscribers(status);
CREATE INDEX idx_email_campaigns_author_id ON public.email_campaigns(author_id);
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_email_send_logs_campaign_id ON public.email_send_logs(campaign_id);
