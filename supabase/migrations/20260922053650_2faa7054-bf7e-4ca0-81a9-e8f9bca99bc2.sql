alter table public.author_profiles
  drop column if exists stripe_account_id,
  drop column if exists stripe_customer_id,
  drop column if exists stripe_connected_account_id,
  drop column if exists business_plan_json;

create or replace view public.author_profiles_admin as
select p.*,
       a.stripe_account_id,
       a.stripe_customer_id,
       a.stripe_connected_account_id
from public.author_profiles p
left join public.author_payout_accounts a on a.author_id = p.id;

revoke all on public.author_profiles_admin from anon, authenticated;
grant select on public.author_profiles_admin to service_role;