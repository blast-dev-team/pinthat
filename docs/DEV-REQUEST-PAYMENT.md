# DEV-REQUEST: Phase 4 — Stripe 결제 연동 + Pro 잠금

> 요청일: 2026-03-31
> 요청자: 연진
> 우선순위: P0
> 예상 영향 범위: worker/wrangler.toml, worker/src/index.js, content-script.js, landing/index.html

---

## 배경

PinThat의 GitHub 연동 기능을 Pro 유료 기능으로 잠그고, Stripe 결제를 통해 Pro 플랜을 구매할 수 있게 한다.
유저 식별은 기존 GitHub OAuth를 활용하며, 별도 회원가입 없이 GitHub 로그인 + Stripe 결제만으로 완료.

### 인프라 (이미 완료)
- Stripe 상품 2개 등록 완료 (Test mode)
  - **PinThat Pro Monthly** $4.98/월 — Price ID: `price_1TGyk6DYzHZgHbYuaa7l4brX`
  - **PinThat Pro Lifetime** $19.98 일회성 — Price ID: `price_1TGynHDYzHZgHbYuoGARymvh`
- Stripe Webhook 설정 완료
  - Endpoint: `https://pinthat-auth.el-lee.workers.dev/stripe-webhook`
  - Event: `checkout.session.completed`
  - Webhook Secret: `whsec_3PkATW5hq2H5j9nG5P2cECIFuTfCTZbr`
- Cloudflare KV "PLANS" 생성 완료
  - Namespace ID: `02bd0ffadf7f4d13b44a03673aaa2f56`
- 기존 Worker 배포 완료: `https://pinthat-auth.el-lee.workers.dev`
- GitHub OAuth 연동 완료 (content-script.js에 auth.username 존재)

---

## 수정 1: worker/wrangler.toml — KV 바인딩 추가

```toml
name = "pinthat-auth"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "PLANS"
id = "02bd0ffadf7f4d13b44a03673aaa2f56"
```

---

## 수정 2: Worker 환경변수 등록 (터미널에서 실행)

```bash
cd "QA TOOL/worker"
npx wrangler secret put STRIPE_SECRET_KEY
# → Stripe Dashboard > Developers > API keys > Secret key 입력

npx wrangler secret put STRIPE_WEBHOOK_SECRET
# → 값: whsec_3PkATW5hq2H5j9nG5P2cECIFuTfCTZbr
```

---

## 수정 3: worker/src/index.js — 결제 엔드포인트 추가

기존 OAuth 엔드포인트(GET /, GET /auth, GET /callback, POST /token)는 **그대로 유지**하고, 아래 3개 엔드포인트를 추가한다.

### 3-1. GET /check-plan?username=xxx

Extension이 호출하여 유저가 Pro인지 확인한다.

```javascript
// KV에서 username으로 조회
// 응답 예시:
// Pro인 경우: { plan: "pro", type: "lifetime", paidAt: "2026-03-31T..." }
// Free인 경우: { plan: "free" }
```

- CORS 헤더 필수 (Extension에서 호출하므로)
- username이 없거나 KV에 없으면 `{ plan: "free" }` 반환

### 3-2. POST /create-checkout

Extension 또는 랜딩페이지에서 호출하여 Stripe Checkout Session을 생성한다.

```javascript
// Request Body: { username, priceId, successUrl, cancelUrl }
//
// 처리:
// 1. priceId 유효성 검증 (허용된 price ID 목록에 있는지)
// 2. Stripe API로 Checkout Session 생성
//    - line_items: [{ price: priceId, quantity: 1 }]
//    - mode: priceId가 monthly면 "subscription", lifetime이면 "payment"
//    - metadata: { github_username: username }
//    - success_url, cancel_url
// 3. 응답: { url: session.url } (Stripe Checkout 페이지 URL)
//
// Stripe API 호출 시 STRIPE_SECRET_KEY 사용
// Stripe API는 fetch로 직접 호출 (npm 패키지 사용 안 함)
// https://api.stripe.com/v1/checkout/sessions (POST, form-urlencoded)
```

**허용된 Price ID 목록** (하드코딩):
```javascript
const ALLOWED_PRICES = {
  'price_1TGyk6DYzHZgHbYuaa7l4brX': 'monthly',
  'price_1TGynHDYzHZgHbYuoGARymvh': 'lifetime'
};
```

### 3-3. POST /stripe-webhook

Stripe가 결제 완료 시 호출한다.

```javascript
// 처리:
// 1. Webhook signature 검증 (STRIPE_WEBHOOK_SECRET 사용)
//    - Stripe-Signature 헤더에서 timestamp + signature 추출
//    - HMAC SHA-256으로 서명 검증
// 2. event.type === 'checkout.session.completed' 확인
// 3. session.metadata.github_username 추출
// 4. ALLOWED_PRICES에서 type(monthly/lifetime) 결정
// 5. KV에 저장:
//    Key: github_username
//    Value: JSON.stringify({
//      plan: "pro",
//      type: "monthly" 또는 "lifetime",
//      paidAt: new Date().toISOString(),
//      stripeCustomerId: session.customer,
//      stripeSubscriptionId: session.subscription (monthly만)
//    })
// 6. 응답: 200 OK
```

**Webhook 서명 검증** (Cloudflare Worker에서 crypto.subtle 사용):
```javascript
async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts['t'];
  const signature = parts['v1'];

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  return expectedSig === signature;
}
```

### CORS 처리

모든 엔드포인트에 CORS 헤더 추가:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
// OPTIONS 요청에는 빈 200 응답 + corsHeaders
```

---

## 수정 4: content-script.js — Pro 잠금 로직

### 4-1. checkUserPlan() 함수 추가

```javascript
async function checkUserPlan() {
  const settings = await loadGitHubSettings();
  if (!settings.auth?.username) return 'free';

  // 캐시: 1시간 이내면 재확인 안 함
  if (settings.planCheckedAt && (Date.now() - settings.planCheckedAt < 3600000)) {
    return settings.plan || 'free';
  }

  try {
    const res = await fetch(
      `https://pinthat-auth.el-lee.workers.dev/check-plan?username=${settings.auth.username}`
    );
    const data = await res.json();
    settings.plan = data.plan;
    settings.planCheckedAt = Date.now();
    await saveGitHubSettings(settings);
    return data.plan;
  } catch {
    return settings.plan || 'free'; // 오프라인이면 캐시 사용
  }
}
```

### 4-2. 잠금 대상

| 기능 | Free | Pro |
|------|------|-----|
| 요소 선택 + 피드백 | ✅ | ✅ |
| 마크다운 출력/복사 | ✅ | ✅ |
| 세션 저장/불러오기 | ✅ | ✅ |
| 재검수 모드 | ✅ | ✅ |
| 단축키 설정 | ✅ | ✅ |
| GitHub OAuth 로그인 | ✅ | ✅ |
| **GitHub Issue 전송** | 🔒 | ✅ |
| **이슈 현황** | 🔒 | ✅ |
| **재검수 → Reopen** | 🔒 | ✅ |
| **이슈 아카이브** | 🔒 | ✅ |

### 4-3. Pro 잠금 적용 위치

Free 유저가 잠긴 기능을 클릭하면 → **Pro 업그레이드 모달** 표시:

```
┌──────────────────────────────────┐
│  ⭐ PinThat Pro                   │
│                                   │
│  GitHub Issue 전송은              │
│  Pro 기능입니다.                  │
│                                   │
│  ┌─────────────┐ ┌─────────────┐│
│  │ $4.98/월    │ │ $19.98 영구  ││
│  │  (구독형)   │ │ (1회 결제)   ││
│  └─────────────┘ └─────────────┘│
│                                   │
│  [업그레이드]        [나중에]     │
│                                   │
│  GitHub 로그인이 필요합니다       │ ← 미로그인 시에만 표시
└──────────────────────────────────┘
```

**업그레이드 버튼 클릭 시 동작:**
1. GitHub 로그인 안 된 상태 → OAuth 로그인 먼저 유도
2. 로그인 된 상태 → Worker의 POST /create-checkout 호출
   - `{ username: auth.username, priceId: 선택한가격, successUrl: 현재페이지URL, cancelUrl: 현재페이지URL }`
   - 응답의 `url`로 새 탭 열기 (`chrome.tabs.create` 또는 `window.open`)

**모달 CSS**: 기존 `.qa-feedback-` 네임스페이스 사용, z-index: 100000

### 4-4. 잠금 체크 타이밍

- Extension 로드 시 (패널 열릴 때) `checkUserPlan()` 호출
- GitHub Issue 전송 버튼 클릭 시
- 이슈 현황 탭 클릭 시
- 재검수 → Reopen 클릭 시

---

## 수정 5: landing/index.html — Pricing 섹션 결제 연결

### 현재 상태
Pricing 카드가 있지만 버튼이 비활성 상태

### 변경
- **Free 카드** "시작하기" → Chrome 웹스토어 링크 (아직 없으면 `#` 유지)
- **Pro 카드** "Pro 시작하기" → JavaScript로 Stripe Checkout 호출
  - URL 파라미터에서 `?username=xxx`를 읽어서 사용
  - username 없으면 "먼저 Extension에서 GitHub 로그인 해주세요" 안내

### 신규 파일: landing/success.html

결제 완료 후 리다이렉트되는 페이지:
```
┌──────────────────────────────────┐
│  ✅ 결제 완료!                    │
│                                   │
│  PinThat Pro가 활성화되었습니다.  │
│  Extension으로 돌아가서           │
│  GitHub 기능을 사용해보세요!      │
│                                   │
│  [확인]                           │
└──────────────────────────────────┘
```

---

## 검증 체크리스트

- [ ] `wrangler.toml`에 KV 바인딩 추가됨
- [ ] Worker deploy 성공
- [ ] GET /check-plan?username=xxx → `{ plan: "free" }` 응답
- [ ] POST /create-checkout → Stripe Checkout URL 반환
- [ ] Stripe 테스트 카드(4242...)로 결제 → Webhook 수신
- [ ] Webhook → KV에 Pro 저장됨
- [ ] GET /check-plan → `{ plan: "pro" }` 응답
- [ ] Extension: Free 유저 → Issue 전송 클릭 → Pro 모달 표시
- [ ] Extension: Pro 유저 → Issue 전송 정상 동작
- [ ] Extension: 이슈 현황/Reopen/아카이브 → Pro만 사용 가능
- [ ] 오프라인 시 캐시된 플랜 정보로 동작
- [ ] 랜딩페이지 Pricing 버튼 → Stripe Checkout 이동

---

## 변경 파일 목록

| 파일 | 수정 내용 |
|------|-----------|
| `worker/wrangler.toml` | KV namespace 바인딩 추가 |
| `worker/src/index.js` | /check-plan, /create-checkout, /stripe-webhook 엔드포인트 추가 |
| `content-script.js` | checkUserPlan() + Pro 잠금 로직 + 업그레이드 모달 |
| `landing/index.html` | Pricing 버튼에 Stripe Checkout 연결 |
| **신규** `landing/success.html` | 결제 완료 페이지 |

---

## 실행 순서

> 이 DEV-REQUEST는 크기가 크므로 **3단계로 나눠서 실행**을 권장한다.

### Phase A: Worker 엔드포인트 (수정 1, 2, 3)
1. wrangler.toml에 KV 바인딩 추가
2. worker/src/index.js에 3개 엔드포인트 추가 (기존 코드 유지!)
3. `npx wrangler secret put STRIPE_SECRET_KEY` 실행 (연진이 직접)
4. `npx wrangler secret put STRIPE_WEBHOOK_SECRET` 실행 (값: whsec_3PkATW5hq2H5j9nG5P2cECIFuTfCTZbr)
5. `npx wrangler deploy`
6. curl로 /check-plan 테스트

### Phase B: Extension Pro 잠금 (수정 4)
1. checkUserPlan() 함수 추가
2. Pro 업그레이드 모달 UI 추가
3. 잠금 체크 로직 적용
4. Extension 리로드 후 테스트

### Phase C: 랜딩페이지 (수정 5)
1. Pricing 버튼 연결
2. success.html 생성
3. 테스트

---

## 클로드 코드 실행 지시문

```
docs/DEV-REQUEST-PAYMENT.md 읽고 실행해줘.

Phase A부터 시작:
1. worker/wrangler.toml에 KV 바인딩 추가
2. worker/src/index.js에 /check-plan, /create-checkout, /stripe-webhook 추가 (기존 OAuth 코드 유지!)
3. Stripe API는 fetch로 직접 호출 (npm 패키지 X)
4. Webhook 서명 검증은 crypto.subtle 사용
5. CORS 헤더 필수

환경변수는 내가 직접 등록할게. 코드 작성 + deploy까지 해줘.
완료 후 git commit.
```
