-- Move Stripe payout identifiers out of the publicly readable author_profiles table.
create table if not exists public.author_payout_accounts (
  author_id uuid primary key references public.author_profiles(id) on delete cascade,
  user_id uuid not null,
  stripe_account_id text,
  stripe_customer_id text,
  stripe_connected_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.author_payout_accounts to authenticated;
grant all on public.author_payout_accounts to service_role;

alter table public.author_payout_accounts enable row level security;

create policy "Authors manage their own payout account"
on public.author_payout_accounts for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can view payout accounts"
on public.author_payout_accounts for select to authenticated
using (has_role(auth.uid(), 'admin'::app_role));

insert into public.author_payout_accounts (author_id, user_id, stripe_account_id, stripe_customer_id, stripe_connected_account_id)
select id, user_id, stripe_account_id, stripe_customer_id, stripe_connected_account_id
from public.author_profiles
where stripe_account_id is not null
   or stripe_customer_id is not null
   or stripe_connected_account_id is not null
on conflict (author_id) do nothing;