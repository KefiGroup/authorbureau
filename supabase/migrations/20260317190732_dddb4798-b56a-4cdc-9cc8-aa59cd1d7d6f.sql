
-- Table to store which nodes are gated (Coming Soon) vs open
CREATE TABLE public.node_gating (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text NOT NULL UNIQUE,
  category text NOT NULL,
  is_open boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.node_gating ENABLE ROW LEVEL SECURITY;

-- Anyone can read gating state (needed for dashboard rendering)
CREATE POLICY "Anyone can read node gating"
ON public.node_gating FOR SELECT
USING (true);

-- Only admins can modify gating
CREATE POLICY "Admins can manage node gating"
ON public.node_gating FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed all 28 nodes with current gating state
-- Build Authority nodes (currently open)
INSERT INTO public.node_gating (node_id, category, is_open) VALUES
  ('workbooks', 'revenue-streams', true),
  ('home-study', 'revenue-streams', true),
  ('book-sales-events', 'revenue-streams', true),
  ('special-editions', 'revenue-streams', true),
  ('social-media', 'revenue-streams', true),
  ('email-marketing', 'revenue-streams', true),
  ('microsite', 'revenue-streams', true),
  ('courses', 'revenue-streams', true),
  -- Bridge Channels (currently closed)
  ('audiobook', 'marketing-channels', false),
  ('podcast-guest', 'marketing-channels', false),
  ('webinars', 'marketing-channels', false),
  ('lead-magnet', 'marketing-channels', false),
  ('in-house-speaker', 'marketing-channels', false),
  ('affiliates', 'marketing-channels', false),
  ('upsells', 'marketing-channels', false),
  ('revenue-sharing', 'marketing-channels', false),
  -- Yield Revenue (currently closed)
  ('coaching-1on1', 'authority-builders', false),
  ('group-coaching', 'authority-builders', false),
  ('memberships', 'authority-builders', false),
  ('big-ticket', 'authority-builders', false),
  ('keynotes', 'authority-builders', false),
  ('training', 'authority-builders', false),
  ('masterminds', 'authority-builders', false),
  ('retreats', 'authority-builders', false),
  ('certification', 'authority-builders', false),
  ('conventions', 'authority-builders', false),
  ('fundraising', 'authority-builders', false),
  ('exhibitors', 'authority-builders', false);
