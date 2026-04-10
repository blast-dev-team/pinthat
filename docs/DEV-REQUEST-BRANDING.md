# DEV-REQUEST: PinThat 브랜딩 적용 + 이슈 아이콘 개선

> 요청일: 2026-03-31
> 요청자: 연진
> 우선순위: P1
> 예상 영향 범위: manifest.json, popup.html, content-script.js, icons/

---

## 배경

서비스명을 "QA Feedback Tool" → "PinThat"으로 변경하고, 새 로고 아이콘을 적용한다.
동시에 이슈 현황의 상태 아이콘을 더 직관적으로 변경한다.

---

## 수정 1: Extension 아이콘 교체

### 현재 상태
- `qa-tool-extension/icons/` 에 기본 아이콘 (16/48/128) 존재

### 변경 요청
- `asset/fabicon.png` (16x16) → `qa-tool-extension/icons/icon-16.png` 으로 복사/교체
- `asset/extension_icon.png` (48x48) → `qa-tool-extension/icons/icon-48.png` 으로 복사/교체
- `asset/chromeweb.png` (128x128) → `qa-tool-extension/icons/icon-128.png` 으로 복사/교체

### 검증
- Chrome 확장 프로그램 관리 페이지에서 PinThat 아이콘이 보이는지 확인
- 브라우저 툴바에서 16px 아이콘이 정상 표시되는지 확인

---

## 수정 2: 서비스명 변경 (QA Feedback Tool → PinThat)

### 2-1. manifest.json

```
변경 전:
  "name": "QA Feedback Tool",
  "description": "Visual QA feedback tool for web projects",

변경 후:
  "name": "PinThat",
  "description": "Pin it, remember it, share it — visual QA feedback tool",
```

### 2-2. popup.html (line 29)

```
변경 전:
  <h1>QA Feedback Tool</h1>

변경 후:
  <h1>PinThat</h1>
```

### 검증
- Extension 팝업 열었을 때 "PinThat" 표시 확인
- `chrome://extensions/` 에서 "PinThat" 이름 표시 확인

---

## 수정 3: 이슈 현황 상태 아이콘 변경

### 현재 상태 (content-script.js line 2393)
```javascript
const icon = isOpen ? '🟢' : '✅';
```
- Open(미해결) = 🟢 초록 원
- Closed(완료) = ✅ 초록 체크

### 변경 요청
```javascript
const icon = isOpen ? '🔴' : '✅';
```
- Open(미해결) = 🔴 빨간 원 — "아직 안 고쳤다" 느낌
- Closed(완료) = ✅ 초록 체크 — "해결됐다" 느낌 (유지)

### 검증
- 이슈 현황 모달에서 Open 이슈에 빨간 원, Closed 이슈에 초록 체크 표시 확인

---

## 수정 4: innerHTML 보안 개선 (경미)

### 현재 상태 (content-script.js line 2221)
```javascript
resultEl.innerHTML = `<span style="color:#22c55e;">✅ 연결 성공 — ${data.full_name} (${data.private ? '비공개' : '공개'})</span>`;
```
GitHub API 응답의 `full_name`을 innerHTML에 직접 삽입 중.

### 변경 요청
`data.full_name`을 HTML 이스케이프 처리 후 삽입:
```javascript
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 사용
resultEl.innerHTML = `<span style="color:#22c55e;">✅ 연결 성공 — ${escapeHtml(data.full_name)} (${data.private ? '비공개' : '공개'})</span>`;
```

### 검증
- GitHub 연결 테스트 시 레포명 정상 표시 확인

---

## 변경 파일 목록

| 파일 | 수정 내용 |
|------|-----------|
| `icons/icon-16.png` | PinThat 파비콘으로 교체 |
| `icons/icon-48.png` | PinThat 확장 아이콘으로 교체 |
| `icons/icon-128.png` | PinThat 웹스토어 아이콘으로 교체 |
| `manifest.json` | name, description 변경 |
| `popup.html` | 헤더 타이틀 변경 |
| `content-script.js` | 이슈 아이콘 변경 (line 2393) + innerHTML 보안 (line 2221) |

---

## 클로드 코드 실행 지시문

```
docs/DEV-REQUEST-BRANDING.md 읽고 실행해줘.

수정 순서:
1. asset/ 폴더의 아이콘 3개를 qa-tool-extension/icons/로 복사하여 교체
2. manifest.json의 name과 description 변경
3. popup.html의 타이틀 변경
4. content-script.js line 2393의 이슈 아이콘 변경 (🟢 → 🔴)
5. content-script.js에 escapeHtml 헬퍼 함수 추가 후 line 2221에 적용

완료 후 git commit.
```
