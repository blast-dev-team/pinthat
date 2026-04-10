# IMPLEMENTATION PLAN: Phase 4 — 결제 연동 + Pro 잠금

> 작성일: 2026-03-31
> 상태: 📋 계획 작성 중

---

## 1. 목표

GitHub 연동 기능을 Pro 유료 기능으로 잠그고, Stripe 결제를 통해 Pro 플랜을 구매할 수 있게 한다.
유저 식별은 기존 GitHub OAuth를 활용하며, 별도 회원가입 없이 **GitHub 로그인 + Stripe 결제**만으로 완료.

---

## 2. 전체 아키텍처

```
[Extension]                [Cloudflare Worker]           [Stripe]        [GitHub]
    |                            |                          |               |
    |-- GitHub OAuth 로그인 ---->|                          |               |
    |   (이미 구현 완료)         |                          |               |
    |                            |                          |               |
    |-- GET /check-plan -------->|                          |               |
    |   ?username=xxx            |                          |               |
    |                            |-- KV 조회 -------------->|               |
    |   <-- { plan: "free" } ----|                          |               |
    |                            |                          |               |
    |-- "Pro 업그레이드" 클릭 -->|                          |               |
    |   (pinthat.org/pricing)    |                          |               |
    |                            |                          |               |
    |   [브라우저]               |                          |               |
    |   Stripe Checkout -------->|                          |               |
    |   (username 포함)          |                          |               |
    |                            |                          |               |
    |                            |<-- Webhook: 결제 완료 ---|               |
    |                            |-- KV 저장: username=pro  |               |
    |                            |                          |               |
    |-- GET /check-plan -------->|                          |               |
    |   <-- { plan: "pro" } ----|                          |               |
    |                            |                          |               |
    |   GitHub 기능 잠금 해제!   |                          |               |
```

---

## 3. 구현 단계

### STEP 1: Stripe 계정 설정 (연진 직접)

**작업**: Stripe 계정 생성 + 상품 등록

1. https://dashboard.stripe.com 가입
2. 상품(Product) 2개 등록:
   - **PinThat Pro Monthly** — $3/월 (recurring)
   - **PinThat Pro Lifetime** — $10 일회성 (one-time)
3. 각 상품의 **Price ID** 메모 (예: `price_xxx`)
4. **Webhook** 설정:
   - URL: `https://pinthat-auth.el-lee.workers.dev/stripe-webhook`
   - 이벤트: `checkout.session.completed`
5. **Webhook Secret** 메모 (예: `whsec_xxx`)

**예상 소요**: 15분
**담당**: 연진

---

### STEP 2: Cloudflare KV 생성 (연진 직접)

**작업**: Pro 유저 데이터 저장소 생성

```bash
cd "QA TOOL/worker"
npx wrangler kv namespace create "PLANS"
```

결과로 나온 KV namespace ID를 `wrangler.toml`에 추가:
```toml
[[kv_namespaces]]
binding = "PLANS"
id = "생성된-namespace-id"
```

**KV 데이터 구조**:
```
Key: "Leeyeonjin2001"
Value: { "plan": "pro", "type": "lifetime", "paidAt": "2026-03-31T...", "stripeCustomerId": "cus_xxx" }
```

**예상 소요**: 5분
**담당**: 연진

---

### STEP 3: Worker 엔드포인트 추가 (DEV-REQUEST)

**작업**: 기존 Worker에 결제 관련 엔드포인트 추가

#### 3-1. GET /check-plan?username=xxx
```javascript
// Extension이 호출 → 유저가 Pro인지 확인
// KV에서 username으로 조회
// 응답: { plan: "pro", type: "lifetime" } 또는 { plan: "free" }
```

#### 3-2. POST /create-checkout
```javascript
// Extension/랜딩페이지에서 호출
// Body: { username, priceId, successUrl, cancelUrl }
// Stripe Checkout Session 생성 → checkout URL 반환
// username을 Stripe metadata에 저장
```

#### 3-3. POST /stripe-webhook
```javascript
// Stripe가 결제 완료 시 호출
// checkout.session.completed 이벤트 처리
// metadata에서 username 추출 → KV에 Pro 저장
// Webhook signature 검증 필수
```

#### 3-4. 환경변수 추가
```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

**예상 소요**: DEV-REQUEST 1건
**담당**: 클로드 코드

---

### STEP 4: Extension Pro 잠금 로직 (DEV-REQUEST)

**작업**: GitHub 관련 기능을 Pro 전용으로 잠금

#### 4-1. 플랜 체크 함수
```javascript
async function checkUserPlan() {
  const settings = await loadGitHubSettings();
  if (!settings.auth?.username) return 'free';

  try {
    const res = await fetch(
      `https://pinthat-auth.el-lee.workers.dev/check-plan?username=${settings.auth.username}`
    );
    const data = await res.json();
    // 캐시: 1시간 동안 재확인 안 함
    settings.plan = data.plan;
    settings.planCheckedAt = Date.now();
    await saveGitHubSettings(settings);
    return data.plan;
  } catch {
    return settings.plan || 'free'; // 오프라인이면 캐시 사용
  }
}
```

#### 4-2. 잠금 대상 기능
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

> GitHub 로그인 자체는 무료에서도 허용 (플랜 확인용)
> Issue 전송 버튼 클릭 시 Free이면 "Pro 업그레이드" 안내 모달 표시

#### 4-3. Pro 업그레이드 모달
```
┌──────────────────────────────┐
│  ⭐ PinThat Pro              │
│                               │
│  GitHub Issue 자동 전송은     │
│  Pro 기능입니다.              │
│                               │
│  ┌──────────┐ ┌──────────┐  │
│  │ $3/월    │ │ $10 영구  │  │
│  └──────────┘ └──────────┘  │
│                               │
│  [업그레이드]  [나중에]       │
└──────────────────────────────┘
```

클릭 시 → `pinthat.org/pricing?username=xxx`로 이동 또는 Stripe Checkout URL 직접 호출

**예상 소요**: DEV-REQUEST 1건
**담당**: 클로드 코드

---

### STEP 5: 랜딩페이지 결제 연동 (DEV-REQUEST)

**작업**: `landing/index.html`의 Pricing 섹션에 실제 결제 연결

- "무료로 시작하기" → Chrome 웹스토어 링크
- "Pro 시작하기" → Stripe Checkout 페이지 (Worker의 /create-checkout 호출)
- 결제 완료 페이지 (success.html) 추가
- URL 파라미터로 username 전달받아 Stripe metadata에 포함

**예상 소요**: DEV-REQUEST 1건
**담당**: 클로드 코드

---

### STEP 6: 테스트

- [ ] Stripe 테스트 모드에서 결제 플로우 확인
- [ ] 결제 완료 → KV에 Pro 저장 확인
- [ ] Extension에서 /check-plan → Pro 확인
- [ ] Free 유저 → GitHub Issue 전송 → "Pro 업그레이드" 모달 표시
- [ ] Pro 유저 → GitHub Issue 전송 → 정상 동작
- [ ] 오프라인 시 캐시된 플랜 정보로 동작
- [ ] Stripe Live 모드 전환 후 실결제 테스트

---

## 4. 실행 순서

| 순서 | 작업 | 담당 | 의존성 |
|------|------|------|--------|
| 1 | Stripe 계정 + 상품 등록 | 연진 | 없음 |
| 2 | Cloudflare KV 생성 | 연진 | 없음 |
| 3 | Worker 엔드포인트 추가 | 클로드 코드 | Step 1, 2 완료 |
| 4 | Extension Pro 잠금 | 클로드 코드 | Step 3 완료 |
| 5 | 랜딩페이지 결제 연결 | 클로드 코드 | Step 3 완료 |
| 6 | 테스트 (Stripe 테스트 모드) | 연진 | Step 4, 5 완료 |
| 7 | Stripe Live 전환 | 연진 | Step 6 통과 |

---

## 5. 보안 고려사항

- `STRIPE_SECRET_KEY`는 Worker Secrets에만 저장
- `STRIPE_WEBHOOK_SECRET`으로 Webhook 서명 검증 필수
- /check-plan은 누구나 호출 가능하지만, username만으로는 민감 정보 노출 없음
- /create-checkout은 유효한 priceId만 허용
- KV에 카드 정보 저장 절대 금지 (Stripe가 처리)

---

## 6. 파일 변경 예상

| 파일 | 변경 내용 |
|------|-----------|
| `worker/wrangler.toml` | KV namespace 바인딩 추가 |
| `worker/src/index.js` | /check-plan, /create-checkout, /stripe-webhook 추가 |
| `content-script.js` | checkUserPlan() + Pro 잠금 로직 + 업그레이드 모달 |
| `landing/index.html` | Pricing 버튼에 Stripe Checkout 연결 |
| **신규** `landing/success.html` | 결제 완료 페이지 |

---

## 7. 비용 예상

| 항목 | 비용 |
|------|------|
| Cloudflare Workers | 무료 (10만 요청/일) |
| Cloudflare KV | 무료 (10만 읽기/일, 1천 쓰기/일) |
| Stripe 수수료 | 2.9% + $0.30 per transaction |
| 도메인 (pinthat.org) | 연 ~$10 |
| **총 고정 비용** | **~$10/년** (도메인만) |
