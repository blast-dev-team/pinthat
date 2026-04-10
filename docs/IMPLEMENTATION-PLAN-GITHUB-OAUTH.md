# IMPLEMENTATION PLAN: GitHub OAuth 연동 (Phase 4-1)

> 작성일: 2026-03-31
> 상태: 📋 계획 확정

---

## 1. 목표

현재 수동 PAT 입력 방식을 **GitHub OAuth "로그인" 버튼 + 레포 목록 선택**으로 대체한다.
유저가 토큰을 직접 만들 필요 없이, 클릭 몇 번으로 GitHub 연동을 완료할 수 있게 한다.

---

## 2. 전체 아키텍처

```
[Extension]                    [Cloudflare Worker]              [GitHub]
    |                                |                              |
    |-- 1. "GitHub 로그인" 클릭 -->  |                              |
    |   (chrome.identity.launchWebAuthFlow)                         |
    |                                |                              |
    |-- 2. GitHub 인증 페이지 ---------------------------------->   |
    |                                |                              |
    |   <-- 3. callback?code=xxx --------------------------------  |
    |                                |                              |
    |-- 4. code 전송 ------------>   |                              |
    |                                |-- 5. code + secret -------> |
    |                                |   <-- 6. access_token ----  |
    |   <-- 7. access_token ------   |                              |
    |                                |                              |
    |-- 8. GET /user/repos ---------------------------------------->|
    |   <-- 9. 레포 목록 ------------------------------------------  |
    |                                                               |
    |-- 10. 유저가 레포 선택 → 저장 완료                              |
```

---

## 3. 구현 단계

### STEP 1: GitHub OAuth App 등록 (연진 직접)

**작업**: GitHub Settings에서 OAuth App 생성

- 위치: GitHub → Settings → Developer settings → OAuth Apps → New
- 설정값:
  - Application name: `PinThat`
  - Homepage URL: `https://pinthat.org`
  - Authorization callback URL: `https://pinthat-auth.{account}.workers.dev/callback`
    (Cloudflare Worker 배포 후 확정)
- 결과물: `Client ID` + `Client Secret`

**예상 소요**: 5분
**담당**: 연진

---

### STEP 2: Cloudflare Worker 배포 (DEV-REQUEST)

**작업**: OAuth 토큰 교환 서버 구축

**필요한 이유**: `client_secret`은 절대 Extension(클라이언트)에 넣을 수 없음. 서버에서 안전하게 보관하고 토큰 교환만 수행.

**Worker 기능**:
1. `GET /auth` — GitHub 인증 페이지로 리다이렉트
2. `GET /callback?code=xxx` — code를 받아서 GitHub에 access_token 교환 → Extension으로 전달
3. CORS 헤더 처리

**환경변수 (Secrets)**:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

**배포 위치**: `pinthat-auth.{account}.workers.dev`
(추후 `auth.pinthat.org` 서브도메인으로 커스텀 도메인 연결 가능)

**예상 소요**: DEV-REQUEST 1건
**담당**: 클로드 코드

---

### STEP 3: Extension OAuth 플로우 구현 (DEV-REQUEST)

**작업**: GitHub 설정 모달을 OAuth 기반으로 개편

**변경 내용**:

#### 3-1. manifest.json 수정
```json
{
  "permissions": ["activeTab", "storage", "clipboardWrite", "identity"],
  "host_permissions": [
    "https://api.github.com/*",
    "https://pinthat-auth.*.workers.dev/*"
  ]
}
```
- `identity` 권한 추가 (chrome.identity.launchWebAuthFlow 사용)

#### 3-2. GitHub 설정 모달 UI 변경

**변경 전** (현재):
```
┌─────────────────────────┐
│ 🔗 GitHub 연동 설정      │
│                          │
│ 레포: [owner/repo 입력]  │
│ 토큰: [ghp_xxx 입력]     │
│ [연결 테스트] [저장]      │
└─────────────────────────┘
```

**변경 후** (OAuth):
```
┌──────────────────────────────┐
│ 🔗 GitHub 연동 설정           │
│                               │
│  [🐙 GitHub로 로그인]         │  ← OAuth 버튼
│                               │
│  ── 로그인 후 표시 ──         │
│  ✅ @Leeyeonjin2001 연결됨    │
│                               │
│  현재 사이트: localhost:3000   │
│  레포 선택: [▼ 드롭다운]      │  ← /user/repos 목록
│    - Leeyeonjin2001/0car      │
│    - Leeyeonjin2001/my-app    │
│    - blast-team/project-x     │
│                               │
│  [저장]  [연결 해제]          │
└──────────────────────────────┘
```

#### 3-3. OAuth 플로우 (background.js)
```javascript
// 1. GitHub 인증 URL 생성
const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${WORKER_CALLBACK}&scope=repo`;

// 2. chrome.identity.launchWebAuthFlow로 인증
chrome.identity.launchWebAuthFlow({
  url: authUrl,
  interactive: true
}, (redirectUrl) => {
  // 3. redirectUrl에서 access_token 추출
  const token = new URL(redirectUrl).searchParams.get('token');
  // 4. chrome.storage.local에 저장
});
```

#### 3-4. 레포 목록 가져오기
```javascript
// OAuth 토큰으로 유저의 레포 목록 조회
const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
  headers: { Authorization: `Bearer ${token}` }
});
const repos = await res.json();
// → 드롭다운에 표시
```

#### 3-5. PAT 수동 입력 백업
- OAuth 아래에 "토큰 직접 입력" 접이식(collapsible) 옵션 유지
- OAuth가 안 되는 환경(회사 방화벽 등)을 위한 백업

**예상 소요**: DEV-REQUEST 1건
**담당**: 클로드 코드

---

### STEP 4: 테스트 및 검증

- [ ] GitHub OAuth 로그인 성공
- [ ] 레포 목록 정상 로드 (개인 + 조직)
- [ ] 레포 선택 → 저장 → 이슈 생성 정상 동작
- [ ] 연결 해제 → 토큰 삭제 확인
- [ ] PAT 수동 입력 백업 정상 동작
- [ ] 토큰 만료/폐기 시 재로그인 안내

---

## 4. 데이터 모델 변경

### GitHub 설정 저장 구조 (변경)
```json
{
  "auth": {
    "method": "oauth",
    "token": "gho_xxxx...",
    "username": "Leeyeonjin2001",
    "avatarUrl": "https://avatars.githubusercontent.com/..."
  },
  "mappings": [
    {
      "urlPattern": "http://localhost:3000",
      "matchMode": "exact",
      "repoOwner": "Leeyeonjin2001",
      "repoName": "0car"
    }
  ],
  "plan": "free"
}
```
- `auth.method`: `"oauth"` | `"pat"` (수동 입력)
- `auth.token`: OAuth 토큰 또는 PAT
- `auth.username`: GitHub 사용자명 (OAuth 시 자동)
- 개별 mapping에서 `token` 필드 제거 → `auth.token` 하나로 통합

---

## 5. 보안 고려사항

- `client_secret`은 Cloudflare Worker Secrets에만 저장 (코드에 절대 노출 안 됨)
- OAuth scope는 `repo`만 요청 (최소 권한)
- access_token은 `chrome.storage.local`에만 저장
- Worker는 CORS origin을 Extension ID로 제한
- 연결 해제 시 토큰 즉시 삭제

---

## 6. 실행 순서

| 순서 | 작업 | 담당 | 의존성 |
|------|------|------|--------|
| 1 | GitHub OAuth App 등록 | 연진 | 없음 |
| 2 | Cloudflare Worker 개발 + 배포 | 클로드 코드 | Step 1의 Client ID/Secret |
| 3 | Extension OAuth 플로우 구현 | 클로드 코드 | Step 2의 Worker URL |
| 4 | 테스트 | 연진 + QA | Step 3 완료 |

---

## 7. 파일 변경 예상

| 파일 | 변경 내용 |
|------|-----------|
| `manifest.json` | `identity` 권한 추가, host_permissions 추가 |
| `background.js` | OAuth 플로우 핸들러 추가 |
| `content-script.js` | GitHub 설정 모달 UI 변경 (OAuth 버튼 + 레포 드롭다운) |
| **신규** `worker/` | Cloudflare Worker 코드 (토큰 교환 서버) |
