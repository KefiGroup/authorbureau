-- Add GHL columns to author_profiles
ALTER TABLE author_profiles ADD COLUMN IF NOT EXISTS ghl_sub_account_id TEXT;
ALTER TABLE author_profiles ADD COLUMN IF NOT EXISTS ghl_sub_account_name TEXT;
ALTER TABLE author_profiles ADD COLUMN IF NOT EXISTS ghl_provisioned_at TIMESTAMPTZ;
ALTER TABLE author_profiles ADD COLUMN IF NOT EXISTS ghl_provision_status TEXT DEFAULT 'pending';

-- Create ghl_deployments table
CREATE TABLE IF NOT EXISTS ghl_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES author_profiles(id) ON DELETE CASCADE NOT NULL,
  node_id TEXT NOT NULL,
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  ghl_campaign_ids JSONB DEFAULT '[]',
  ghl_workflow_ids JSONB DEFAULT '[]',
  ghl_form_ids JSONB DEFAULT '[]',
  ghl_pipeline_ids JSONB DEFAULT '[]',
  deployment_status TEXT DEFAULT 'pending',
  error_message TEXT,
  content_snapshot JSONB,
  UNIQUE(author_id, node_id)
);

-- Enable RLS
ALTER TABLE ghl_deployments ENABLE ROW LEVEL SECURITY;

-- RLS: authors can read their own deployments
CREATE POLICY "Authors can view own deployments"
  ON ghl_deployments FOR SELECT
  TO authenticated
  USING (author_id IN (
    SELECT id FROM author_profiles WHERE user_id = auth.uid()
  ));

-- RLS: service role can manage deployments
CREATE POLICY "Service role can manage deployments"
  ON ghl_deployments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);