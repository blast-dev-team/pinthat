// Service worker — 메시지 중계 + 단축키 처리
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-qa') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-qa' });
      }
    });
  }
});

// popup.js → content script 메시지 중계 + OAuth 처리
const WORKER_URL = 'https://pinthat-auth.el-lee.workers.dev';
const CLIENT_ID = 'Ov23li0Qr2E4QXkKhwcC';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'content') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, msg, sendResponse);
      }
    });
    return true;
  }

  if (msg.action === 'github-oauth-login') {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(WORKER_URL + '/callback')}&scope=repo`;

    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, async (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        sendResponse({ error: chrome.runtime.lastError?.message || '로그인 취소' });
        return;
      }

      try {
        const url = new URL(redirectUrl);
        const hash = url.hash.substring(1);
        const params = new URLSearchParams(hash);
        let token = params.get('access_token');

        if (!token) {
          const code = url.searchParams.get('code');
          if (code) {
            const res = await fetch(`${WORKER_URL}/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code })
            });
            const data = await res.json();
            token = data.access_token;
          }
        }

        if (!token) {
          sendResponse({ error: '토큰을 받지 못했습니다.' });
          return;
        }

        const userRes = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const user = await userRes.json();

        sendResponse({
          success: true,
          token: token,
          username: user.login,
          avatarUrl: user.avatar_url
        });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    });

    return true;
  }

  if (msg.action === 'github-fetch-repos') {
    (async () => {
      try {
        const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&type=all', {
          headers: { Authorization: `Bearer ${msg.token}` }
        });
        const repos = await res.json();
        sendResponse({
          repos: repos.map(r => ({
            full_name: r.full_name,
            owner: r.owner.login,
            name: r.name,
            private: r.private
          }))
        });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }
});
