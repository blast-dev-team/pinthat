# DEV-REQUEST: 위치이동 UX 개선 — 드래그앤드롭 + 화살표

- **작성일**: 2026-04-03
- **우선순위**: Medium
- **대상 파일**: `qa-tool-extension/content-script.js`

---

## 1. 문제

현재 "자유 위치 이동" 방식:
1. 출발 요소 클릭 → 핀(📍) 표시
2. 목적지를 따로 클릭 → 좌표만 기록

→ 핀 2개로는 "어디서 어디로"가 직관적으로 보이지 않음
→ 클릭 2번이 분리되어 있어 UX가 어색함

---

## 2. 목표

**드래그앤드롭으로 화살표를 그려서 이동 방향을 시각적으로 표현**

- 출발 요소에서 **드래그 시작** → 드래그하는 동안 **실시간 화살표** 표시
- 목적지에서 **드래그 끝** → 화살표 확정 + 메모 팝업 등장
- 저장 후에는 화살표가 피드백 항목으로 캔버스에 남음

---

## 3. 상세 스펙

### 3-1. 인터랙션 흐름 변경

**변경 전:**
```
요소 클릭 → 팝업에서 "자유 위치 이동" 선택 → 목적지 클릭 → 메모 팝업
```

**변경 후:**
```
요소 클릭 → 팝업에서 "위치 이동" 선택 → 요소 위에서 드래그 시작
→ 드래그 중: 실시간 화살표 SVG 렌더링
→ 드래그 끝: 화살표 확정 + 메모 팝업
→ 저장: 피드백 항목 등록 + 화살표 오버레이 유지
```

### 3-2. 드래그 중 화살표 렌더링

드래그하는 동안 SVG로 실시간 화살표를 그린다.

```javascript
// SVG 화살표 오버레이 (body에 append)
// 출발점: 출발 요소의 중심 좌표
// 도착점: 현재 마우스 위치 (실시간 업데이트)

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.classList.add('qa-feedback-arrow-svg');
svg.style.cssText = `
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  pointer-events: none;
  z-index: 99995;
`;
// SVG 내부: <defs><marker>(화살촉)</marker></defs> + <line>
```

**화살표 스타일:**
- 선 색상: `#f43f5e` (빨간색 — 눈에 잘 띄도록)
- 선 굵기: 2px
- 화살촉: SVG `<marker>` 로 끝에 삼각형 화살촉 추가
- 출발점: 작은 원(●) 표시
- 드래그 중 반투명(opacity: 0.7) → 저장 후 불투명(opacity: 1.0)

### 3-3. 드래그 종료 시 처리

mouseup 이벤트에서:
1. 최종 화살표 위치 확정
2. 메모 팝업 표시 (기존 팝업 UI 재사용)
3. 팝업에 출발/도착 정보 표시:
   - 출발: `selector` (예: `.hero-section > h1`)
   - 도착: 목적지 요소의 selector 또는 좌표

### 3-4. 저장 후 화살표 오버레이

피드백 저장 후 캔버스에 화살표가 남아야 함.

- 기존 `renderFeedbackOverlays()` 함수에서 `moveType: 'free'` 항목을 화살표로 렌더링
- 화살표 위에 번호 배지(①②③)도 표시
- 출발 요소 위에는 기존처럼 번호 배지 유지

### 3-5. feedback 데이터 구조 (변경 없음)

기존 구조 그대로 사용, `destX`/`destY` 활용:

```javascript
{
  type: '위치이동',
  moveType: 'free',
  selector: '출발 selector',
  destX: 1024,  // 목적지 X 좌표 (pageX)
  destY: 480,   // 목적지 Y 좌표 (pageY)
  memo: '사용자 메모',
  ...
}
```

---

## 4. CSS 추가 (네임스페이스 준수)

```css
/* 화살표 SVG 오버레이 */
.qa-feedback-arrow-svg { /* JS에서 인라인으로 처리 */ }

/* 출발 요소 하이라이트 (드래그 중) */
.qa-feedback-drag-source {
  outline: 2px dashed #f43f5e !important;
  outline-offset: 2px;
}
```

---

## 5. 삭제할 코드

- `addFreeMovMarker()` 함수 및 `.qa-feedback-move-marker` 관련 CSS — 핀 마커 불필요
- `enterFreeMoveMode()` 의 crosshair 커서 및 "목적지 클릭" 가이드 배너 제거

---

## 6. 검수 기준

- [ ] 요소 클릭 → "위치 이동" 선택 후 드래그하면 화살표가 실시간으로 그려짐
- [ ] 드래그를 놓으면 메모 팝업이 뜸
- [ ] 저장 후 화살표가 캔버스에 남아 있음
- [ ] 화살표 위에 번호 배지가 표시됨
- [ ] 기존 "컴포넌트 이동"(방향 버튼)은 변경 없이 유지됨
- [ ] ESC 또는 취소 시 화살표와 하이라이트가 모두 사라짐
