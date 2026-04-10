# DEV-REQUEST: 비즈니스 모델 변경 — 로그인 필수 + 7일 체험 + 전체 잠금

> 요청일: 2026-03-31
> 요청자: 연진
> 우선순위: P0
> 예상 영향 범위: content-script.js, worker/src/index.js, landing/index.html

---

## 배경

기존 Free/Pro(기능별 잠금) 모델을 폐기하고, 새로운 비즈니스 모델로 전환한다.

### 기존 모델 (폐기)
- Free: 기본 QA 기능 무료 사용
- Pro: GitHub Issue 전송 등 유료 기능

### 새 모델
- **GitHub 로그인 필수** → 모든 유저 식별 가능
- **7일 무료 체험** → 로그인 즉시 시작, 모든 기능 사용 가능
- **체험 만료 후** → 전체 서비스 잠금, 결제해야 사용 가능
- **평생이용권 $8.98** (일회성 결제, 영구 사용)

---

## 수정 1: content-script.js — 로그인 게이트

### 1-1. 패널 열릴 때 로그인 체크

PinThat 패널이 열릴 때 GitHub 로그인 여부를 확인한다.

```
미로그인 상태:
┌──────────────────────────────┐
│  📌 PinThat                   │
│                               │
│  PinThat을 시작하려면         │
│  GitHub 로그인이 필요합니다.  │
│                               │
│  [🐙 GitHub로 로그인]         │
│                               │
└──────────────────────────────┘
```

- 로그인 전에는 QA 기능 메뉴 일체 표시하지 않음
- 로그인 성공 → 정상 패널 표시 + 체험/결제 상태 확인
- 로그인 상태는 기존 chrome.storage.local의 auth 객체로 판단

### 1-2. 체험/결제 상태 체크

로그인 후 `/check-plan` API를 호출하여 상태를 확인한다.

| 상태 | 동작 |
|------|------|
| plan: "trial" + 기간 남음 | 정상 사용 + "체험 D-N" 표시 |
| plan: "trial" + 기간 만료 | 전체 잠금 화면 |
| plan: "paid" | 정상 사용 (영구) |
| plan 없음 (첫 로그인) | Worker에서 자동 trial 생성 |

### 1-3. 체험 기간 표시

패널 상단 또는 하단에 체험 남은 일수를 표시한다.

```
체험 중:
┌──────────────────────────────┐
│  📌 PinThat     체험 D-5 🕐  │
│  ─────────────────────────── │
│  🔍 검수 모드 ON              │
│  ...                         │
└──────────────────────────────┘
```

- "체험 D-N" 형태로 남은 일수 표시
- D-1 이하가 되면 강조 표시 (빨간색 등)
- D-0 (만료일 당일)까지는 사용 가능

### 1-4. 체험 만료 화면

체험이 만료되면 전체 서비스를 잠그고 결제 안내를 표시한다.

```
만료 상태:
┌──────────────────────────────┐
│  📌 PinThat                   │
│                               │
│  무료 체험이 종료되었습니다.  │
│                               │
│  PinThat을 계속 사용하려면    │
│  평생이용권을 구매해주세요.   │
│                               │
│  ┌──────────────────────┐    │
│  │  💎 평생이용권 $8.98   │    │
│  │  한 번 결제, 영구 사용 │    │
│  └──────────────────────┘    │
│                               │
│  [구매하기]                   │
│                               │
│  @Leeyeonjin2001 로그인됨    │
└──────────────────────────────┘
```

- "구매하기" → Worker의 POST /create-checkout 호출 → Stripe Checkout
- 로그인된 username 하단에 표시 (누구로 구매하는지 확인용)

---

## 수정 2: content-script.js — 기존 Pro 잠금 로직 제거

### 제거할 것:
- `requirePro()` 함수 및 모든 호출부
- Pro 모달 (2단계 설명 + 플랜 카드)
- GitHub Issue 버튼의 "🔒 (Pro)" 표시
- GitHub 설정 패널의 "현재 플랜: Free / Pro" 배너
- Free일 때 레포 선택 숨기는 로직

### 변경할 것:
- `checkUserPlan()` → `checkUserStatus()` 로 이름 변경
- 반환값: `{ status: "login_required" | "trial" | "expired" | "paid", daysLeft: N }`
- 체험 중이거나 결제 유저면 → 모든 기능 동일하게 사용 가능
- GitHub 설정: 로그인만 되면 레포 선택 항상 표시 (잠금 없음)

---

## 수정 3: worker/src/index.js — /check-plan 응답 변경

### GET /check-plan?username=xxx 응답 변경

**첫 로그인 (KV에 데이터 없음):**
```json
// 자동으로 trial 생성 후 응답
{
  "plan": "trial",
  "trialStartedAt": "2026-03-31T12:00:00Z",
  "trialExpiresAt": "2026-04-07T12:00:00Z",
  "daysLeft": 7
}
```

**체험 중:**
```json
{
  "plan": "trial",
  "trialStartedAt": "2026-03-31T12:00:00Z",
  "trialExpiresAt": "2026-04-07T12:00:00Z",
  "daysLeft": 3
}
```

**체험 만료:**
```json
{
  "plan": "expired",
  "trialStartedAt": "2026-03-31T12:00:00Z",
  "trialExpiresAt": "2026-04-07T12:00:00Z",
  "daysLeft": 0
}
```

**결제 완료:**
```json
{
  "plan": "paid",
  "paidAt": "2026-04-01T...",
  "type": "lifetime"
}
```

### /check-plan 로직 변경

```javascript
// 1. KV에서 username 조회
// 2. 없으면 → trial 자동 생성 (7일 후 만료)
//    KV 저장: { plan: "trial", trialStartedAt, trialExpiresAt }
// 3. trial이면 → 만료 여부 확인
//    만료됐으면 plan: "expired" + daysLeft: 0
//    아니면 plan: "trial" + daysLeft 계산
// 4. paid면 → 그대로 반환
```

### KV 데이터 구조

```
Key: "Leeyeonjin2001"
Value: {
  "plan": "trial" | "paid",
  "trialStartedAt": "2026-03-31T12:00:00Z",
  "trialExpiresAt": "2026-04-07T12:00:00Z",
  // paid인 경우 추가:
  "paidAt": "2026-04-01T...",
  "type": "lifetime",
  "stripeCustomerId": "cus_xxx"
}
```

---

## 수정 4: worker/src/index.js — /create-checkout 변경

### 변경 사항:
- Monthly Price ID 제거 → Lifetime만 허용
- mode: "payment" 고정 (subscription 아님)

```javascript
const ALLOWED_PRICES = {
  'LIFETIME_PRICE_ID': 'lifetime'  // 새 Price ID로 교체 필요
};
```

> **주의**: Stripe에서 새 상품($8.98)을 만든 후 Price ID를 교체해야 함.
> 연진이 Stripe Dashboard에서 새 상품 등록 후 Price ID를 알려줄 예정.

---

## 수정 5: worker/src/index.js — /stripe-webhook 변경

### 변경 사항:
- 결제 완료 시 KV 업데이트:
  - 기존 trial 데이터 유지하면서 plan을 "paid"로 변경
  - paidAt, type, stripeCustomerId 추가

```javascript
// 기존 KV 데이터 읽기
const existing = await env.PLANS.get(username, 'json') || {};
// plan을 paid로 업데이트
const updated = {
  ...existing,
  plan: 'paid',
  type: 'lifetime',
  paidAt: new Date().toISOString(),
  stripeCustomerId: session.customer
};
await env.PLANS.put(username, JSON.stringify(updated));
```

---

## 수정 6: landing/index.html — Pricing 섹션 변경

### 변경:
- Free/Pro 2개 카드 → **단일 카드**로 변경
- "7일 무료 체험 → $8.98 평생이용권"
- 기존 Monthly 관련 UI 모두 제거

```
┌──────────────────────────────┐
│  💎 PinThat 평생이용권         │
│                               │
│  $8.98 (일회성 결제)           │
│                               │
│  ✅ 모든 QA 기능               │
│  ✅ GitHub Issue 자동 전송     │
│  ✅ 이슈 현황 추적             │
│  ✅ 영구 업데이트               │
│                               │
│  7일 무료 체험 후 구매         │
│                               │
│  [무료 체험 시작하기]          │
└──────────────────────────────┘
```

---

## Stripe 변경 사항 (연진 직접)

1. 기존 PinThat Pro Monthly ($4.98) → **Archive**
2. 기존 PinThat Pro Lifetime ($19.98) → **Archive**
3. 새 상품 생성: **PinThat Lifetime** — $8.98, One-off
4. 새 Price ID를 코드에 반영 (DEV-REQUEST 전달 시 포함)

---

## 검증 체크리스트

- [ ] 미로그인 → 로그인 화면만 표시
- [ ] 첫 로그인 → "7일 무료 체험 시작" + "체험 D-7" 표시
- [ ] 체험 중 → 모든 기능 정상 사용 (GitHub Issue 포함)
- [ ] /check-plan → trial + daysLeft 정상 응답
- [ ] 체험 만료 → 전체 잠금 + 결제 안내
- [ ] 결제 → Stripe Checkout → Webhook → KV "paid" 저장
- [ ] 결제 후 → 모든 기능 영구 사용
- [ ] 기존 Pro 잠금 로직 완전 제거됨
- [ ] 랜딩페이지 Pricing → 단일 카드 ($8.98)

---

## 변경 파일 목록

| 파일 | 수정 내용 |
|------|-----------|
| `content-script.js` | 로그인 게이트 + 체험 표시 + 만료 잠금 + Pro 잠금 제거 |
| `worker/src/index.js` | /check-plan 로직 변경 + /create-checkout Lifetime만 + /webhook 업데이트 |
| `landing/index.html` | Pricing 단일 카드 + 체험 안내 |

---

## 실행 순서

### Phase 1: 연진 (Stripe 상품 변경)
1. 기존 Monthly, Lifetime 상품 → Archive
2. 새 상품: PinThat Lifetime $8.98 (One-off) 생성
3. 새 Price ID 전달

### Phase 2: 클로드 코드 (Worker 변경)
1. /check-plan 로직 변경 (trial 자동 생성 + 만료 체크)
2. /create-checkout → Lifetime only
3. /stripe-webhook → trial → paid 업데이트
4. deploy + 테스트

### Phase 3: 클로드 코드 (Extension 변경)
1. 로그인 게이트 추가
2. 체험 D-N 표시
3. 만료 잠금 화면
4. 기존 Pro 잠금 로직 전체 제거

### Phase 4: 클로드 코드 (랜딩페이지)
1. Pricing 단일 카드
2. 체험 안내 문구

---

## 클로드 코드 실행 지시문

```
docs/DEV-REQUEST-TRIAL.md 읽고 실행해줘.

Phase 2부터 시작 (Stripe 상품 변경은 내가 직접 함):
1. Worker /check-plan 로직 변경 — 첫 로그인 시 trial 자동 생성, 만료 체크
2. /create-checkout → Lifetime Price ID만 허용
3. /stripe-webhook → paid 업데이트
4. deploy

Price ID는 이후 알려줄 예정. 일단 placeholder로 넣어줘.
완료 후 git commit.
```
