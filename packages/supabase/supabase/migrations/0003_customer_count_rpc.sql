-- 0003_customer_count_rpc.sql
--
-- Public RPC that returns the number of lifetime-access customers.
-- Used by the landing page Stats section to show real numbers.
--
-- SECURITY DEFINER so it bypasses RLS — safe because it only
-- exposes an aggregate count, never individual rows.

create or replace function public.get_customer_count()
returns bigint
language sql
security definer
stable
as $$
  select count(*) from public.lifetime_entitlements;
$$;

-- Allow anon and authenticated roles to call this function.
grant execute on function public.get_customer_count() to anon, authenticated;
