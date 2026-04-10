# DEV-REQUEST: 다국어 지원 (한국어/영어)

- **작성일**: 2026-04-01
- **우선순위**: Medium
- **대상 파일**: `qa-tool-extension/content-script.js`

---

## 1. 요청 배경

현재 content-script.js의 모든 UI 텍스트가 한국어로 하드코딩되어 있음.
PinThat을 글로벌 사용자도 쓸 수 있도록 한국어/영어 전환 기능을 추가한다.

---

## 2. 구현 목표

- 크롬 브라우저 언어 설정을 자동 감지하여 언어 초기값 설정
- 설정 모달에서 수동으로 언어 전환 가능
- 선택한 언어는 localStorage에 저장되어 재방문 시 유지

---

## 3. 상세 스펙

### 3-1. 언어 감지 우선순위

```
1순위: localStorage['pinthat_lang'] (사용자가 수동으로 설정한 값)
2순위: navigator.language (크롬 브라우저 언어 설정)
       - 'ko' 또는 'ko-KR'이면 → 한국어
       - 그 외 전부 → 영어
```

### 3-2. i18n 문자열 객체 추가

파일 최상단(IIFE 내부)에 아래 구조의 `STRINGS` 객체를 추가한다.

```javascript
const STRINGS = {
  ko: {
    // 패널 버튼
    btnFeedback: '피드백',
    btnSession: '세션',
    btnGithub: 'GitHub 설정',
    btnShortcut: '단축키 설정',
    btnTrialBadge: '체험 D-{n}',
    // 모달 공통
    cancel: '취소',
    save: '저장',
    close: '닫기',
    confirm: '확인',
    restore: '기본값 복원',
    delete: '삭제',
    load: '불러오기',
    review: '재검수',
    // GitHub 설정
    githubSettingsTitle: 'GitHub 설정',
    githubTokenLabel: 'GitHub 토큰',
    githubRepoLabel: '연결할 레포지토리',
    githubSaved: 'GitHub 설정이 저장되었습니다.',
    githubRequired: 'GitHub 설정이 필요합니다.',
    githubRequired2: 'GitHub 설정이 필요합니다. 🔗 GitHub 설정에서 연결하세요.',
    githubTokenExpired: '❌ 토큰이 만료되었습니다. GitHub 설정에서 토큰을 재설정하세요.',
    githubRepoNotFound: '❌ 레포를 찾을 수 없습니다. GitHub 설정을 확인하세요.',
    // 단축키 설정
    shortcutSettingsTitle: '단축키 설정',
    // 세션
    sessionNameTitle: '세션 이름',
    sessionListTitle: '세션 목록',
    sessionEmpty: '저장된 세션이 없습니다.',
    // 이슈 전송
    issueSendTitle: 'GitHub Issue 전송',
    issueSendConfirm: '전송',
    // 언어 설정
    languageLabel: '언어 (Language)',
    languageKo: '한국어',
    languageEn: 'English',
    // 로그인
    loginTitle: 'GitHub으로 로그인',
    loginDesc: 'PinThat을 사용하려면 GitHub 로그인이 필요합니다.',
    loginBtn: 'GitHub으로 로그인',
    // 체험/결제
    trialExpiredTitle: '체험 기간이 만료되었습니다',
    trialExpiredDesc: '계속 사용하려면 $8.98 Lifetime 라이선스를 구매하세요.',
    buyBtn: '$8.98 구매하기',
    // 토스트
    toastCopied: '복사되었습니다.',
    toastImported: '가져오기 완료.',
    toastNoFeedback: '피드백이 없습니다.',
  },
  en: {
    // 패널 버튼
    btnFeedback: 'Feedback',
    btnSession: 'Session',
    btnGithub: 'GitHub Settings',
    btnShortcut: 'Shortcuts',
    btnTrialBadge: 'Trial D-{n}',
    // 모달 공통
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    confirm: 'Confirm',
    restore: 'Restore Defaults',
    delete: 'Delete',
    load: 'Load',
    review: 'Re-review',
    // GitHub 설정
    githubSettingsTitle: 'GitHub Settings',
    githubTokenLabel: 'GitHub Token',
    githubRepoLabel: 'Repository',
    githubSaved: 'GitHub settings saved.',
    githubRequired: 'GitHub settings required.',
    githubRequired2: 'GitHub settings required. 🔗 Please connect in GitHub Settings.',
    githubTokenExpired: '❌ Token expired. Please reset your token in GitHub Settings.',
    githubRepoNotFound: '❌ Repository not found. Check your GitHub settings.',
    // 단축키 설정
    shortcutSettingsTitle: 'Shortcut Settings',
    // 세션
    sessionNameTitle: 'Session Name',
    sessionListTitle: 'Session List',
    sessionEmpty: 'No saved sessions.',
    // 이슈 전송
    issueSendTitle: 'Send GitHub Issue',
    issueSendConfirm: 'Send',
    // 언어 설정
    languageLabel: 'Language (언어)',
    languageKo: '한국어',
    languageEn: 'English',
    // 로그인
    loginTitle: 'Sign in with GitHub',
    loginDesc: 'GitHub login is required to use PinThat.',
    loginBtn: 'Sign in with GitHub',
    // 체험/결제
    trialExpiredTitle: 'Trial Expired',
    trialExpiredDesc: 'Purchase a $8.98 Lifetime License to continue.',
    buyBtn: 'Buy for $8.98',
    // 토스트
    toastCopied: 'Copied.',
    toastImported: 'Import complete.',
    toastNoFeedback: 'No feedback items.',
  }
};
```

### 3-3. 현재 언어 감지 함수 추가

```javascript
function detectLang() {
  const saved = localStorage.getItem('pinthat_lang');
  if (saved === 'ko' || saved === 'en') return saved;
  const browser = (navigator.language || 'en').toLowerCase();
  return browser.startsWith('ko') ? 'ko' : 'en';
}

let currentLang = detectLang();

function t(key, vars = {}) {
  let str = STRINGS[currentLang]?.[key] || STRINGS['en'][key] || key;
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replace(`{${k}}`, v);
  });
  return str;
}
```

### 3-4. 기존 하드코딩 텍스트를 t() 함수로 교체

아래 목록의 한국어 하드코딩 문자열을 전부 `t('키')` 호출로 교체한다.

| 기존 텍스트 | 교체 키 |
|-------------|---------|
| `'GitHub 설정'` (버튼) | `t('btnGithub')` |
| `'단축키 설정'` (버튼) | `t('btnShortcut')` |
| `'취소'` | `t('cancel')` |
| `'저장'` | `t('save')` |
| `'닫기'` | `t('close')` |
| `'삭제'` | `t('delete')` |
| `'불러오기'` | `t('load')` |
| `'재검수'` | `t('review')` |
| `'기본값 복원'` | `t('restore')` |
| `'전송'` (이슈) | `t('issueSendConfirm')` |
| `'GitHub 설정이 필요합니다.'` | `t('githubRequired')` |
| `'GitHub 설정이 저장되었습니다.'` | `t('githubSaved')` |
| `'❌ 토큰이 만료...'` | `t('githubTokenExpired')` |
| `'❌ 레포를 찾을 수 없습니다...'` | `t('githubRepoNotFound')` |
| `'저장된 세션이 없습니다.'` | `t('sessionEmpty')` |
| 체험 D-N 배지 | `t('btnTrialBadge', { n: daysLeft })` |

**※ 모달 타이틀(헤더 텍스트)도 동일하게 교체할 것**

### 3-5. 설정 모달에 언어 선택 항목 추가

기존 `qaSettingsToggle` (단축키 설정) 모달의 **맨 위**에 언어 선택 드롭다운을 추가한다.

```html
<!-- 언어 선택 UI (설정 모달 body 최상단) -->
<div class="qa-settings-row" style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
  <span class="qa-settings-label">{t('languageLabel')}</span>
  <select id="qaLangSelect" class="qa-settings-select">
    <option value="ko" {ko면 selected}>한국어</option>
    <option value="en" {en이면 selected}>English</option>
  </select>
</div>
```

설정 저장 버튼 클릭 시:
```javascript
const selectedLang = qs('#qaLangSelect', overlay).value;
if (selectedLang !== currentLang) {
  currentLang = selectedLang;
  localStorage.setItem('pinthat_lang', selectedLang);
  // 패널 전체를 리렌더링하여 언어 즉시 반영
  document.getElementById('qa-feedback-panel')?.remove();
  initPanel();
  showToast(selectedLang === 'ko' ? '언어가 한국어로 변경되었습니다.' : 'Language changed to English.');
}
```

---

## 4. 구현 시 주의사항

- `STRINGS` 객체는 IIFE 내부 최상단에 위치 (전역 오염 방지)
- `t()` 함수는 키가 없을 경우 영어 fallback → 그래도 없으면 키 이름 그대로 반환
- 언어 변경 시 패널 전체 리렌더링 필요 (이미 렌더된 DOM 텍스트가 바뀌지 않으므로)
- innerHTML 템플릿 리터럴 내 텍스트도 전부 `${t('키')}` 형태로 교체
- localStorage 키: `pinthat_lang` (기존 키와 충돌 없음)

---

## 5. 검수 기준

- [ ] 크롬이 한국어 설정일 때 → 패널 UI가 한국어로 표시됨
- [ ] 크롬이 영어(또는 기타) 설정일 때 → 패널 UI가 영어로 표시됨
- [ ] 설정 모달에서 언어 변경 후 저장 → 즉시 반영됨
- [ ] 페이지 새로고침 후에도 변경된 언어 유지됨
- [ ] 모든 토스트, 버튼, 모달 타이틀이 선택 언어로 표시됨
- [ ] GitHub 관련 에러 메시지도 선택 언어로 표시됨
