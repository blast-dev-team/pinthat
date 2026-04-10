# DEV-REQUEST: 랜딩페이지 리라이트

> 요청일: 2026-04-01
> 대상 파일: `landing/index.html`
> 우선순위: 높음 (Phase 4 결제 연동과 함께 런칭 전 필수)
> 참고: `branding-hub/00-전략/세일즈-전략-PinThat.md` 섹션 13

---

## 배경

현재 랜딩페이지가 세일즈 전략과 맞지 않음.
- 타겟 메시지가 "개발자에게 전달" 앵글 (구 버전). 바이브코더 관점으로 교체 필요
- 가격이 $8.98인데 7일 무료 체험 구조가 명확하지 않음
- 한국어만 있음. 한국어 + 영어 양언어 지원 필요
- PAS(Problem-Agitate-Solve) 구조 없음

---

## 변경 사항

### 1. 한국어 + 영어 양언어 지원

- 언어 토글 버튼 추가 (header 우측, "KR / EN")
- 기본 언어: 브라우저 언어 감지 (navigator.language)
  - ko로 시작하면 한국어, 그 외 영어
- 구현 방식: 각 텍스트 요소에 `data-ko`, `data-en` 속성 사용하거나, JS로 언어별 텍스트 객체 관리
- 토글 클릭 시 모든 텍스트 즉시 전환 (페이지 리로드 없이)
- localStorage에 언어 선택 저장

### 2. 메타 태그 (영어 기본, 한국어 대체)

```html
<html lang="en">
<title>PinThat: Visual QA for Vibe Coders. Click Bugs, Create GitHub Issues.</title>
<meta name="description" content="Stop screenshotting bugs. PinThat turns browser clicks into GitHub Issues with exact selectors and coordinates. $8.98 forever. Built for vibe coders using Claude Code, Cursor, and AI coding tools.">
<meta name="og:title" content="PinThat: Click Bugs, Create GitHub Issues. $8.98 Forever.">
<meta name="og:description" content="Visual QA tool for vibe coders. Click any element, auto-create GitHub Issues with CSS selectors and coordinates.">
```

### 3. 히어로 섹션 리라이트 (PAS 공식)

**영어 버전:**
```
배지: Built by a vibe coder, for vibe coders
제목: Stop screenshotting bugs. Just click them.
설명: You found a bug while vibe coding. Now: screenshot it, describe the location, open GitHub, create an issue... for every single bug. PinThat does it in one click. With the exact selector, coordinates, and page path your AI needs to fix it.
CTA: Try Free for 7 Days
서브: 7-day free trial · All features · No credit card
```

**한국어 버전:**
```
배지: 바이브코더가 만든, 바이브코더를 위한 QA 도구
제목: 스크린샷 찍지 마세요. 그냥 클릭하세요.
설명: 바이브코딩으로 만든 페이지에서 버그 발견. 스크린샷 찍고, 위치 설명하고, GitHub 열어서 Issue 만들고... 버그마다 반복. PinThat은 클릭 한 번이면 됩니다. 셀렉터, 좌표, 페이지 경로까지 AI가 바로 이해할 수 있는 정보를 자동으로 잡아줍니다.
CTA: 7일 무료 체험 시작
서브: 7일 무료 체험 · 전체 기능 · 카드 불필요
```

### 4. 데모 GIF 영역 추가 (히어로와 Features 사이)

```html
<section class="demo">
  <div class="container" style="text-align:center;">
    <div style="max-width:720px;margin:0 auto;padding:40px;background:#1e293b;border:1px solid #334155;border-radius:16px;">
      <p style="color:#64748b;font-size:14px;">Demo GIF coming soon</p>
      <p style="color:#94a3b8;font-size:16px;margin-top:8px;" data-en="Click → Feedback → GitHub Issue in 10 seconds" data-ko="클릭 → 피드백 → GitHub Issue 10초면 끝">Click → Feedback → GitHub Issue in 10 seconds</p>
    </div>
  </div>
</section>
```

### 5. Features 섹션 리라이트

**영어:**
- 섹션 타이틀: "Why vibe coders need PinThat"
- 섹션 설명: "Telling AI 'move that button up' doesn't work. PinThat gives your AI the exact information it needs."

**한국어:**
- 섹션 타이틀: "바이브코더에게 PinThat이 필요한 이유"
- 섹션 설명: "AI한테 '그 버튼 위로 올려줘'라고 말해보세요. 못 알아듣습니다. PinThat은 AI가 정확히 이해하는 정보를 줍니다."

4개 카드:

**카드 1: 클릭으로 설명**
- EN 제목: "Click, Don't Describe"
- EN 설명: "Click any element. PinThat captures the CSS selector, bounding box, and page path automatically. No more vague descriptions."
- KO 제목: "설명 말고, 클릭"
- KO 설명: "요소를 클릭하면 CSS 셀렉터, 위치 좌표, 페이지 경로가 자동으로 잡힙니다. 더 이상 애매하게 설명할 필요 없어요."

**카드 2: GitHub Issue 자동 생성**
- EN 제목: "Auto GitHub Issues"
- EN 설명: "One click turns feedback into a GitHub Issue. Your AI coding tool (Claude Code, Cursor) can read it and fix it immediately."
- KO 제목: "GitHub Issue 자동 생성"
- KO 설명: "클릭 한 번으로 피드백이 GitHub Issue가 됩니다. 클로드 코드나 Cursor에서 바로 읽고 수정할 수 있어요."

**카드 3: 재검수**
- EN 제목: "Re-review Workflow"
- EN 설명: "AI said it's fixed? Check it visually. If not, PinThat reopens the issue with what's still wrong."
- KO 제목: "재검수 워크플로우"
- KO 설명: "AI가 고쳤다고요? 직접 확인하세요. 안 고쳐졌으면 PinThat이 이슈를 다시 열고 뭐가 문제인지 알려줍니다."

**카드 4: 마크다운**
- EN 제목: "Markdown Export"
- EN 설명: "Don't use GitHub? Copy feedback as structured markdown. Paste it into Claude Code, Cursor, or any AI tool."
- KO 제목: "마크다운 출력"
- KO 설명: "GitHub 안 쓰세요? 피드백을 마크다운으로 복사해서 클로드 코드나 Cursor에 붙여넣으세요."

### 6. How It Works 섹션

**영어:**
- 제목: "QA in 3 clicks"
- Step 1: "Install PinThat" / "Add the Chrome extension. Takes 10 seconds."
- Step 2: "Click the bug" / "Click any element. Choose feedback type. Add a note."
- Step 3: "GitHub Issue created" / "Sent with selector, coordinates, and page path. Your AI knows what to fix."

**한국어:**
- 제목: "3번 클릭이면 QA 끝"
- Step 1: "PinThat 설치" / "크롬 익스텐션 설치. 10초면 됩니다."
- Step 2: "버그 클릭" / "요소를 클릭하고, 피드백 유형 선택, 메모 입력."
- Step 3: "GitHub Issue 생성" / "셀렉터, 좌표, 페이지 경로와 함께 전송. AI가 정확히 알아듣습니다."

### 7. Pricing 섹션 전면 교체

**현재:** $8.98 평생이용권 카드 1개

**변경:** 7일 무료 체험 강조 + $8.98 평생이용권

**영어:**
```
뱃지: BEST VALUE
제목: PinThat Lifetime
가격: $8.98 (큰 글씨) USD
서브: One-time payment · Use forever
체험: 7-day free trial · All features unlocked · No credit card needed
기능 목록:
- Visual QA feedback (click any element)
- 4 feedback types (UI, Function, Text, Position)
- GitHub OAuth login
- Auto-create GitHub Issues
- Real-time issue tracking
- Re-review + auto Reopen workflow
- Markdown export
- Session save/load
- Custom keyboard shortcuts
- Unlimited repos
CTA: Start 7-Day Free Trial
```

**한국어:**
```
뱃지: 최고 가성비
제목: PinThat 평생이용권
가격: $8.98 (큰 글씨) USD
서브: 1회 결제 · 평생 사용
체험: 7일 무료 체험 · 전체 기능 · 카드 불필요
기능 목록:
- 시각적 QA 피드백 (요소 클릭)
- 4가지 피드백 유형 (UI, 기능, 텍스트, 위치이동)
- GitHub OAuth 로그인
- GitHub Issue 자동 생성
- 이슈 현황 실시간 추적
- 재검수 + Reopen 워크플로우
- 마크다운 출력
- 세션 저장/불러오기
- 단축키 설정
- 레포 무제한
CTA: 7일 무료 체험 시작
```

**가격 아래 경쟁사 비교 (양언어):**
- EN: "BugHerd: $504/year. Marker.io: $468/year. PinThat: $8.98. Forever."
- KO: "BugHerd: 연 $504. Marker.io: 연 $468. PinThat: $8.98. 평생."

### 8. Footer (양언어)

```
EN: © 2026 PinThat. All rights reserved. | Privacy | GitHub | Contact
KO: © 2026 PinThat. All rights reserved. | 개인정보처리방침 | GitHub | 문의
```

### 9. Stripe Checkout 스크립트 수정

- 기존 `startCheckout()` 로직 유지
- alert 메시지 양언어:
  - EN: "Please log in with GitHub through the PinThat extension first, then use the upgrade button inside the extension."
  - KO: "PinThat 익스텐션에서 GitHub 로그인 후, 익스텐션의 구매 버튼을 이용해주세요."
- 현재 선택된 언어에 맞는 메시지 표시

---

## 변경하지 않는 것

- HTML/CSS 전체 구조 (dark theme, 레이아웃)
- 스크롤 애니메이션 (IntersectionObserver)
- Stripe Checkout 로직 (URL 구조, Worker 연동)
- header/footer 기본 구조
- favicon, 로고
- 가격 ($8.98 유지)

---

## 검증 기준

- [ ] 언어 토글(KR/EN) 작동 확인: 클릭 시 모든 텍스트 전환
- [ ] 브라우저 언어 감지: ko면 한국어, 그 외 영어로 기본 표시
- [ ] localStorage에 언어 선택 저장/복원 확인
- [ ] 가격이 $8.98 평생이용권 + 7일 무료 체험으로 표시
- [ ] 히어로가 PAS 구조(문제 → 자극 → 해결)인지 확인
- [ ] 경쟁사 가격 비교 문구 있는지 확인
- [ ] meta title/description에 "vibe coding", "GitHub Issues" 키워드 포함
- [ ] 모바일 반응형 유지
- [ ] 데모 GIF placeholder 영역 존재
- [ ] Stripe alert 메시지가 현재 언어에 맞게 표시
