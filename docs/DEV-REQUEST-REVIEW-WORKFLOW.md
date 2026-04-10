# DEV-REQUEST: 이슈 재검수 워크플로우

> 작성일: 2026-03-31
> 우선순위: 높음 (핵심 QA 사이클)
> 대상 파일: `qa-tool-extension/content-script.js`

---

## 배경

현재 이슈 현황 모달은 목록만 보여줄 뿐, 재검수 흐름이 없음.
QA의 핵심 사이클은: **피드백 전송 → 수정 확인(Closed) → 재검수 → 안 고쳐졌으면 재오픈**

---

## 수정 사항

### 1. 이슈 현황 모달 개선

기존: 이슈 제목 + 상태 아이콘만 표시
변경: 각 이슈 항목에 **액션 버튼** 추가

#### 1-1. Open 이슈 (🟢)
- 표시: 이슈 제목 + 생성일
- 버튼 없음 (아직 수정 중이므로 대기)
- 클릭 시: GitHub 이슈 페이지 새 탭

#### 1-2. Closed 이슈 (✅)
- 표시: 이슈 제목 + 생성일 + **[재검수]** 버튼
- **[재검수]** 클릭 시:
  1. 모달 닫힘
  2. 해당 이슈의 피드백 항목들을 오버레이로 다시 표시 (해당 페이지일 때만)
  3. 토스트: "Closed 이슈의 피드백을 확인하세요. 수정이 안 됐으면 '재전송'을 눌러주세요."
  4. 패널에 **[✅ 검수 완료]** + **[🔄 재전송]** 버튼 임시 표시

#### 1-3. 재검수 결과 처리
- **[✅ 검수 완료]** 클릭:
  - 토스트: "검수 완료 처리되었습니다."
  - 임시 버튼 제거
  - (GitHub 이슈는 Closed 상태 유지)

- **[🔄 재전송]** 클릭:
  - GitHub API로 해당 이슈 Reopen: `PATCH /repos/{owner}/{repo}/issues/{number}` → `{ "state": "open" }`
  - 코멘트 추가: `POST /repos/{owner}/{repo}/issues/{number}/comments` → `{ "body": "재검수 결과: 수정이 확인되지 않아 재오픈합니다." }`
  - 토스트: "이슈가 재오픈되었습니다."
  - 임시 버튼 제거

### 2. 이슈 현황 모달 디자인 업데이트

```
┌──────────────────────────────────────────────┐
│  📋 GitHub 이슈 현황 (3건)             [X]   │
│  [전체] [Open] [Closed]  ← 필터 탭           │
├──────────────────────────────────────────────┤
│ 🟢 [QA] index — 피드백 3건                   │
│    2026-03-31                    [GitHub ↗]   │
├──────────────────────────────────────────────┤
│ ✅ [QA] admin — 피드백 5건                    │
│    2026-03-30            [재검수] [GitHub ↗]  │
├──────────────────────────────────────────────┤
│ ✅ [QA] login — 피드백 2건                    │
│    2026-03-29            [재검수] [GitHub ↗]  │
└──────────────────────────────────────────────┘
```

### 3. 필터 탭

- **[전체]**: 모든 이슈 표시 (기본값)
- **[Open]**: Open 이슈만 필터
- **[Closed]**: Closed 이슈만 필터
- 선택된 탭은 하이라이트 스타일

### 4. 재검수 모드 시 패널 UI

재검수 버튼 클릭 후 패널에 임시 영역 표시:

```
┌─────────────────────┐
│  🔍 재검수 모드      │
│  [QA] index #3       │
│                      │
│  [✅ 검수 완료]      │
│  [🔄 재전송]         │
│  [취소]              │
└─────────────────────┘
```

- 취소 클릭 시: 재검수 모드 종료, 임시 UI 제거

---

## API 호출

### 이슈 Reopen
```javascript
await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ state: 'open' })
});
```

### 코멘트 추가
```javascript
await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ body: '재검수 결과: 수정이 확인되지 않아 재오픈합니다.' })
});
```

---

## 테스트 체크리스트

### 이슈 현황 모달
- [ ] 필터 탭 (전체/Open/Closed) 정상 동작
- [ ] Open 이슈: 재검수 버튼 없음, GitHub 링크만 표시
- [ ] Closed 이슈: [재검수] + [GitHub ↗] 버튼 표시
- [ ] 이슈 항목 클릭 → GitHub 새 탭

### 재검수 모드
- [ ] [재검수] 클릭 → 모달 닫힘 + 패널에 재검수 UI 표시
- [ ] 토스트 메시지 "Closed 이슈의 피드백을 확인하세요..." 표시
- [ ] [✅ 검수 완료] → 토스트 + 임시 UI 제거
- [ ] [🔄 재전송] → 이슈 Reopen + 코멘트 추가 + 토스트 + 임시 UI 제거
- [ ] [취소] → 재검수 모드 종료

### API 검증
- [ ] Reopen 후 GitHub에서 이슈 상태가 Open으로 변경
- [ ] 코멘트 "재검수 결과: 수정이 확인되지 않아 재오픈합니다." 추가됨
- [ ] 이슈 현황 새로고침 시 상태 반영

---

## 수정 5: GitHub 레포 입력 — URL과 owner/repo 둘 다 지원

### 배경
현재 레포 입력란은 `owner/repo` 형식만 지원.
사용자가 GitHub URL(`https://github.com/owner/repo`)을 그대로 붙여넣으면 에러 발생.

### 수정 내용
- 레포 입력값을 파싱할 때, URL 형식과 `owner/repo` 형식 둘 다 처리
- 파싱 로직:
  ```javascript
  function parseRepoInput(input) {
    input = input.trim();
    // URL 형식: https://github.com/owner/repo 또는 https://github.com/owner/repo/...
    const urlMatch = input.match(/github\.com\/([^\/]+)\/([^\/\s#?]+)/);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
    // owner/repo 형식
    const parts = input.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) return { owner: parts[0], repo: parts[1] };
    return null;
  }
  ```
- 이 함수를 연결 테스트, 저장, 이슈 생성 등 모든 레포 파싱 위치에 적용
- placeholder 변경: `owner/repo 또는 GitHub URL`

### 테스트 체크리스트
- [ ] `Leeyeonjin2001/0car` 입력 → 정상 동작
- [ ] `https://github.com/Leeyeonjin2001/0car` 입력 → 정상 동작
- [ ] `https://github.com/Leeyeonjin2001/0car/issues` 입력 → owner/repo만 추출하여 정상 동작
- [ ] 잘못된 입력 → 에러 메시지 표시

---

## 주의사항

- CSS 네임스페이스 규칙 준수
- z-index 범위: 99980~100000
- 재검수 모드는 한 번에 하나의 이슈만 가능
- 토큰은 절대 console.log 하지 않음
- API 실패 시 명확한 에러 메시지 표시
- 재검수 버튼은 현재 페이지와 이슈의 페이지가 일치할 때만 활성화 (다른 페이지 이슈는 [GitHub ↗]만 가능)
