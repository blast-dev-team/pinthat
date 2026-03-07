# PRD: QA TOOL v2 — 파이프라인 고도화

> 버전: v2.1 | 최종 갱신: 2026-03-07
> 상태: ✅ 확정 (Phase 2 추가)

## 1. 개요

### 서비스 정의
브라우저에서 직접 UI 요소를 클릭/선택하여 시각적 QA 피드백을 남기고, 수정 요청 및 재검수까지 하나의 도구로 처리하는 로컬 QA 검수 도구.

### 사용자
비개발자 대표(연진) 1인 — 클로드 코드와 협업하여 웹 프로젝트를 개발하는 환경.

### 해결하려는 문제
현재 QA 파이프라인에서 수작업 단계가 너무 많아 비효율적임:
- 피드백 남긴 후 탭을 닫으면 데이터 소실 (sessionStorage 한계)
- 페이지별 피드백을 "세트"로 관리할 수 없음
- 수정 완료 후 재검수 시 이전 피드백 위치를 다시 찾아야 함 (다른 업무 불가)
- 네이티브 alert/confirm 팝업은 QA 도구로 캡처 불가
- DEV-REQUEST 형식으로 수동 정리 필요

---

## 2. 핵심 기능

| 기능 | 설명 | 우선순위 | 상태 |
|------|------|----------|------|
| F-1. 영속 저장 | sessionStorage → localStorage로 변경, 탭 닫아도 피드백 유지 | P0 | 신규 |
| F-2. 멀티페이지 세션 관리 | 페이지별 피드백을 "세트"로 묶어 저장/불러오기 | P0 | 신규 |
| F-3. 재검수 모드 | 저장된 세트를 불러와 같은 위치에 핀 재표시 + ✅수정됨/❌미수정 체크 | P0 | 신규 |
| F-4. alert/confirm 캡처 | window.alert/confirm을 override하여 내용 자동 기록 | P1 | 신규 |
| F-5. DEV-REQUEST 자동생성 | 피드백 마크다운 → DEV-REQUEST 템플릿 자동 매핑 | P1 | 신규 |
| F-6. 검수 리포트 생성 | 재검수 결과를 마크다운 리포트로 출력 | P1 | 신규 |
| 기존 13개 기능 | 요소/텍스트/영역 선택, 다중 선택, 단축키 등 | P0 | ✅ 구현완료 |

---

## 3. 화면 구성

| 화면 | 위치 | 설명 |
|------|------|------|
| QA 패널 | 우측 하단 플로팅 | 기존 패널 + 세션 관리 버튼 추가 |
| 세션 관리 패널 | QA 패널 내 서브메뉴 | 저장된 세트 목록, 불러오기/삭제 |
| 재검수 오버레이 | 페이지 위 | 이전 핀 위치에 ✅/❌ 체크 UI |
| 피드백 팝업 | 요소 근처 | 기존 유지 |
| 마크다운 출력 모달 | 화면 중앙 | 기존 + DEV-REQUEST 형식 출력 탭 추가 |

---

## 4. 데이터 모델

### localStorage 저장 구조
```
qa-sessions (키)
{
  sessions: [
    {
      id: "session-1709812345",
      name: "인플루언서 프로필 페이지",
      page: "/influencer/profile.html",
      createdAt: "2026-03-07T15:30:00",
      status: "open" | "reviewing" | "closed",
      feedbacks: [
        {
          id: 1,
          selector: "section.hero h1",
          section: "hero",
          tagName: "H1",
          textContent: "인플루언서 프로필",
          bbox: { x, y, w, h },
          feedback: "제목 폰트 크기 줄여야 함",
          fbType: "UI",
          reviewStatus: null | "fixed" | "not-fixed",
          reviewNote: ""
        }
      ]
    }
  ]
}
```

### alert 캡처 저장 구조
```
qa-alerts (키)
{
  alerts: [
    {
      type: "alert" | "confirm",
      message: "프로젝트 생성에 실패했습니다.",
      timestamp: "2026-03-07T15:31:00",
      page: "/influencer/profile.html",
      sessionId: "session-1709812345"
    }
  ]
}
```

---

## 5. 기술적 제약

- 순수 JS 단일 파일 유지 (외부 의존성 없음)
- IIFE 패턴, 전역 오염 없음
- CSS 네임스페이스: `.qa-feedback-`, `.qa-settings-`, `.qa-session-`
- z-index 범위: 99980~100000
- 백엔드/DB 없음 — localStorage만 사용
- 기존 qa-feedback.js 위에 확장 (파일 분리 또는 단일 파일 유지는 개발 시 판단)
- **디자인 시스템: 불필요** — 이 도구는 다른 프로젝트 위에 얹혀서 동작하는 오버레이 도구임. 자체 화면/서비스가 아니므로 디자인 시스템 구축 불필요. CSS 네임스페이스로 충돌 방지가 충분함. Phase 3에서 독립 대시보드를 만들 경우 재검토.

---

## 6. 비기능 요구사항

- 보안: 민감 데이터 저장 없음 (QA 피드백만 저장)
- 성능: localStorage 용량 제한(5MB) 내에서 동작, 오래된 세션 자동 정리
- 호환성: 모든 프로젝트에서 범용 사용 가능 (marketing-automation 외에도)
- 제거: 프로덕션 배포 시 `<script>` 태그 1줄만 삭제

---

## 7. 로드맵

| Phase | 내용 | 기능 | 상태 |
|-------|------|------|------|
| Phase 1 (MVP) | 핵심 파이프라인 (script 태그 버전) | F-1~F-3 + DEV-004~006 | ✅ 완료 |
| Phase 2 | Chrome Extension 전환 + 자동화 | Extension 리빌드 + F-4 alert 캡처 + F-5 DEV-REQUEST 자동생성 + F-6 검수 리포트 | 🟡 진행 예정 |
| Phase 3 (미래) | 팀용 전환 | Auth + DB + 팀 공유 + 유료화 (Firebase/Supabase 검토 시점) | 미정 |

### Phase 1 → Phase 2 분기 전략
- **Phase 1 (script 태그 버전)**: GitHub에 완성 상태로 유지 (https://github.com/Leeyeonjin2001/qa-tool). 추가 개발 없음.
- **Phase 2 (Chrome Extension)**: 별도 레포로 신규 개발. Phase 1의 기획/로직을 계승하되 Extension 구조로 리빌드. F-4~F-6 기능을 Extension에서 직접 구현.
- **전환 이유**: 모달 z-index 문제 근본 해결, script 태그 삽입 불필요, 모든 사이트에서 즉시 사용 가능, 파일 시스템 접근으로 DEV-REQUEST 자동 연동 가능

---

## 8. Phase 2 상세 — Chrome Extension + 자동화

### 8-1. Chrome Extension 구조

```
qa-tool-extension/
├── manifest.json          — Extension 설정 (Manifest V3)
├── content-script.js      — 대상 페이지에 주입되는 QA 도구 코드
├── popup.html / popup.js  — Extension 팝업 (ON/OFF, 세션 목록)
├── background.js          — 서비스 워커 (파일 시스템 연동 등)
├── styles.css             — QA 도구 스타일 (Shadow DOM 또는 네임스페이스)
└── icons/                 — Extension 아이콘
```

### 8-2. Extension 전환 시 해결되는 문제
| 기존 문제 | Extension에서의 해결 |
|-----------|---------------------|
| 모달 위 핀이 가려짐 (z-index) | Shadow DOM 또는 별도 레이어로 분리 |
| script 태그 수동 삽입 필요 | Extension 설치만으로 모든 사이트에서 동작 |
| alert/confirm 캡처 불안정 | content script에서 페이지 로드 전 override 주입 |
| DEV-REQUEST 수동 복사 | background script → 파일 시스템 or 클립보드 자동 포맷 |

### 8-3. F-4: alert/confirm 캡처
- content script에서 `window.alert`, `window.confirm`을 페이지 로드 전 override
- 호출 시 원본 메시지를 localStorage `qa-alerts`에 자동 기록
- QA 패널에 "🔔 캡처된 알림" 섹션 추가, 목록으로 표시
- 각 알림에 피드백 남기기 가능 (일반 피드백과 동일 형태)

### 8-4. F-5: DEV-REQUEST 자동 생성
- 마크다운 출력 시 "DEV-REQUEST 형식으로 출력" 옵션 추가
- DEV-REQUEST 템플릿에 자동 매핑:
  - 피드백 → 상세 스펙의 항목으로 변환
  - selector 정보 → 수정 위치로 변환
  - 피드백 타입 (UI/기능/텍스트) → 요청 카테고리로 변환
- 클립보드 복사 시 바로 클로드 코드에 붙여넣을 수 있는 형태

### 8-5. F-6: 검수 리포트 자동화
- 재검수 완료 시 생성되는 리포트를 확장:
  - 검수 통계 요약 (수정됨/미수정/요소 못 찾음 비율)
  - 페이지별 그룹핑 (멀티페이지 세션일 경우)
  - 이전 검수 이력 포함 (몇 차 재검수인지)
- 마크다운 + DEV-REQUEST 형식 동시 출력

---

## 9. 사용자 시나리오 (Phase 2 완료 후)

```
1. Chrome Extension 설치 → 아무 사이트에서 바로 사용 가능
2. 페이지 방문 → Extension 아이콘 클릭 → QA 모드 ON
3. 요소 3개에 피드백 + alert 발생 시 자동 캡처
4. "DEV-REQUEST 출력" → 클로드 코드에 바로 붙여넣기
5. 수정 완료 후 → "마크다운 가져오기" or "세션 재검수"
6. 재검수 리포트 → 검수 통계 + 미수정 항목 자동 정리
```

---

## 10. 사용자 시나리오 (Phase 1 완료 후)

```
1. 페이지A 열기 → Alt+Q → QA 모드 ON
2. 요소 3개에 피드백 남기기
3. "세션 저장" → "인플루언서 프로필 QA" 이름으로 저장
4. 탭 닫고 다른 업무 수행
5. 마크다운 출력 → 클로드 코드에 붙여넣기 → 수정 요청
6. 수정 완료 후 → 같은 페이지 열기
7. "재검수" → 저장된 세션 불러오기
8. 이전 피드백 3개 위치에 핀 자동 표시
9. 각 핀 확인 → ✅ 수정됨 / ❌ 미수정 체크
10. 재검수 리포트 출력
```
