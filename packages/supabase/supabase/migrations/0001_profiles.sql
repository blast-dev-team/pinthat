-- 0001_profiles.sql
-- Lifetime-access entitlement table.
--
-- One row per auth.users row. Only the service role (used by the
-- Cloudflare Worker) may write `has_lifetime_access`. Clients (the
-- extension) read their own row via RLS to decide whether to gate
-- the tool.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  has_lifetime_access boolean not null default false,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  purchased_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Authenticated users can read their own profile row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select
  using (auth.uid() = id);

-- No insert/update/delete policies for anon or authenticated roles.
-- The service role bypasses RLS, so the worker can still write.

-- Auto-create a profile row whenever a new auth.users row is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create profile rows for any existing users.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
