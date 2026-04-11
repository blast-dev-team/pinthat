-- 0002_lifetime_entitlements.sql
--
-- Email-keyed lifetime-access entitlement table.
--
-- Source of truth is now Stripe. The flow:
--   1. User pays on a Stripe Payment Link (email collection required).
--   2. Stripe fires checkout.session.completed to the lambda-stripe-webhook
--      function, which verifies the signature and UPSERTs a row here
--      keyed by customer_details.email.
--   3. Extension reads its own row via RLS using auth.email() to decide
--      whether to unlock the tool.
--
-- We match on email (not auth.users.id) so that purchases made before
-- signup still grant access once the user signs up with the same email.
-- Emails are normalized to lowercase on insert/update to avoid
-- case-sensitivity surprises.
--
-- Also drops the old public.profiles table + auto-create trigger, which
-- were the previous (webhook → profiles.has_lifetime_access) source of
-- truth and are no longer used.

-- ── New table ────────────────────────────────────────────────────

create table if not exists public.lifetime_entitlements (
  email text primary key,
  stripe_checkout_session_id text not null,
  stripe_customer_id text,
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Normalize emails to lowercase so auth.email() comparisons in RLS
-- always match regardless of what Stripe sent.
create or replace function public.lifetime_entitlements_normalize_email()
returns trigger
language plpgsql
as $$
begin
  new.email = lower(new.email);
  return new;
end;
$$;

drop trigger if exists lifetime_entitlements_normalize_email_trg
  on public.lifetime_entitlements;
create trigger lifetime_entitlements_normalize_email_trg
  before insert or update on public.lifetime_entitlements
  for each row execute function public.lifetime_entitlements_normalize_email();

alter table public.lifetime_entitlements enable row level security;

-- Authenticated users can read the entitlement row matching their own
-- auth email. auth.email() pulls the email claim from the caller's JWT.
drop policy if exists "entitlements_select_own" on public.lifetime_entitlements;
create policy "entitlements_select_own" on public.lifetime_entitlements
  for select
  using (lower(email) = lower(auth.email()));

-- No insert/update/delete policies. The webhook Lambda uses the service
-- role key (bypasses RLS) to write rows.

-- ── Drop old profiles table ──────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles;
