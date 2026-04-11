// lambda-stripe-webhook — AWS Lambda Function URL handler (Node.js 20)
//
// Receives Stripe `checkout.session.completed` events and records a
// lifetime-access entitlement in Supabase keyed by the customer's
// email. No database reads — the webhook is write-only.
//
// Defense-in-depth: we retrieve the session from Stripe with
// `line_items` expanded and verify that (a) payment_status == 'paid'
// and (b) a line item referencing LIFETIME_PRODUCT_ID is present, so a
// stray zero-dollar or wrong-product session can't grant access. We
// match on product id (not price id) so new price variants of the
// same product don't break the check.
//
// Deployment: Lambda Function URL with auth type NONE. The Stripe
// signature header is the only authentication. No npm dependencies.
//
// Stripe dashboard: point the webhook at this Function URL, subscribe
// to `checkout.session.completed`, and copy the signing secret into
// STRIPE_WEBHOOK_SECRET.
//
// Required env vars:
//   STRIPE_SECRET_KEY            — for retrieving the full session
//   STRIPE_WEBHOOK_SECRET        — for signature verification
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    — writes to lifetime_entitlements
//   LIFETIME_PRODUCT_ID          — guards against wrong-product sessions

import crypto from 'node:crypto';

// ── Stripe signature verification (HMAC-SHA256 over `t.payload`) ──
function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader || !secret) return false;

  let timestamp = null;
  const signatures = [];
  for (const part of sigHeader.split(',')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.substring(0, idx).trim();
    const v = part.substring(idx + 1).trim();
    if (k === 't') timestamp = v;
    if (k === 'v1') signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Constant-time comparison.
  const expectedBuf = Buffer.from(expected, 'hex');
  return signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, 'hex');
      return (
        sigBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(sigBuf, expectedBuf)
      );
    } catch {
      return false;
    }
  });
}

// ── Stripe: fetch the session with line_items expanded ──
async function retrieveSession(sessionId) {
  const url = new URL(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
  );
  url.searchParams.set('expand[]', 'line_items');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`stripe_retrieve_failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// ── Supabase: UPSERT the entitlement row ──
async function upsertEntitlement({ email, sessionId, customerId }) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/lifetime_entitlements?on_conflict=email`,
    {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        email,
        stripe_checkout_session_id: sessionId,
        stripe_customer_id: customerId || null,
        purchased_at: new Date().toISOString(),
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`entitlement_upsert_failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export const handler = async (event) => {
  const method =
    event.requestContext?.http?.method || event.httpMethod || 'POST';
  if (method !== 'POST') {
    return { statusCode: 405, body: 'method_not_allowed' };
  }

  // Lambda Function URL bodies come through `event.body`. Stripe sends
  // JSON as the raw string — we need the exact bytes for signature
  // verification, so don't parse before verifying.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '';

  const sigHeader =
    event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature'] || '';

  const valid = verifyStripeSignature(
    rawBody,
    sigHeader,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
  if (!valid) {
    console.error('[webhook] Signature verification failed');
    return { statusCode: 400, body: 'invalid_signature' };
  }

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, body: 'invalid_json' };
  }

  // Ignore everything we didn't subscribe for (defense against
  // accidentally enabling extra events in the Stripe dashboard).
  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: 'ignored' };
  }

  try {
    const sessionRef = stripeEvent.data.object;

    // Event payload omits line_items — retrieve the full session so we
    // can verify the lifetime product is actually in the purchase.
    const session = await retrieveSession(sessionRef.id);

    if (session.payment_status !== 'paid') {
      console.log('[webhook] Session not paid, ignoring', session.id);
      return { statusCode: 200, body: 'not_paid' };
    }

    // `price.product` is returned as a string id unless we expand it
    // further. Matching on product (not price) means new price variants
    // of the same lifetime product keep working without a code change.
    const productId = process.env.LIFETIME_PRODUCT_ID;
    const hasLifetimeProduct = (session.line_items?.data || []).some(
      (li) => li.price?.product === productId,
    );
    if (!hasLifetimeProduct) {
      console.log(
        '[webhook] Session does not contain lifetime product, ignoring',
        session.id,
      );
      return { statusCode: 200, body: 'wrong_product' };
    }

    const email = session.customer_details?.email || session.customer_email;
    if (!email) {
      // Should not happen if the Payment Link is configured to collect
      // email. Log loudly so we notice if Stripe sends us an orphan
      // session — there's no way to match it to a user.
      console.error('[webhook] Session missing email', session.id);
      return { statusCode: 200, body: 'missing_email' };
    }

    await upsertEntitlement({
      email: email.toLowerCase(),
      sessionId: session.id,
      customerId: session.customer || null,
    });

    console.log('[webhook] Lifetime access granted for', email);
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('[webhook] Error', err);
    // Return 500 so Stripe retries.
    return { statusCode: 500, body: err.message };
  }
};
