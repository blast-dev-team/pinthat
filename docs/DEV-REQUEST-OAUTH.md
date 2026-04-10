# DEV-REQUEST: GitHub OAuth 로그인 + 레포 목록 선택

> 요청일: 2026-03-31
> 요청자: 연진
> 우선순위: P0
> 예상 영향 범위: manifest.json, background.js, content-script.js

---

## 배경

현재 GitHub 연동은 유저가 PAT(Personal Access Token)를 직접 발급하고 입력하는 방식.
이를 **"GitHub로 로그인" 버튼 + 내 레포 목록에서 선택**하는 OAuth 방식으로 변경한다.

### 인프라 (이미 완료)
- GitHub OAuth App 등록 완료 — Client ID: `Ov23li0Qr2E4QXkKhwcC`
- Cloudflare Worker 배포 완료 — `https://pinthat-auth.el-lee.workers.dev`
- Worker 엔드포인트:
  - `GET /auth` → GitHub 인증 페이지로 리다이렉트
  - `GET /callback?code=xxx` → code를 access_token으로 교환, HTML 페이지 반환
  - `POST /token` → code를 JSON으로 받아서 access_token 반환

---

## 수정 1: manifest.json 권한 추가

```json
{
  "permissions": ["activeTab", "storage", "clipboardWrite", "identity"],
  "host_permissions": [
    "https://api.github.com/*",
    "https://pinthat-auth.el-lee.workers.dev/*"
  ]
}
```

- `identity` 추가: `chrome.identity.launchWebAuthFlow` 사용
- `host_permissions`에 Worker URL 추가

---

## 수정 2: background.js — OAuth 핸들러 추가

기존 코드(단축키 + 메시지 중계) 유지하고, OAuth 메시지 핸들러를 추가한다.

```javascript
// ===== OAuth 처리 =====
const WORKER_URL = 'https://pinthat-auth.el-lee.workers.dev';
const CLIENT_ID = 'Ov23li0Qr2E4QXkKhwcC';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 기존 content 메시지 중계 코드는 유지

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
        // callback URL에서 access_token 추출 (hash fragment)
        const url = new URL(redirectUrl);
        const hash = url.hash.substring(1); // '#access_token=xxx' → 'access_token=xxx'
        const params = new URLSearchParams(hash);
        let token = params.get('access_token');

        // hash에 없으면 code로 /token 엔드포인트 호출
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

        // GitHub 유저 정보 가져오기
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

    return true; // async response
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
```

---

## 수정 3: content-script.js — GitHub 설정 모달 UI 변경

### 현재 UI
```
[레포 입력] [토큰 입력] [연결 테스트] [저장]
```

### 변경 후 UI
```
┌──────────────────────────────┐
│ 🔗 GitHub 연동 설정           │
│                               │
│  ┌────────────────────────┐  │
│  │  🐙 GitHub로 로그인     │  │  ← OAuth 버튼 (미연결 시)
│  └────────────────────────┘  │
│                               │
│  ── 로그인 후 표시 ──         │
│  ✅ @username 연결됨          │  ← 아바타 + 사용자명
│                               │
│  현재 사이트: localhost:3000   │  ← 자동 표시
│  레포 선택:                   │
│  ┌──────────────────── ▼ ┐   │  ← 드롭다운 (GET /user/repos)
│  │ owner/repo-name        │   │
│  └────────────────────────┘  │
│                               │
│  [저장]  [연결 해제]          │
│                               │
│  ─── 또는 ───                │
│  ▶ 토큰 직접 입력 (접이식)    │  ← 기존 PAT 입력 (백업)
└──────────────────────────────┘
```

### 핵심 변경 사항

**showGitHubSettings() 함수 전체 교체:**

1. **OAuth 로그인 버튼**: 클릭 시 `chrome.runtime.sendMessage({ action: 'github-oauth-login' })` → background.js가 처리
2. **로그인 성공 후**:
   - `auth` 객체를 chrome.storage.local에 저장: `{ method: 'oauth', token, username, avatarUrl }`
   - `chrome.runtime.sendMessage({ action: 'github-fetch-repos', token })` → 레포 목록 수신
   - 드롭다운에 레포 목록 표시 (full_name, private 여부 표시)
3. **레포 선택 → 저장**: 기존 mappings 구조에 저장 (urlPattern + repoOwner + repoName)
4. **연결 해제**: auth 객체 삭제 + 매핑 삭제
5. **PAT 직접 입력 (접이식)**: 기존 토큰 입력 UI를 collapsible 섹션으로 이동. "토큰 직접 입력 ▶" 클릭 시 펼쳐짐

### 데이터 모델 변경

```javascript
// GitHub 설정 저장 구조 (변경)
const GH_SETTINGS = {
  auth: {
    method: 'oauth',        // 'oauth' | 'pat'
    token: 'gho_xxxx...',
    username: 'Leeyeonjin2001',
    avatarUrl: 'https://avatars.githubusercontent.com/...'
  },
  mappings: [
    {
      urlPattern: 'http://localhost:3000',
      matchMode: 'exact',
      repoOwner: 'Leeyeonjin2001',
      repoName: '0car'
      // token 필드 제거 → auth.token 하나로 통합
    }
  ],
  plan: 'free'
};
```

**하위 호환**: 기존에 mapping에 token이 있던 데이터도 동작하도록, token 조회 시 `auth.token || mapping.token` 순서로 fallback.

### 기존 함수 수정

- `getGitHubMapping()`: 기존 로직 유지 (urlPattern 매칭)
- `loadGitHubSettings()`: auth 필드 추가 대응
- `createGitHubIssue()` 등 API 호출 함수들: 토큰을 `auth.token || mapping.token`으로 가져오도록 변경
- `connectionVerified` 플래그: OAuth 로그인 성공 시 자동 true

---

## 검증 체크리스트

- [ ] "GitHub로 로그인" 버튼 클릭 → GitHub 인증 페이지 열림
- [ ] GitHub 승인 → 토큰 저장 + @username 표시
- [ ] 레포 목록이 드롭다운에 로드됨 (개인 + 조직 레포)
- [ ] 레포 선택 → 저장 → 이슈 생성 정상 동작
- [ ] "연결 해제" → 토큰 삭제 + UI 초기화
- [ ] "토큰 직접 입력" 접이식 → 기존 PAT 입력 정상 동작
- [ ] 기존 PAT로 저장된 데이터 → 새 구조에서도 정상 동작 (하위 호환)
- [ ] 이슈 현황, 재검수, 이슈 전송 모두 OAuth 토큰으로 정상 동작

---

## 변경 파일 목록

| 파일 | 수정 내용 |
|------|-----------|
| `manifest.json` | `identity` 권한 + Worker host_permissions 추가 |
| `background.js` | OAuth 로그인 + 레포 목록 메시지 핸들러 추가 |
| `content-script.js` | showGitHubSettings() UI 전체 교체 + 토큰 조회 로직 변경 |

---

## 클로드 코드 실행 지시문

```
docs/DEV-REQUEST-OAUTH.md 읽고 실행해줘.

핵심:
1. manifest.json에 identity 권한 + Worker host_permissions 추가
2. background.js에 OAuth 로그인 + 레포 목록 핸들러 추가 (기존 코드 유지)
3. content-script.js의 showGitHubSettings() 함수를 OAuth UI로 교체
4. 토큰 조회: auth.token || mapping.token (하위 호환)
5. PAT 직접 입력은 접이식으로 백업 유지

Worker URL: https://pinthat-auth.el-lee.workers.dev
Client ID: Ov23li0Qr2E4QXkKhwcC

완료 후 git commit.
```
