# 실행 계획: QA TOOL v2

> 작성일: 2026-03-07
> PRD 참조: docs/PRD.md v2.1
> Phase 1: qa-feedback.js 확장 개발 ✅ 완료
> Phase 2: Chrome Extension 전환 + F-4~F-6

---

## 1. 개발 범위 (Phase 1 — MVP)

| 순번 | 기능 ID | 기능명 | 의존 관계 |
|------|---------|--------|-----------|
| 1 | F-1 | 영속 저장 (sessionStorage → localStorage) | 없음 |
| 2 | F-2 | 멀티페이지 세션 관리 | F-1 이후 |
| 3 | F-3 | 재검수 모드 | F-2 이후 |

---

## 2. 단계별 상세

### Step 1: F-1 영속 저장

**목표**: 탭을 닫아도 피드백이 유지되도록 저장소 변경

**변경 사항**:
- `sessionStorage` → `localStorage`로 변경
- 저장 키: `qa-feedbacks-{pathname}` (기존 구조 유지)
- 기존 `saveFeedbacks()`, `restoreFeedbacks()` 함수의 storage API만 교체
- 단축키 저장은 이미 localStorage 사용 중 → 변경 없음

**영향 범위**:
- `STORAGE_KEY` 상수 (22행)
- `saveFeedbacks()` 함수 (24~35행)
- `restoreFeedbacks()` 함수 (37~61행)
- `resetAll()` 함수 (804~820행)

**테스트 방법**:
1. 데모 페이지에서 피드백 3개 남기기
2. 탭 닫기
3. 다시 열기 → 피드백 3개가 복원되는지 확인
4. 초기화 → localStorage에서 삭제되는지 확인

---

### Step 2: F-2 멀티페이지 세션 관리

**목표**: 피드백을 "세션(세트)"으로 묶어서 저장/불러오기

**신규 요소**:

1. **세션 데이터 구조**:
```javascript
// localStorage 키: 'qa-sessions'
{
  sessions: [
    {
      id: "session-{timestamp}",
      name: "사용자 지정 이름",
      page: location.pathname,
      url: location.href,
      createdAt: "ISO 날짜",
      status: "open",        // open | reviewing | closed
      feedbacks: [...],       // 기존 피드백 배열
      nextId: N
    }
  ],
  activeSessionId: null       // 현재 활성 세션
}
```

2. **QA 패널 UI 추가**:
```
[기존 패널 버튼들]
─────────────────
💾 세션 저장        ← 현재 피드백을 세션으로 저장
📂 세션 불러오기     ← 저장된 세션 목록에서 선택
```

3. **세션 저장 플로우**:
   - "세션 저장" 클릭 → 이름 입력 팝업 → localStorage에 저장
   - 기존 피드백 배열 전체를 세션 객체에 포함

4. **세션 불러오기 플로우**:
   - "세션 불러오기" 클릭 → 세션 목록 팝업 (이름, 날짜, 피드백 수 표시)
   - 선택 → 해당 페이지가 맞는지 확인 → 핀 복원

**영향 범위**:
- QA 패널 (`buildPanel()`) — 버튼 2개 추가
- 신규 함수: `saveSession()`, `loadSession()`, `showSessionList()`
- 신규 UI: 세션 저장 팝업, 세션 목록 팝업

**테스트 방법**:
1. 피드백 3개 남기기 → "세션 저장" → 이름 입력 → 저장
2. 초기화 → 피드백 전부 사라짐
3. "세션 불러오기" → 저장한 세션 선택 → 핀 3개 복원 확인
4. 탭 닫고 다시 열기 → "세션 불러오기" → 여전히 존재 확인

---

### Step 3: F-3 재검수 모드

**목표**: 저장된 세션의 피드백 위치에 핀을 다시 꽂고, 수정 여부를 체크

**신규 요소**:

1. **재검수 진입**:
   - 세션 불러오기 시 "재검수 모드"로 진입 가능
   - 세션 status를 "reviewing"으로 변경

2. **재검수 UI**:
```
기존 빨간 핀 (①②③) 대신:
┌─────────────────┐
│ ① [UI] 제목 폰트  │
│ ────────────────│
│ ✅ 수정됨         │  ← 클릭으로 토글
│ ❌ 미수정         │
│ 💬 메모 추가      │  ← 재검수 코멘트
└─────────────────┘
```

3. **핀 복원 로직**:
   - 저장된 `selector`로 DOM 요소 재검색 (`document.querySelector`)
   - 찾으면 → 해당 위치에 재검수 핀 표시
   - 못 찾으면 → "요소를 찾을 수 없음" 표시 (페이지 구조가 바뀐 경우)

4. **재검수 완료 후**:
   - 재검수 결과 마크다운 출력 (기존 출력 + ✅/❌ 상태 포함)
   - 세션 status를 "closed"로 변경

**영향 범위**:
- 신규 함수: `enterReviewMode()`, `showReviewPin()`, `toggleReviewStatus()`
- 마크다운 생성 (`generateMarkdown()`) — 재검수 상태 포함 출력 추가
- 세션 데이터에 `reviewStatus`, `reviewNote` 필드 추가

**테스트 방법**:
1. 세션 저장 (피드백 3개)
2. 초기화 → 수정 작업 시뮬레이션 (실제 텍스트 변경 등)
3. "세션 불러오기" → "재검수" 선택
4. 핀 3개 복원 확인
5. 각 핀에서 ✅/❌ 체크
6. 마크다운 출력 → 재검수 결과 포함 확인

---

## 3. 파일 구조

```
qa-feedback.js          ← 기존 파일 확장 (단일 파일 유지)
  ├── State             ← SESSION 관련 상태 추가
  ├── Session Storage   ← localStorage 기반으로 변경
  ├── Session Manager   ← 신규: 세션 CRUD
  ├── Review Mode       ← 신규: 재검수 로직
  ├── Helpers           ← 기존 유지
  ├── Panel UI          ← 버튼 2개 추가
  ├── Event Handlers    ← 기존 유지
  ├── Popup / Overlays  ← 재검수 핀 UI 추가
  ├── Markdown Output   ← 재검수 결과 출력 추가
  ├── Shortcut Config   ← 기존 유지
  └── Init              ← 세션 복원 로직 추가
```

---

## 4. 개발 순서 요약

```
[F-1] sessionStorage → localStorage 변경 (30분)
  ↓
[F-2] 세션 저장/불러오기 UI + 로직 (2~3시간)
  ↓
[F-3] 재검수 모드 UI + 로직 (2~3시간)
  ↓
[테스트] demo.html에서 전체 플로우 검증
```

---

## 5. 리스크 및 주의사항

| 리스크 | 대응 |
|--------|------|
| localStorage 5MB 제한 | 오래된 세션 자동 정리 (30일 이상) |
| selector로 요소 재검색 실패 | "요소를 찾을 수 없음" 안내 + 수동 재지정 가능 |
| 기존 기능 깨짐 | F-1 단계에서 기존 동작 유지 확인 필수 |
| 단일 파일 크기 증가 | 1,017줄 → 약 1,500~1,800줄 예상, 단일 파일 유지 |

---

## 6. 의도적 제외 사항

| 항목 | 판단 | 사유 |
|------|------|------|
| 디자인 시스템 | ❌ 불필요 | 다른 프로젝트 위에 얹히는 오버레이 도구이므로 자체 디자인 시스템 불필요. CSS 네임스페이스(`.qa-feedback-`, `.qa-settings-`, `.qa-session-`)로 충돌 방지가 충분함 |
| 백엔드/DB (Firebase 등) | ❌ 불필요 | 시나리오 1(로컬 1인 사용) 기준. 팀 공유 필요 시 Phase 3에서 재검토 |
| React/프레임워크 전환 | ❌ 불필요 | 순수 JS 단일 파일 유지가 범용성과 배포 편의성에 유리 |
| 별도 설정 파일 | ❌ 불필요 | 모든 설정은 localStorage에 저장. 외부 config 파일 없음 |

---
---

# Phase 2 실행 계획: Chrome Extension 전환 + 자동화

> 작성일: 2026-03-07
> PRD 참조: docs/PRD.md v2.1 (섹션 8)
> 대상: 별도 레포 (qa-tool-extension) 신규 개발
> 전제: Phase 1 (script 태그 버전) 완료, GitHub 유지

---

## 1. 개발 범위 (Phase 2)

| 순번 | 기능 ID | 기능명 | 의존 관계 |
|------|---------|--------|-----------|
| 1 | EXT-1 | Extension 기본 구조 세팅 | 없음 |
| 2 | EXT-2 | Phase 1 기능 이식 (DEV-001~006 로직) | EXT-1 이후 |
| 3 | F-4 | alert/confirm 캡처 | EXT-2 이후 |
| 4 | F-5 | DEV-REQUEST 자동 생성 | EXT-2 이후 |
| 5 | F-6 | 검수 리포트 자동화 | F-5 이후 |

---

## 2. 단계별 상세

### Step 1: EXT-1 Extension 기본 구조 세팅

**목표**: Manifest V3 기반 Chrome Extension 프로젝트 뼈대 구성

**산출물**:
```
qa-tool-extension/
├── manifest.json           — name, version, permissions, content_scripts
├── content-script.js       — 빈 IIFE (페이지에 주입될 코드)
├── popup.html              — Extension 팝업 UI 껍데기
├── popup.js                — 팝업 이벤트 핸들링
├── background.js           — 서비스 워커 (메시지 중계)
├── styles.css              — QA 도구 전용 스타일
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

**manifest.json 핵심 설정**:
- `manifest_version`: 3
- `permissions`: `["activeTab", "storage", "clipboardWrite"]`
- `content_scripts`: 모든 http/https 페이지에 content-script.js + styles.css 주입
- `action`: popup.html 연결

**테스트 방법**:
1. `chrome://extensions/` → "압축 해제된 확장 프로그램 로드" → 프로젝트 폴더 선택
2. 아무 웹사이트 방문 → Extension 아이콘 클릭 → 팝업 표시 확인
3. content-script.js가 페이지에 주입되는지 콘솔 확인

---

### Step 2: EXT-2 Phase 1 기능 이식

**목표**: qa-feedback.js의 Phase 1 로직을 Extension 구조에 이식

**이식 대상**:
- QA 패널 UI 생성 (content-script.js 안에서)
- 요소/텍스트/영역 선택 모드
- 피드백 팝업 + 마크다운 출력
- localStorage → `chrome.storage.local` 전환
- 세션 관리 (저장/불러오기/삭제)
- 재검수 모드 (진입/체크/완료/취소)
- 마크다운 가져오기 (역방향 복원)
- 단축키 설정

**주요 변경점**:
| Phase 1 (script 태그) | Phase 2 (Extension) |
|-----------------------|---------------------|
| `localStorage` | `chrome.storage.local` (비동기) |
| IIFE 즉시 실행 | content script로 주입 |
| `Alt+Q` 직접 바인딩 | `chrome.commands` API 활용 |
| 인라인 `<style>` 주입 | 별도 styles.css 파일 |
| 단일 파일 1825줄 | 모듈 분리 (content-script, popup, background) |

**스타일 충돌 방지 전략**:
- 기존 CSS 네임스페이스 유지 (`.qa-feedback-`, `.qa-settings-`)
- Shadow DOM 적용 검토 (Phase 3 대시보드 시 도입)

**테스트 방법**:
1. Extension 로드 → demo.html 방문 → QA 패널 표시 확인
2. Phase 1 전체 플로우 재테스트:
   - 핀 찍기 → 세션 저장 → 초기화 → 불러오기 → 복원
   - 재검수 → 체크 → 완료 → 리포트
   - 마크다운 가져오기 → 복원
3. 모달 위에서 핀 찍기 → **z-index 문제 해결 확인** (핵심!)
4. demo.html ↔ demo-projects.html 멀티페이지 세션 테스트

---

### Step 3: F-4 alert/confirm 캡처

**목표**: 네이티브 alert/confirm 호출을 가로채서 QA 도구에 자동 기록

**구현 방식**:
- content script에서 `document_start` 타이밍에 주입 (페이지 JS보다 먼저 실행)
- `window.alert`, `window.confirm` override
- 호출 시 원본 메시지 + 타임스탬프 + 페이지 정보를 `chrome.storage.local`의 `qa-alerts`에 저장

**QA 패널 UI 추가**:
```
[기존 패널 버튼들]
─────────────────
🔔 캡처된 알림 (3)    ← 새 버튼
```
- 클릭 시 알림 목록 팝업
- 각 알림에 "피드백 남기기" 버튼 → 일반 피드백과 동일 형태로 추가

**테스트 방법**:
1. demo.html에서 "새 프로젝트" 버튼 클릭 → alert 발생
2. QA 패널 → "캡처된 알림" → 알림 메시지 표시 확인
3. 알림에 피드백 남기기 → 마크다운 출력에 포함 확인

---

### Step 4: F-5 DEV-REQUEST 자동 생성

**목표**: 마크다운 출력 시 DEV-REQUEST 템플릿 형식으로 자동 변환

**구현 방식**:
- 마크다운 출력 모달에 **탭 2개**: "마크다운" | "DEV-REQUEST"
- DEV-REQUEST 탭 선택 시 자동 매핑:

```markdown
### BUG-XXX: [피드백타입] 피드백 요약
- **상태**: 📋 요청
- **요청일**: {오늘 날짜}
- **서비스 본질 연결**: (사용자 입력)
- **수정 위치**: `{selector}`
- **현재 상태**: {현재 텍스트/스타일 정보}
- **수정 내용**: {피드백 내용}
- **테스트 방법**: 해당 요소 확인
```

- 피드백 타입(UI/기능/텍스트) → 카테고리 자동 분류
- 클립보드 복사 → 클로드 코드에 바로 붙여넣기 가능

**테스트 방법**:
1. 피드백 3개 남기기 → 마크다운 출력
2. "DEV-REQUEST" 탭 클릭 → 템플릿 형식 확인
3. 클립보드 복사 → 실제 붙여넣기 해서 형식 확인

---

### Step 5: F-6 검수 리포트 자동화

**목표**: 재검수 완료 시 더 상세한 리포트 자동 생성

**기존 대비 추가 내용**:
- 검수 통계 요약 (수정됨 N건 / 미수정 N건 / 요소 못 찾음 N건 / 비율 %)
- 페이지별 그룹핑 (멀티페이지 세션일 경우)
- 이전 검수 이력 (몇 차 재검수인지, 이전 재검수일)
- 캡처된 알림 포함 (F-4 연동)
- DEV-REQUEST 형식 동시 출력 옵션 (F-5 연동)

**리포트 형식 확장**:
```markdown
# QA 재검수 리포트 — {페이지명}
> 검수 차수: 2차 재검수
> 원본 검수일: 2026-03-07 15:30
> 재검수일: 2026-03-07 18:00
> 결과 요약: ✅ 2건 수정됨 (67%) / ❌ 1건 미수정 (33%)

---
[기존 항목별 상세]

---
## 📊 통계
| 상태 | 건수 | 비율 |
|------|------|------|
| ✅ 수정됨 | 2 | 67% |
| ❌ 미수정 | 1 | 33% |
| ⚠️ 요소 못 찾음 | 0 | 0% |

## 🔔 캡처된 알림 (F-4)
- [alert] "프로젝트 생성 성공" — 15:31
```

**테스트 방법**:
1. 피드백 3개 세션 → 재검수 → 2건 수정, 1건 미수정
2. "재검수 완료" → 리포트에 통계 요약 포함 확인
3. DEV-REQUEST 형식 동시 출력 확인

---

## 3. 파일 구조

```
qa-tool-extension/
├── manifest.json           — Extension 설정 (Manifest V3)
├── content-script.js       — QA 도구 핵심 로직 (Phase 1 이식 + F-4~F-6)
│   ├── State               — 상태 관리
│   ├── Storage             — chrome.storage.local 기반
│   ├── Session Manager     — 세션 CRUD
│   ├── Review Mode         — 재검수 로직
│   ├── Alert Capture       — F-4: alert/confirm override
│   ├── DEV-REQUEST         — F-5: 자동 생성
│   ├── Report              — F-6: 리포트 자동화
│   ├── Panel UI            — QA 패널
│   ├── Popup / Overlays    — 피드백/재검수 팝업
│   ├── Markdown            — 출력 + 가져오기
│   └── Init                — 초기화
├── popup.html / popup.js   — Extension 팝업 (ON/OFF, 빠른 설정)
├── background.js           — 서비스 워커
├── styles.css              — QA 도구 전용 스타일
└── icons/                  — Extension 아이콘
```

---

## 4. 개발 순서 요약

```
[EXT-1] Extension 기본 구조 (1~2시간)
  ↓
[EXT-2] Phase 1 기능 이식 (4~6시간)
  ↓
[테스트] Phase 1 전체 기능 동작 확인 + 모달 z-index 해결 확인
  ↓
[F-4] alert/confirm 캡처 (1~2시간)
  ↓
[F-5] DEV-REQUEST 자동 생성 (2~3시간)
  ↓
[F-6] 검수 리포트 자동화 (1~2시간)
  ↓
[최종 테스트] 전체 플로우 검증
```

---

## 5. 리스크 및 주의사항

| 리스크 | 대응 |
|--------|------|
| chrome.storage.local은 비동기 | async/await 패턴으로 전환, 콜백 지옥 방지 |
| content script CSP 제한 | inline style 대신 styles.css 사용, eval 금지 |
| Manifest V3 서비스 워커 수명 | 필요 시 alarm API로 유지 |
| 기존 페이지 스타일 충돌 | CSS 네임스페이스 유지, Shadow DOM 검토 |
| alert override 타이밍 | document_start에서 주입하여 페이지 JS보다 먼저 실행 |
| chrome.storage.local 용량 (10MB) | localStorage(5MB)보다 여유, 하지만 오래된 세션 정리 유지 |

---

## 6. 의도적 제외 사항 (Phase 2)

| 항목 | 판단 | 사유 |
|------|------|------|
| Shadow DOM | ❌ 보류 | Phase 2에서는 CSS 네임스페이스로 충분. Phase 3 대시보드 시 도입 검토 |
| Chrome Web Store 배포 | ❌ 보류 | 개인 사용 단계에서는 "압축 해제된 확장 프로그램"으로 로드. 팀용 시 배포 |
| Auth / 백엔드 | ❌ 불필요 | Phase 3에서 팀용 전환 시 검토 |
| React / 프레임워크 | ❌ 불필요 | 순수 JS 유지. Extension도 간단한 구조라 프레임워크 불필요 |
