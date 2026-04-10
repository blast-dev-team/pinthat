# DEV-REQUEST: STEP 4 핫픽스 — 연결 필수화 + 이슈 리스트 + 토큰 가이드 개선

> 작성일: 2026-03-31
> 우선순위: 높음
> 대상 파일: `qa-tool-extension/content-script.js`

---

## 배경

STEP 4 GitHub 연동 테스트 중 발견된 3가지 개선 사항:
1. 잘못된 정보로도 저장이 되어버림 → 연결 테스트 필수화
2. 전송한 이슈 상태를 익스텐션에서 확인할 수 없음 → 이슈 리스트 UI
3. Fine-grained 토큰이 복잡함 → Classic PAT로 안내 변경 + 미니 가이드

---

## 수정 1: 저장 전 연결 테스트 필수화

### 1-1. 저장 버튼 비활성화 (기본 상태)

- GitHub 설정 모달이 열릴 때 **저장 버튼을 비활성화** 상태로 시작
- 스타일: `opacity: 0.5; cursor: not-allowed; pointer-events: none;`
- 연결 테스트 성공 시에만 저장 버튼 활성화

### 1-2. 연결 테스트 성공 상태 관리

- 모달 내부에 `connectionVerified` 플래그 추가 (기본값: `false`)
- 연결 테스트 성공 → `connectionVerified = true` → 저장 버튼 활성화
- 레포 입력값 또는 토큰 입력값이 변경되면 → `connectionVerified = false` → 저장 버튼 다시 비활성화

### 1-3. 저장 버튼 클릭 시 검증

- `connectionVerified === false`이면 `showToast('먼저 연결 테스트를 완료하세요.')`로 차단
- 이중 안전장치로 동작

### 1-4. 기존 매핑이 있는 경우

- 모달이 열릴 때 기존 저장된 값이 로드되면 → 저장 버튼은 여전히 비활성화
- 사유: 토큰이 만료되었거나 레포가 삭제되었을 수 있으므로, 매번 연결 테스트를 요구

---

## 수정 2: GitHub 이슈 리스트 UI (실시간 API 조회)

### 2-1. 패널에 "이슈 현황" 버튼 추가

- 패널 하단 GitHub 영역에 `📋 이슈 현황` 버튼 추가
- GitHub 설정이 저장된 사이트에서만 버튼 표시
- 설정이 없으면 버튼 숨김

### 2-2. 이슈 리스트 모달

- 클릭 시 모달 열림 → GitHub API로 `qa-feedback` 라벨 이슈를 실시간 조회
- API: `GET /repos/{owner}/{repo}/issues?labels=qa-feedback&state=all&per_page=20`
- 표시 항목:
  - 이슈 제목
  - 상태 아이콘: 🟢 Open / ✅ Closed
  - 생성일 (YYYY-MM-DD 형식)
  - 클릭 시 GitHub 이슈 페이지 새 탭으로 열기 (`window.open(issue.html_url, '_blank')`)

### 2-3. 이슈 리스트 모달 디자인

```
┌─────────────────────────────────────┐
│  📋 GitHub 이슈 현황 (5건)      [X] │
├─────────────────────────────────────┤
│ 🟢 [QA] index — 피드백 3건        │
│    2026-03-31                       │
├─────────────────────────────────────┤
│ ✅ [QA] admin — 피드백 5건         │
│    2026-03-30                       │
├─────────────────────────────────────┤
│ 🟢 [QA] login — 피드백 2건        │
│    2026-03-29                       │
├─────────────────────────────────────┤
│       이전 | 다음                   │
└─────────────────────────────────────┘
```

### 2-4. 로딩/에러 처리

- 조회 중: "이슈 불러오는 중..." 스피너 표시
- 이슈 없음: "아직 전송된 이슈가 없습니다." 메시지
- API 에러: "이슈를 불러올 수 없습니다. 설정을 확인하세요." 메시지
- 토큰 만료 시(401): "토큰이 만료되었습니다. 설정에서 재발급하세요." 메시지

---

## 수정 3: 토큰 발급 가이드 개선

### 3-1. "토큰 발급 방법" 링크 변경

- 기존: Fine-grained 토큰 생성 페이지
- 변경: Classic PAT 생성 페이지로 링크 변경
  - URL: `https://github.com/settings/tokens/new`

### 3-2. 안내 문구 변경

- 기존: `repo 또는 public_repo 권한만 필요합니다`
- 변경: `Classic 토큰 → repo 체크만 하세요`

### 3-3. 설정 모달에 미니 가이드 추가

- 토큰 입력란 아래에 접이식(토글) 가이드 추가
- 기본: 접힌 상태 → "❓ 토큰 발급이 처음이신가요?" 클릭 시 펼침
- 펼치면 3단계 표시:
  1. `① 위 링크를 클릭하세요`
  2. `② "repo" 체크박스 하나만 체크`
  3. `③ Generate token → 토큰 복사 → 여기에 붙여넣기`
- 스타일: 작은 폰트(11px), 연한 색상, 기존 UI 흐름 방해하지 않게

---

## 수정 위치 (content-script.js)

### 저장 버튼 초기 비활성화
- 설정 모달 HTML 내 저장 버튼에 `disabled` 속성 및 비활성 스타일 추가

### 연결 테스트 성공 시 (약 2185~2187행 부근)
```javascript
connectionVerified = true;
const saveBtn = qs('#qaGhSave', overlay);
saveBtn.style.opacity = '1';
saveBtn.style.cursor = 'pointer';
saveBtn.style.pointerEvents = 'auto';
```

### 입력값 변경 시 리셋
```javascript
qs('#qaGhRepo', overlay).addEventListener('input', () => {
  connectionVerified = false;
  // 저장 버튼 다시 비활성화
});
qs('#qaGhToken', overlay).addEventListener('input', () => {
  connectionVerified = false;
  // 저장 버튼 다시 비활성화
});
```

### 저장 로직 (약 2203행 부근)
```javascript
if (!connectionVerified) {
  showToast('먼저 연결 테스트를 완료하세요.');
  return;
}
```

### 이슈 리스트 조회 함수 (새로 추가)
```javascript
async function fetchGitHubIssues(owner, repo, token, state = 'all') {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?labels=qa-feedback&state=${state}&per_page=20`,
    { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

---

## 테스트 체크리스트

### 연결 테스트 필수화
- [ ] 모달 열기 → 저장 버튼이 비활성화 상태인지 확인
- [ ] 잘못된 정보 → 연결 테스트 실패 → 저장 버튼 여전히 비활성화
- [ ] 올바른 정보 → 연결 테스트 성공 → 저장 버튼 활성화
- [ ] 성공 후 레포명 수정 → 저장 버튼 다시 비활성화
- [ ] 성공 후 토큰 수정 → 저장 버튼 다시 비활성화

### 이슈 리스트
- [ ] GitHub 설정 없는 사이트 → 이슈 현황 버튼 안 보임
- [ ] 설정 있는 사이트 → 이슈 현황 버튼 보임
- [ ] 클릭 → 모달에 qa-feedback 라벨 이슈 목록 표시
- [ ] Open 이슈는 🟢, Closed 이슈는 ✅ 표시
- [ ] 이슈 항목 클릭 → GitHub 이슈 페이지 새 탭 열림
- [ ] 이슈 없는 레포 → "아직 전송된 이슈가 없습니다" 메시지

### 토큰 가이드
- [ ] "토큰 발급 방법" 링크 → Classic PAT 생성 페이지로 이동
- [ ] 안내 문구 "Classic 토큰 → repo 체크만 하세요" 표시
- [ ] "토큰 발급이 처음이신가요?" 토글 → 3단계 가이드 펼침/접힘

---

## 주의사항

- CSS 네임스페이스 규칙 준수 (`qa-feedback-`, `qa-settings-`, `qa-gh-` 접두사)
- z-index 범위: 99980~100000
- 이슈 리스트 모달도 기존 모달 스타일과 통일
- 기존 저장 로직(owner/repo 파싱, settings 저장 등)은 변경하지 않음
- GitHub API 호출 시 토큰은 절대 console.log 하지 않음
- 이슈 리스트 조회 실패 시 사용자에게 명확한 에러 메시지 표시
