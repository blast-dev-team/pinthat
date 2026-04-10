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

const LIFETIME_PRICE_ID = 'price_1TKZoICyuV4KYuNQ84cMQxfh';
const TRIAL_DAYS = 7;

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
        return Response.json({ plan: 'none' }, { headers: CORS_HEADERS });
      }
      try {
        let data = await env.PLANS.get(username, 'json');

        // 첫 로그인 → trial 자동 생성
        if (!data) {
          const now = new Date();
          const expires = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
          data = {
            plan: 'trial',
            trialStartedAt: now.toISOString(),
            trialExpiresAt: expires.toISOString(),
          };
          await env.PLANS.put(username, JSON.stringify(data));
        }

        // paid → 그대로 반환
        if (data.plan === 'paid') {
          return Response.json(data, { headers: CORS_HEADERS });
        }

        // trial → 만료 체크
        if (data.plan === 'trial' && data.trialExpiresAt) {
          const now = Date.now();
          const expires = new Date(data.trialExpiresAt).getTime();
          const msLeft = expires - now;
          const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

          if (daysLeft <= 0) {
            return Response.json({ ...data, plan: 'expired', daysLeft: 0 }, { headers: CORS_HEADERS });
          }
          return Response.json({ ...data, daysLeft }, { headers: CORS_HEADERS });
        }

        return Response.json(data, { headers: CORS_HEADERS });
      } catch (err) {
        console.error('[check-plan] Error:', err.message);
        return Response.json({ plan: 'none' }, { headers: CORS_HEADERS });
      }
    }

    // ===== Route: GET /success =====
    if (url.pathname === '/success' && request.method === 'GET') {
      return new Response(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>결제 완료 — PinThat</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px 32px;max-width:420px;width:100%;text-align:center}.icon{font-size:56px;margin-bottom:16px}.title{font-size:24px;font-weight:700;color:#f1f5f9;margin-bottom:12px}.desc{font-size:15px;color:#94a3b8;line-height:1.6;margin-bottom:24px}.note{font-size:13px;color:#64748b;background:#0f172a;border-radius:8px;padding:12px 16px}</style></head><body><div class="card"><div class="icon">🎉</div><div class="title">결제가 완료되었습니다!</div><div class="desc">PinThat 평생이용권이 활성화되었습니다.<br>이 창을 닫고 PinThat을 즐겨주세요.</div><div class="note">이 창을 닫아도 됩니다.</div></div></body></html>`, {
        status: 200,
        headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS_HEADERS },
      });
    }

    // ===== Route: GET /cancel =====
    if (url.pathname === '/cancel' && request.method === 'GET') {
      return new Response(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>결제 취소 — PinThat</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px 32px;max-width:420px;width:100%;text-align:center}.icon{font-size:56px;margin-bottom:16px}.title{font-size:24px;font-weight:700;color:#f1f5f9;margin-bottom:12px}.desc{font-size:15px;color:#94a3b8;line-height:1.6;margin-bottom:24px}.note{font-size:13px;color:#64748b;background:#0f172a;border-radius:8px;padding:12px 16px}</style></head><body><div class="card"><div class="icon">↩️</div><div class="title">결제가 취소되었습니다.</div><div class="desc">결제가 완료되지 않았습니다.<br>언제든지 다시 시도하실 수 있습니다.</div><div class="note">이 창을 닫고 PinThat 패널에서 다시 시도해주세요.</div></div></body></html>`, {
        status: 200,
        headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS_HEADERS },
      });
    }

    // ===== Route: POST /create-checkout =====
    if (url.pathname === '/create-checkout' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { username } = body;

        if (!username) {
          return Response.json({ error: 'Missing username' }, { status: 400, headers: CORS_HEADERS });
        }

        const SUCCESS_URL = `${url.origin}/success`;
        const CANCEL_URL = `${url.origin}/cancel`;

        const params = new URLSearchParams();
        params.append('mode', 'payment');
        params.append('success_url', SUCCESS_URL);
        params.append('cancel_url', CANCEL_URL);
        params.append('line_items[0][price]', LIFETIME_PRICE_ID);
        params.append('line_items[0][quantity]', '1');
        params.append('metadata[github_username]', username);
        params.append('allow_promotion_codes', 'true');

        console.log('[checkout] Creating session for', username, 'success:', SUCCESS_URL, 'cancel:', CANCEL_URL);

        const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const session = await res.json();
        console.log('[checkout] Stripe response status:', res.status, 'has url:', !!session.url, 'error:', session.error?.message);

        if (!res.ok || session.error) {
          return Response.json({
            error: session.error?.message || 'Stripe error',
            stripe_code: session.error?.code,
            stripe_type: session.error?.type,
            stripe_param: session.error?.param,
          }, { status: res.status || 400, headers: CORS_HEADERS });
        }

        return Response.json({ url: session.url }, { headers: CORS_HEADERS });
      } catch (err) {
        console.error('[checkout] Error:', err.message);
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
            const existing = await env.PLANS.get(username, 'json') || {};
            const updated = {
              ...existing,
              plan: 'paid',
              type: 'lifetime',
              paidAt: new Date().toISOString(),
              stripeCustomerId: session.customer || null,
            };

            await env.PLANS.put(username, JSON.stringify(updated));
            console.log('[webhook] Plan saved for', username, ':', JSON.stringify(updated));
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
        endpoints: ['/auth', '/callback', '/token', '/check-plan', '/create-checkout', '/stripe-webhook', '/success', '/cancel'],
      }, { headers: CORS_HEADERS });
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
};

