
create table if not exists public.author_revenue_snapshots (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.author_profiles(id) on delete cascade,
  snapshot_date date not null,
  total_contacts integer default 0,
  email_subscribers integer default 0,
  pipeline_value_usd numeric(12,2) default 0,
  stripe_revenue_mtd_usd numeric(12,2) default 0,
  stripe_revenue_ytd_usd numeric(12,2) default 0,
  nodes_live integer default 0,
  created_at timestamptz default now(),
  unique(author_id, snapshot_date)
);

alter table public.author_revenue_snapshots enable row level security;

create policy "Authors can read own snapshots" on public.author_revenue_snapshots
  for select using (
    author_id = (select id from public.author_profiles where user_id = auth.uid())
  );

create policy "Service role can insert snapshots" on public.author_revenue_snapshots
  for insert with check (true);

-- Add optional columns to author_profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='author_profiles' AND column_name='stripe_customer_id') THEN
    ALTER TABLE public.author_profiles ADD COLUMN stripe_customer_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='author_profiles' AND column_name='stripe_connected_account_id') THEN
    ALTER TABLE public.author_profiles ADD COLUMN stripe_connected_account_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='author_profiles' AND column_name='ghl_api_key') THEN
    ALTER TABLE public.author_profiles ADD COLUMN ghl_api_key text;
  END IF;
END $$;
