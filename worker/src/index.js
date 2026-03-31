/**
 * PinThat Auth Worker
 * GitHub OAuth 토큰 교환 서버
 *
 * 역할: Extension에서 받은 authorization code를
 *       GitHub에 보내서 access_token으로 교환
 *
 * 환경변수 (Secrets):
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 */

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

    // ===== Route: GET / =====
    // Health check
    if (url.pathname === '/') {
      return Response.json({
        service: 'PinThat Auth',
        status: 'ok',
        endpoints: ['/auth', '/callback', '/token'],
      }, { headers: CORS_HEADERS });
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
};

