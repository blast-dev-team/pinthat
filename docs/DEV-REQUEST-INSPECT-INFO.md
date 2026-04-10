# DEV-REQUEST: 요소 선택 시 디자인 정보 표시 (Figma Inspector 스타일)

- **작성일**: 2026-04-10
- **우선순위**: High
- **대상 파일**: `qa-tool-extension/content-script.js`

---

## 1. 요청 배경

현재 요소를 클릭하면 셀렉터 경로와 피드백 유형 버튼만 표시됨.
QA 검수 시 디자인 정보(크기, 패딩, 마진, 폰트, 색상 등)를 바로 확인할 수 있으면 개발자에게 정확한 피드백을 줄 수 있음.
Figma의 Inspect 패널처럼 요소의 디자인 속성을 시각적으로 보여주는 기능이 필요함.

---

## 2. 현재 코드 상태

이미 `captureElement()` (line ~215)에서 아래 정보를 수집하고 있음:

```javascript
// bbox (크기/위치)
bbox: { x, y, w, h }

// styles (getComputedProps)
styles: {
  color, fontSize, fontWeight,
  backgroundColor, padding, margin,
  display, position, border,
  lineHeight, textAlign
}
```

→ **데이터는 이미 있고, UI에 표시만 추가하면 됨**

---

## 3. 구현 목표

`showTypeSelectionPopup()` 에서 셀렉터 아래, 피드백 유형 버튼 위에 **접이식 디자인 정보 패널**을 추가한다.

---

## 4. 상세 스펙

### 4-1. getComputedProps() 확장

기존 수집 속성에 아래를 추가:

```javascript
function getComputedProps(el) {
  const cs = getComputedStyle(el);
  return {
    // 기존
    color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
    backgroundColor: cs.backgroundColor, padding: cs.padding, margin: cs.margin,
    display: cs.display, position: cs.position, border: cs.border,
    lineHeight: cs.lineHeight, textAlign: cs.textAlign,
    // 추가
    fontFamily: cs.fontFamily,
    borderRadius: cs.borderRadius,
    opacity: cs.opacity,
    gap: cs.gap,
    flexDirection: cs.flexDirection,
    justifyContent: cs.justifyContent,
    alignItems: cs.alignItems,
    overflow: cs.overflow,
    boxShadow: cs.boxShadow,
  };
}
```

### 4-2. captureElement() 확장

이미지 요소인 경우 추가 정보 수집:

```javascript
function captureElement(el) {
  // ... 기존 코드 ...
  const info = { /* 기존 필드들 */ };

  // 이미지 정보 추가
  if (el.tagName === 'IMG') {
    info.imgInfo = {
      src: el.src ? el.src.split('/').pop() : '', // 파일명만
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      alt: el.alt || '',
    };
  }

  // 배경 이미지 정보
  const bgImage = getComputedStyle(el).backgroundImage;
  if (bgImage && bgImage !== 'none') {
    info.bgImage = bgImage.replace(/url\(["']?/, '').replace(/["']?\)/, '').split('/').pop();
  }

  return info;
}
```

### 4-3. 디자인 정보 패널 UI

`showTypeSelectionPopup()` 내 popup.innerHTML에서 셀렉터 헤더와 피드백 유형 버튼 사이에 추가:

```html
<!-- 디자인 정보 패널 (접이식) -->
<div class="qa-feedback-inspect">
  <button class="qa-feedback-inspect-toggle" id="qaInspectToggle">
    📐 디자인 정보 <span class="qa-inspect-arrow">▼</span>
  </button>
  <div class="qa-feedback-inspect-body" id="qaInspectBody" style="display:none;">

    <!-- 크기 섹션 -->
    <div class="qa-inspect-section">
      <div class="qa-inspect-title">📏 크기</div>
      <div class="qa-inspect-grid">
        <span class="qa-inspect-label">W</span>
        <span class="qa-inspect-value">{bbox.w}px</span>
        <span class="qa-inspect-label">H</span>
        <span class="qa-inspect-value">{bbox.h}px</span>
      </div>
    </div>

    <!-- 여백 섹션 -->
    <div class="qa-inspect-section">
      <div class="qa-inspect-title">📦 여백</div>
      <div class="qa-inspect-box-model">
        <!-- Figma처럼 박스 모델 시각화 -->
        <div class="qa-inspect-margin-box">
          <div class="qa-inspect-margin-label">margin</div>
          <div class="qa-inspect-margin-values">
            <span class="top">{margin-top}</span>
            <span class="right">{margin-right}</span>
            <span class="bottom">{margin-bottom}</span>
            <span class="left">{margin-left}</span>
          </div>
          <div class="qa-inspect-padding-box">
            <div class="qa-inspect-padding-label">padding</div>
            <div class="qa-inspect-padding-values">
              <span class="top">{padding-top}</span>
              <span class="right">{padding-right}</span>
              <span class="bottom">{padding-bottom}</span>
              <span class="left">{padding-left}</span>
            </div>
            <div class="qa-inspect-content-box">
              {bbox.w} × {bbox.h}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 타이포그래피 섹션 (텍스트 요소일 때만) -->
    <div class="qa-inspect-section" id="qaInspectTypo">
      <div class="qa-inspect-title">🔤 타이포그래피</div>
      <div class="qa-inspect-rows">
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Font</span>
          <span class="qa-inspect-value">{fontFamily}</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Size</span>
          <span class="qa-inspect-value">{fontSize}</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Weight</span>
          <span class="qa-inspect-value">{fontWeight}</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Line-H</span>
          <span class="qa-inspect-value">{lineHeight}</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Color</span>
          <span class="qa-inspect-value">
            <span class="qa-inspect-color-swatch" style="background:{color}"></span>
            {color → hex 변환}
          </span>
        </div>
      </div>
    </div>

    <!-- 배경/테두리 섹션 -->
    <div class="qa-inspect-section">
      <div class="qa-inspect-title">🎨 스타일</div>
      <div class="qa-inspect-rows">
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Background</span>
          <span class="qa-inspect-value">
            <span class="qa-inspect-color-swatch" style="background:{backgroundColor}"></span>
            {backgroundColor → hex 변환}
          </span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Radius</span>
          <span class="qa-inspect-value">{borderRadius}</span>
        </div>
        <div class="qa-inspect-row" style="display:{border가 none이면 none}">
          <span class="qa-inspect-label">Border</span>
          <span class="qa-inspect-value">{border}</span>
        </div>
        <div class="qa-inspect-row" style="display:{boxShadow가 none이면 none}">
          <span class="qa-inspect-label">Shadow</span>
          <span class="qa-inspect-value">{boxShadow}</span>
        </div>
      </div>
    </div>

    <!-- 레이아웃 섹션 (flex/grid일 때만) -->
    <div class="qa-inspect-section" id="qaInspectLayout" style="display:{display가 flex/grid일 때만}">
      <div class="qa-inspect-title">📐 레이아웃</div>
      <div class="qa-inspect-rows">
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Display</span>
          <span class="qa-inspect-value">{display}</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Direction</span>
          <span class="qa-inspect-value">{flexDirection}</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Gap</span>
          <span class="qa-inspect-value">{gap}</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Justify</span>
          <span class="qa-inspect-value">{justifyContent}</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Align</span>
          <span class="qa-inspect-value">{alignItems}</span>
        </div>
      </div>
    </div>

    <!-- 이미지 정보 (img 태그일 때만) -->
    <div class="qa-inspect-section" id="qaInspectImg" style="display:{img일 때만}">
      <div class="qa-inspect-title">🖼️ 이미지</div>
      <div class="qa-inspect-rows">
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">File</span>
          <span class="qa-inspect-value">{파일명}</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Original</span>
          <span class="qa-inspect-value">{naturalWidth} × {naturalHeight}px</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Rendered</span>
          <span class="qa-inspect-value">{bbox.w} × {bbox.h}px</span>
        </div>
        <div class="qa-inspect-row">
          <span class="qa-inspect-label">Alt</span>
          <span class="qa-inspect-value">{alt text}</span>
        </div>
      </div>
    </div>

  </div>
</div>
```

### 4-4. 접이식 토글 동작

```javascript
qs('#qaInspectToggle', popup).onclick = () => {
  const body = qs('#qaInspectBody', popup);
  const arrow = qs('.qa-inspect-arrow', popup);
  if (body.style.display === 'none') {
    body.style.display = '';
    arrow.textContent = '▲';
  } else {
    body.style.display = 'none';
    arrow.textContent = '▼';
  }
};
```

### 4-5. RGB → HEX 변환 유틸 함수

```javascript
function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return 'transparent';
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return rgb;
  const hex = '#' + match.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  return hex.toUpperCase();
}
```

### 4-6. 값 클릭 시 복사 기능

각 `.qa-inspect-value`를 클릭하면 해당 값이 클립보드에 복사되도록:

```javascript
popup.querySelectorAll('.qa-inspect-value').forEach(el => {
  el.style.cursor = 'pointer';
  el.title = '클릭하여 복사';
  el.onclick = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(el.textContent.trim());
    showToast(t('toastCopied'));
  };
});
```

---

## 5. CSS 스타일 (네임스페이스 준수)

```css
.qa-feedback-inspect { margin: 8px 0; }
.qa-feedback-inspect-toggle {
  width: 100%; text-align: left; background: none; border: 1px solid #334155;
  border-radius: 6px; padding: 8px 12px; color: #94a3b8; font-size: 12px;
  cursor: pointer; display: flex; justify-content: space-between; align-items: center;
}
.qa-feedback-inspect-toggle:hover { background: #1e293b; }
.qa-feedback-inspect-body {
  border: 1px solid #334155; border-top: none; border-radius: 0 0 6px 6px;
  padding: 8px; background: #0f172a;
}
.qa-inspect-section { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #1e293b; }
.qa-inspect-section:last-child { margin-bottom: 0; border-bottom: none; }
.qa-inspect-title { font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
.qa-inspect-row { display: flex; justify-content: space-between; padding: 2px 0; }
.qa-inspect-label { font-size: 11px; color: #64748b; min-width: 80px; }
.qa-inspect-value { font-size: 11px; color: #e2e8f0; font-family: monospace; }
.qa-inspect-value:hover { color: #3b82f6; }
.qa-inspect-color-swatch {
  display: inline-block; width: 12px; height: 12px;
  border-radius: 2px; border: 1px solid #475569;
  vertical-align: middle; margin-right: 4px;
}
.qa-inspect-grid { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 4px; align-items: center; }

/* 박스 모델 시각화 */
.qa-inspect-margin-box {
  background: #fef3c7; border-radius: 4px; padding: 8px;
  position: relative; text-align: center; font-size: 10px;
}
.qa-inspect-padding-box {
  background: #d1fae5; border-radius: 4px; padding: 8px;
  text-align: center; font-size: 10px;
}
.qa-inspect-content-box {
  background: #bfdbfe; border-radius: 2px; padding: 6px;
  font-size: 11px; font-weight: 600; color: #1e3a5f;
}
.qa-inspect-margin-label, .qa-inspect-padding-label {
  font-size: 9px; color: #64748b; text-align: left; margin-bottom: 2px;
}
```

---

## 6. 구현 시 주의사항

- 접이식 기본 상태: **닫힘** (디자인 정보가 필요할 때만 열기)
- 타이포그래피 섹션: 텍스트가 없는 요소(img, div 등)는 숨기기
- 레이아웃 섹션: display가 flex/grid가 아니면 숨기기
- 이미지 섹션: img 태그가 아니면 숨기기
- margin/padding: 개별 값으로 파싱 (getComputedStyle은 개별 값 제공: marginTop, marginRight 등)
- 색상은 항상 HEX로 변환하여 표시 (개발자가 바로 사용 가능하도록)
- 값 클릭 → 복사 기능 필수 (개발자가 값을 바로 가져갈 수 있도록)

---

## 7. 검수 기준

- [ ] 요소 클릭 시 "📐 디자인 정보" 접이식 버튼이 보임
- [ ] 클릭하면 크기/여백/타이포/스타일/레이아웃 정보가 펼쳐짐
- [ ] 박스 모델(margin-padding-content)이 Figma처럼 색상 구분되어 표시됨
- [ ] 색상 값 옆에 컬러 스워치(작은 색상 사각형)가 표시됨
- [ ] 모든 색상이 HEX 형식으로 표시됨
- [ ] img 태그 선택 시 이미지 정보(파일명, 원본 크기, 렌더 크기, alt)가 보임
- [ ] flex/grid 요소 선택 시 레이아웃 정보가 보임
- [ ] 텍스트 없는 요소는 타이포그래피 섹션 숨김
- [ ] 값 클릭 시 클립보드에 복사됨
- [ ] 접이식 닫기/열기가 정상 동작함
