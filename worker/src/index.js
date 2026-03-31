/**
 * PinThat Auth + Payment Worker
 * GitHub OAuth 토큰 교환 + Stripe 결제 처리
 *
 * 환경변수 (Secrets):
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * KV:
 *   PLANS — 유저별 Pro 플랜 저장
 */

const ALLOWED_PRICES = {
  'price_1TGyk6DYzHZgHbYuaa7l4brX': 'monthly',
  'price_1TGynHDYzHZgHbYuoGARymvh': 'lifetime',
};

async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    if (!sigHeader || !secret) {
      console.error('[sig] Missing sigHeader or secret');
      return false;
    }

    // Stripe-Signature: t=timestamp,v1=sig1,v1=sig2,...
    let timestamp = null;
    const signatures = [];
    sigHeader.split(',').forEach(part => {
      const idx = part.indexOf('=');
      if (idx <= 0) return;
      const k = part.substring(0, idx).trim();
      const v = part.substring(idx + 1).trim();
      if (k === 't') timestamp = v;
      if (k === 'v1') signatures.push(v);
    });

    if (!timestamp || signatures.length === 0) {
      console.error('[sig] No timestamp or v1 found. Header:', sigHeader.substring(0, 80));
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('[sig] Expected:', expectedSig.substring(0, 16) + '...');
    console.log('[sig] Got v1[0]:', signatures[0].substring(0, 16) + '...');

    // 하나라도 매치하면 통과
    return signatures.some(s => s === expectedSig);
  } catch (err) {
    console.error('[sig] Error:', err.message);
    return false;
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // ===== Route: GET /auth =====
    // Extension이 이 URL로 리다이렉트 → GitHub 인증 페이지로 이동
    if (url.pathname === '/auth') {
      const state = crypto.randomUUID();
      const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
      githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      githubAuthUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);
      githubAuthUrl.searchParams.set('scope', 'repo');
      githubAuthUrl.searchParams.set('state', state);

      return Response.redirect(githubAuthUrl.toString(), 302);
    }

    // ===== Route: GET /callback?code=xxx&state=xxx =====
    // GitHub가 인증 후 여기로 리다이렉트 → code를 access_token으로 교환 → Extension으로 리다이렉트
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      // state에 Extension redirect URL이 인코딩되어 있음
      const extRedirectUrl = state ? decodeURIComponent(state) : null;

      if (!code) {
        if (extRedirectUrl) {
          return Response.redirect(`${extRedirectUrl}#error=${encodeURIComponent('Missing authorization code')}`, 302);
        }
        return new Response('Missing authorization code', { status: 400, headers: CORS_HEADERS });
      }

      try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code: code,
          }),
        });

        const tokenData = await tokenRes.json();

        if (tokenData.error) {
          const errMsg = tokenData.error_description || tokenData.error;
          if (extRedirectUrl) {
            return Response.redirect(`${extRedirectUrl}#error=${encodeURIComponent(errMsg)}`, 302);
          }
          return new Response(`인증 실패: ${errMsg}`, { status: 400, headers: CORS_HEADERS });
        }

        // 성공 → Extension redirect URL로 access_token 전달
        if (extRedirectUrl) {
          return Response.redirect(`${extRedirectUrl}#access_token=${tokenData.access_token}`, 302);
        }
        // fallback: extRedirectUrl 없으면 JSON 반환
        return Response.json({ access_token: tokenData.access_token }, { headers: CORS_HEADERS });

      } catch (err) {
        if (extRedirectUrl) {
          return Response.redirect(`${extRedirectUrl}#error=${encodeURIComponent(err.message)}`, 302);
        }
        return new Response(`서버 오류: ${err.message}`, { status: 500, headers: CORS_HEADERS });
      }
    }

    // ===== Route: POST /token =====
    // 대안 방식: Extension이 code를 직접 POST로 보내서 토큰 교환
    if (url.pathname === '/token' && request.method === 'POST') {
      try {
        const { code } = await request.json();

        if (!code) {
          return Response.json({ error: 'Missing code' }, {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code: code,
          }),
        });

        const tokenData = await tokenRes.json();

        if (tokenData.error) {
          return Response.json({ error: tokenData.error_description || tokenData.error }, {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        return Response.json({
          access_token: tokenData.access_token,
          token_type: tokenData.token_type,
          scope: tokenData.scope,
        }, { headers: CORS_HEADERS });

      } catch (err) {
        return Response.json({ error: err.message }, {
          status: 500,
          headers: CORS_HEADERS
        });
      }
    }

    // ===== Route: GET /check-plan?username=xxx =====
    if (url.pathname === '/check-plan' && request.method === 'GET') {
      const username = url.searchParams.get('username');
      if (!username) {
        return Response.json({ plan: 'free' }, { headers: CORS_HEADERS });
      }
      try {
        const stored = await env.PLANS.get(username);
        if (stored) {
          return Response.json(JSON.parse(stored), { headers: CORS_HEADERS });
        }
        return Response.json({ plan: 'free' }, { headers: CORS_HEADERS });
      } catch (err) {
        return Response.json({ plan: 'free' }, { headers: CORS_HEADERS });
      }
    }

    // ===== Route: POST /create-checkout =====
    if (url.pathname === '/create-checkout' && request.method === 'POST') {
      try {
        const { username, priceId, successUrl, cancelUrl } = await request.json();

        if (!username || !priceId || !successUrl || !cancelUrl) {
          return Response.json({ error: 'Missing required fields' }, { status: 400, headers: CORS_HEADERS });
        }

        const priceType = ALLOWED_PRICES[priceId];
        if (!priceType) {
          return Response.json({ error: 'Invalid price ID' }, { status: 400, headers: CORS_HEADERS });
        }

        const mode = priceType === 'monthly' ? 'subscription' : 'payment';

        const params = new URLSearchParams();
        params.append('mode', mode);
        params.append('success_url', successUrl);
        params.append('cancel_url', cancelUrl);
        params.append('line_items[0][price]', priceId);
        params.append('line_items[0][quantity]', '1');
        params.append('metadata[github_username]', username);

        const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const session = await res.json();
        if (session.error) {
          return Response.json({ error: session.error.message }, { status: 400, headers: CORS_HEADERS });
        }

        return Response.json({ url: session.url }, { headers: CORS_HEADERS });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // ===== Route: POST /stripe-webhook =====
    if (url.pathname === '/stripe-webhook' && request.method === 'POST') {
      try {
        const payload = await request.text();
        const sigHeader = request.headers.get('Stripe-Signature') || '';

        console.log('[webhook] Received event, sig present:', !!sigHeader, 'secret present:', !!env.STRIPE_WEBHOOK_SECRET);

        const valid = await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
        if (!valid) {
          console.error('[webhook] Signature verification failed');
          return new Response('Invalid signature', { status: 400 });
        }

        const event = JSON.parse(payload);
        console.log('[webhook] Event type:', event.type);

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          const username = session.metadata?.github_username;
          console.log('[webhook] Username:', username, 'Mode:', session.mode);

          if (username) {
            const type = session.mode === 'subscription' ? 'monthly' : 'lifetime';

            const planData = {
              plan: 'pro',
              type: type,
              paidAt: new Date().toISOString(),
              stripeCustomerId: session.customer || null,
              stripeSubscriptionId: session.subscription || null,
            };

            await env.PLANS.put(username, JSON.stringify(planData));
            console.log('[webhook] Plan saved for', username, ':', JSON.stringify(planData));
          } else {
            console.error('[webhook] No github_username in metadata');
          }
        }

        return new Response('OK', { status: 200 });
      } catch (err) {
        console.error('[webhook] Error:', err.message, err.stack);
        return new Response(`Webhook error: ${err.message}`, { status: 500 });
      }
    }

    // ===== Route: GET / =====
    // Health check
    if (url.pathname === '/') {
      return Response.json({
        service: 'PinThat Auth + Payment',
        status: 'ok',
        endpoints: ['/auth', '/callback', '/token', '/check-plan', '/create-checkout', '/stripe-webhook'],
      }, { headers: CORS_HEADERS });
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
};

