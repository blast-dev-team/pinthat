/**
 * Entitlement helpers — lifetime access plan.
 *
 * Source of truth: `public.lifetime_entitlements` in Supabase, keyed by
 * (lowercased) email. Rows are written by the lambda-stripe-webhook
 * function when Stripe fires `checkout.session.completed`. The table's
 * RLS policy scopes reads to `auth.email() = email`, so we just ask
 * "is there a row?" — if yes, the user has paid.
 */
import { supabase } from './supabase';

// Stripe Payment Link for the lifetime access plan. The Payment Link
// must be configured to COLLECT customer email — the webhook uses
// `customer_details.email` as the join key back to the Supabase user.
// Set VITE_STRIPE_PAYMENT_LINK in the extension's .env. Use the
// `buy.stripe.com/test_...` URL for dev and the `buy.stripe.com/...`
// URL for prod builds.
const STRIPE_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK as
  | string
  | undefined;

export type Entitlement =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'paid' }
  | { status: 'unpaid' }
  | { status: 'error'; error: string };

/**
 * Read the current user's entitlement from Supabase. Returns `paid`
 * if a matching `lifetime_entitlements` row exists, `unpaid` if not.
 */
export async function fetchEntitlement(): Promise<Entitlement> {
  if (!supabase) return { status: 'error', error: 'supabase_not_configured' };

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { status: 'unauthenticated' };

  // RLS already scopes this to the caller's auth.email(), so we just
  // ask for the row without filtering client-side. `maybeSingle` returns
  // null (not an error) if there's no match.
  const { data, error } = await supabase
    .from('lifetime_entitlements')
    .select('email')
    .maybeSingle();

  if (error) {
    return { status: 'error', error: error.message };
  }
  return data ? { status: 'paid' } : { status: 'unpaid' };
}

/**
 * Open the Stripe Payment Link in a new tab. Entitlement is matched by
 * the email the user enters on the Stripe checkout page, so we prefill
 * it with the signed-in Supabase email to keep the two in sync.
 * Requires a logged-in Supabase session.
 */
export async function startCheckout(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!supabase) return { ok: false, error: 'supabase_not_configured' };
  if (!STRIPE_PAYMENT_LINK) {
    return { ok: false, error: 'stripe_payment_link_missing' };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { ok: false, error: 'not_signed_in' };

  try {
    const url = new URL(STRIPE_PAYMENT_LINK);
    if (user.email) url.searchParams.set('prefilled_email', user.email);
    await chrome.tabs.create({ url: url.toString() });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
