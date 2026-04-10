# DEV-REQUEST: file:// URL 지원 추가

- **작성일**: 2026-04-03
- **우선순위**: High
- **대상 파일**: `qa-tool-extension/manifest.json`

---

## 1. 문제

현재 manifest.json의 content_scripts matches가 아래와 같이 설정되어 있음:

```json
"matches": ["http://*/*", "https://*/*"]
```

→ `file:///Users/.../demo.html` 같은 로컬 HTML 파일에서는 익스텐션이 동작하지 않음.

PinThat은 로컬 개발 환경에서도 QA 검수를 해야 하는 도구이므로, `file://` URL 지원이 필수임.

---

## 2. 수정 사항

### manifest.json — content_scripts matches에 file:// 추가

**변경 전:**
```json
"content_scripts": [
  {
    "matches": ["http://*/*", "https://*/*"],
    ...
  }
]
```

**변경 후:**
```json
"content_scripts": [
  {
    "matches": ["http://*/*", "https://*/*", "file:///*"],
    ...
  }
]
```

---

## 3. 참고 사항

- `file://` URL 접근은 크롬 보안 정책상 manifest에 추가해도 **사용자가 최초 1회 허용**을 해줘야 함
- 크롬이 익스텐션 설치/업데이트 시 "파일 URL에 대한 액세스 허용" 권한을 요청하게 됨
- 사용자가 허용하면 이후 `file://` 페이지에서 자동으로 동작함
- 이건 크롬 보안 정책이라 코드로 우회 불가 — 사용자 허용 1회는 필수

---

## 4. 검수 기준

- [ ] `file:///Users/.../demo.html` 열었을 때 PinThat 패널이 표시됨
- [ ] `http://localhost:3000` 등 기존 환경에서도 정상 동작함
- [ ] `https://` 사이트에서도 정상 동작함
