
-- Email Automation Flows: AI-generated nurture sequences tied to author's books
CREATE TABLE public.email_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  flow_type text NOT NULL, -- 'reading_club_welcome', 'newsletter_nurture', 'service_inquiry_followup', 'challenge_milestone', 'post_challenge_upsell', 'reengagement'
  title text NOT NULL,
  description text,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL, -- source book for AI content
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused'
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (author_id, flow_type)
);

-- Individual steps within a flow
CREATE TABLE public.email_flow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.email_flows(id) ON DELETE CASCADE,
  step_number integer NOT NULL DEFAULT 1,
  trigger_delay_days integer NOT NULL DEFAULT 0, -- days after enrollment to send
  subject text NOT NULL DEFAULT '',
  preview_text text,
  body_markdown text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active', -- 'active', 'disabled'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flow_id, step_number)
);

-- Track which subscribers are enrolled in which flows
CREATE TABLE public.email_flow_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.email_flows(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.author_subscribers(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'active', -- 'active', 'completed', 'unsubscribed'
  UNIQUE (flow_id, subscriber_id)
);

-- Enable RLS
ALTER TABLE public.email_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_flow_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS: Authors manage their own flows
CREATE POLICY "Authors can manage their own flows"
  ON public.email_flows FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all flows"
  ON public.email_flows FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Steps inherit access from flow
CREATE POLICY "Authors can manage steps of their flows"
  ON public.email_flow_steps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.email_flows f
    WHERE f.id = email_flow_steps.flow_id AND f.author_id = auth.uid()
  ));

CREATE POLICY "Admins can view all steps"
  ON public.email_flow_steps FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Enrollments inherit access from flow
CREATE POLICY "Authors can manage enrollments of their flows"
  ON public.email_flow_enrollments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.email_flows f
    WHERE f.id = email_flow_enrollments.flow_id AND f.author_id = auth.uid()
  ));

CREATE POLICY "Admins can view all enrollments"
  ON public.email_flow_enrollments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_email_flows_updated_at
  BEFORE UPDATE ON public.email_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_flow_steps_updated_at
  BEFORE UPDATE ON public.email_flow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
