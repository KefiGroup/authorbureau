-- Scheduler columns on enrollments
ALTER TABLE public.email_flow_enrollments
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_id text;

-- Index so the scheduler can find due enrollments fast
CREATE INDEX IF NOT EXISTS idx_enrollments_due
  ON public.email_flow_enrollments (status, next_send_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_enrollments_subscriber
  ON public.email_flow_enrollments (subscriber_id, status);

-- Allow new enrollment statuses
ALTER TABLE public.email_flow_enrollments
  DROP CONSTRAINT IF EXISTS email_flow_enrollments_status_check;

-- Replace global unique on (author_id, flow_type) with finer-grained partial uniques
ALTER TABLE public.email_flows
  DROP CONSTRAINT IF EXISTS email_flows_author_id_flow_type_key;

-- One master_nurture per author
CREATE UNIQUE INDEX IF NOT EXISTS uniq_master_nurture_per_author
  ON public.email_flows (author_id)
  WHERE flow_type = 'master_nurture';

-- One flow per (author, node_id) for node-bound flows
CREATE UNIQUE INDEX IF NOT EXISTS uniq_node_flow_per_author
  ON public.email_flows (author_id, node_id)
  WHERE node_id IS NOT NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_flows_author_status
  ON public.email_flows (author_id, status);