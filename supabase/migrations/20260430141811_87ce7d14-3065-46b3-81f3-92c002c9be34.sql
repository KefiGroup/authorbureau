-- Sprint 45: Remove all GoHighLevel (GHL) database surface area.

-- 1. Collapse the dead status string onto 'live' (zero rows today, future-proof).
UPDATE public.author_nodes
   SET status = 'live'
 WHERE status = 'published_pending_ghl';

-- 2. Drop the orphan column on author_nodes.
ALTER TABLE public.author_nodes
  DROP COLUMN IF EXISTS ghl_resource_id;

-- 3. Drop the orphan columns on author_profiles.
ALTER TABLE public.author_profiles
  DROP COLUMN IF EXISTS ghl_api_key,
  DROP COLUMN IF EXISTS ghl_provision_status,
  DROP COLUMN IF EXISTS ghl_provisioned_at,
  DROP COLUMN IF EXISTS ghl_provisioning_attempts,
  DROP COLUMN IF EXISTS ghl_provisioning_failed,
  DROP COLUMN IF EXISTS ghl_sub_account_id,
  DROP COLUMN IF EXISTS ghl_sub_account_name,
  DROP COLUMN IF EXISTS ghl_campaign_ids,
  DROP COLUMN IF EXISTS ghl_form_ids,
  DROP COLUMN IF EXISTS ghl_pipeline_ids,
  DROP COLUMN IF EXISTS ghl_workflow_ids;

-- 4. Drop the empty deployments table.
DROP TABLE IF EXISTS public.ghl_deployments;