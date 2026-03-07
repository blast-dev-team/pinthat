# 실행 계획: QA TOOL v2 — Phase 1

> 작성일: 2026-03-07
> PRD 참조: docs/PRD.md v2.0
> 대상: qa-feedback.js 확장 개발

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
