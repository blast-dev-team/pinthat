# DEV-REQUEST: 영역 선택(Area Select) 핀 위치 밀림 버그 수정

## 요약
영역 선택 후 다른 화면에 갔다가 돌아오면, 선택된 영역 오버레이와 핀 번호가 원래 위치에서 아래로 밀려 표시됨

## 유형
- [x] 버그 수정

## 우선순위
- [x] 높음 (핵심 기능 오작동)

---

## 현재 문제

### 원인
`onAreaUp()` (471행)에서 좌표를 `e.clientX`, `e.clientY`(뷰포트 기준)로 저장하지만,
`addAreaOverlay()` (651행)에서 복원할 때 `window.scrollX`, `window.scrollY`를 추가로 더해버림.

**저장 시점 (471~480행):**
```javascript
const x = Math.min(STATE.dragStart.x, e.clientX);  // ← 뷰포트 기준
const y = Math.min(STATE.dragStart.y, e.clientY);  // ← 뷰포트 기준
showFeedbackPopup(null, false, null, { x: Math.round(x), y: Math.round(y), ... });
```

**복원 시점 (651~654행):**
```javascript
ov.style.left = (rect.x + window.scrollX) + 'px';  // ← 스크롤 또 더함 = 이중 계산
ov.style.top = (rect.y + window.scrollY) + 'px';   // ← 스크롤 또 더함 = 이중 계산
```

### 재현 순서
1. 페이지를 중간쯤 스크롤
2. Area select로 영역 선택 → 피드백 저장
3. 다른 페이지로 이동했다가 돌아옴
4. 영역 오버레이가 원래 위치보다 아래로 밀려 있음

---

## 수정 방법

### 방법: 저장 시점에 document 기준 좌표로 변환 (권장)

**파일:** `qa-feedback.js`

**수정 1 — `onAreaUp()` (471~481행):**
저장할 때 스크롤 오프셋을 포함시켜서 document 기준 절대좌표로 저장

```javascript
function onAreaUp(e) {
  if (!STATE.dragStart) return;
  const x = Math.min(STATE.dragStart.x, e.clientX);
  const y = Math.min(STATE.dragStart.y, e.clientY);
  const w = Math.abs(e.clientX - STATE.dragStart.x);
  const h = Math.abs(e.clientY - STATE.dragStart.y);
  STATE.dragStart = null;
  areaBox.style.display = 'none';
  if (w > 10 && h > 10) {
    showFeedbackPopup(null, false, null, {
      x: Math.round(x + window.scrollX),   // ← scrollX 추가
      y: Math.round(y + window.scrollY),   // ← scrollY 추가
      w: Math.round(w),
      h: Math.round(h)
    });
  }
}
```

**수정 2 — `addAreaOverlay()` (651~654행):**
이미 document 기준이므로 스크롤 더하지 않음

```javascript
function addAreaOverlay(rect, id) {
  const ov = ce('div', 'qa-feedback-selected-overlay');
  ov.style.left = rect.x + 'px';       // ← scrollX 제거
  ov.style.top = rect.y + 'px';        // ← scrollY 제거
  // ... 나머지 동일
}
```

---

## 영향 범위
- `qa-feedback.js` 1개 파일, 2개 함수
- 기존 localStorage에 저장된 area 피드백은 뷰포트 기준 좌표라 복원 시 약간 밀릴 수 있음 (새로 만든 것부터 정상 동작)

## 검증 방법
1. 페이지 상단에서 영역 선택 → 저장 → 새로고침 → 같은 위치 확인
2. 페이지 중간에서 영역 선택 → 저장 → 다른 페이지 갔다가 돌아옴 → 같은 위치 확인
3. 페이지 하단에서 영역 선택 → 저장 → 스크롤 이동 후 확인
