/**
 * Shared i18n used by both the content-script and the browser popup.
 * Persisted to chrome.storage.local under `pinthat_lang`.
 */

export type Lang = 'ko' | 'en';

export const LANG_STORAGE_KEY = 'pinthat_lang';

/* prettier-ignore */
export const STRINGS = {
  ko: {
    /* Brand / popup */
    appName: 'PinThat',
    popupModeLabel: 'QA 검수 모드',
    popupFeedbackCount: '피드백: {n}건',
    popupOpenSessions: '세션 목록 열기',
    popupShortcutHint: 'Alt+Q로 토글',

    /* Auth */
    authSignIn: '로그인',
    authSignUp: '회원가입',
    authSignOut: '로그아웃',
    authEmail: '이메일',
    authPassword: '비밀번호',
    authGoogle: 'Google로 계속하기',
    authSwitchToSignUp: '계정이 없으신가요? 회원가입',
    authSwitchToSignIn: '이미 계정이 있으신가요? 로그인',
    authOr: '또는',
    authSignedInAs: '로그인됨',
    authLoginRequired: '로그인이 필요합니다',
    authLoginPrompt: 'PinThat을 사용하려면 로그인하세요.',
    authSignUpSuccess: '인증 이메일을 확인하세요.',
    authConfigMissing: 'Supabase 설정이 없습니다. .env.local을 확인하세요.',

    /* Paywall */
    paywallTitle: '평생이용권이 필요합니다',
    paywallDesc: 'PinThat의 모든 기능을 영구적으로 사용하세요.',
    paywallPrice: '$10 USD · 1회 결제',
    paywallBuyBtn: '평생이용권 구매',
    paywallRefresh: '결제 후 상태 새로고침',
    paywallPaidBadge: '평생이용권 활성화됨',

    /* Panel buttons */
    btnModeOn: '선택',
    btnModeOff: '선택',
    btnSelectElement: '선택 요소',
    btnSelectedListEmpty: '선택된 요소가 없습니다.',
    btnSelectedListTitle: '선택 요소',
    btnExportMarkdown: '프롬프트 출력',
    btnImportMarkdown: '마크다운 가져오기',
    btnReset: '초기화',
    btnGithub: 'GitHub 설정',
    btnSessionSave: '세션 저장',
    btnSessionLoad: '세션 불러오기',
    btnShortcuts: '단축키 설정',
    langLabel: '언어',

    /* Feedback type */
    selectType: '피드백 유형 선택',
    typeUI: 'UI',
    typeFeature: '기능',
    typeText: '텍스트',
    typeMove: '위치 이동',

    /* Common actions */
    cancel: '취소',
    save: '저장',
    delete: '삭제',
    close: '닫기',
    confirm: '확인',

    /* Feedback input */
    feedbackPlaceholder: '피드백을 입력하세요...',

    /* Inspect panel */
    inspectTitle: '디자인 정보',
    inspectSize: '크기',
    inspectTypography: '타이포그래피',
    inspectStyle: '스타일',
    inspectLayout: '레이아웃',
    inspectImage: '이미지',

    /* Move mode */
    moveSelectMethod: '이동 방식 선택',
    moveComponent: '컴포넌트 이동',
    moveFree: '자유 위치 이동',
    moveSelectDirection: '이동 방향 선택',
    moveDirLeft: '왼쪽',
    moveDirRight: '오른쪽',
    moveDirUp: '위로',
    moveDirDown: '아래로',
    moveMemoPlaceholder: '추가 메모 (선택사항)...',
    moveFreeMemoPlaceholder: '예: 사이드바 아래로 옮겨주세요',
    moveFreeMemoRequired: '자유 이동은 메모를 입력해주세요.',
    moveDragGuide: '목적지로 드래그하세요 — 출발:',
    moveStart: '출발',
    moveDest: '목적지',
    moveAutoLabelComponent: '컴포넌트 이동',
    moveAutoLabelFree: '자유 이동',

    /* Output modal */
    outputTitle: '프롬프트 출력 ({n}건)',
    copyToClipboard: '클립보드 복사',
    copied: '복사 완료!',
    copyFailed: '복사 실패',
    githubIssue: 'GitHub Issue',

    /* Toasts / misc */
    noFeedback: '피드백이 없습니다.',
    confirmReset: '{n}건의 피드백을 모두 삭제하시겠습니까?',
    stubNotPorted: '{name}: React 리라이트 미완 — legacy 참조',
    sessionComingSoon: '세션 기능: 리라이트 예정 (legacy 참조)',

    /* Sessions */
    sessionSaveTitle: '세션 저장',
    sessionListTitle: '저장된 세션',
    sessionEmpty: '저장된 세션이 없습니다.',
    sessionSaveDesc: '피드백 {n}건을 세션으로 저장합니다.',
    sessionNamePlaceholder: '세션 이름',
    sessionSaved: '세션이 저장되었습니다.',
    sessionLoaded: '세션 "{name}"을(를) 불러왔습니다.',
    sessionDeleteConfirm: '"{name}" 세션을 삭제하시겠습니까?',
    sessionAutoCleanup: '{n}개의 오래된 세션(30일+)이 자동 삭제되었습니다.',
    sessionLoadBtn: '불러오기',
    sessionReviewBtn: '재검수',
    sessionItemsCount: '{n}건',
    noFeedbackToSave: '저장할 피드백이 없습니다.',
    reviewNotPorted: '재검수: 리라이트 미완 — legacy 참조',

    /* Shortcuts */
    shortcutSettingsTitle: '단축키 설정',
    shortcutActionToggle: '검수 ON/OFF',
    shortcutActionElement: '요소 선택',
    shortcutActionExport: '프롬프트 출력',
    shortcutActionReset: '초기화',
    shortcutChange: '변경',
    shortcutListening: '키 입력...',
    shortcutRestore: '기본값 복원',
    shortcutHintAltQ: '브라우저 단축키(Alt+Q)는 chrome://extensions/shortcuts 에서 변경할 수 있습니다.',

    /* Markdown */
    mdTitle: 'QA 피드백',
    mdReviewDate: '검수일',
    mdTotal: '총 피드백',
    mdItems: '건',
    mdElement: '요소',
    mdCurrentText: '현재 텍스트',
    mdFeedback: '피드백',
    mdPosition: '위치',
    mdMoveMethod: '이동 방식',
    mdDirection: '방향',
    mdMoveDest: '이동 목적지',
    mdMemo: '메모',
    mdMultiElements: '추가 선택 요소',
    mdArea: '영역',
    mdFooter: '이 피드백을 클로드 코드에 붙여넣어 수정을 요청하세요.',
    mdNear: '근처',
  },
  en: {
    /* Brand / popup */
    appName: 'PinThat',
    popupModeLabel: 'QA Review Mode',
    popupFeedbackCount: 'Feedback: {n}',
    popupOpenSessions: 'Open Session List',
    popupShortcutHint: 'Alt+Q to toggle',

    /* Auth */
    authSignIn: 'Sign in',
    authSignUp: 'Sign up',
    authSignOut: 'Sign out',
    authEmail: 'Email',
    authPassword: 'Password',
    authGoogle: 'Continue with Google',
    authSwitchToSignUp: "Don't have an account? Sign up",
    authSwitchToSignIn: 'Already have an account? Sign in',
    authOr: 'or',
    authSignedInAs: 'Signed in as',
    authLoginRequired: 'Login required',
    authLoginPrompt: 'Sign in to use PinThat.',
    authSignUpSuccess: 'Check your email to confirm.',
    authConfigMissing: 'Supabase not configured. Check .env.local.',

    /* Paywall */
    paywallTitle: 'Lifetime access required',
    paywallDesc: 'Unlock every PinThat feature, forever.',
    paywallPrice: '$10 USD · one-time',
    paywallBuyBtn: 'Buy lifetime access',
    paywallRefresh: 'Refresh after payment',
    paywallPaidBadge: 'Lifetime access active',

    /* Panel buttons */
    btnModeOn: 'Select',
    btnModeOff: 'Select',
    btnSelectElement: 'Selected Elements',
    btnSelectedListEmpty: 'No elements selected yet.',
    btnSelectedListTitle: 'Selected Elements',
    btnExportMarkdown: 'Export Prompt',
    btnImportMarkdown: 'Import Markdown',
    btnReset: 'Reset',
    btnGithub: 'GitHub Settings',
    btnSessionSave: 'Save Session',
    btnSessionLoad: 'Load Session',
    btnShortcuts: 'Shortcuts',
    langLabel: 'Language',

    /* Feedback type */
    selectType: 'Select Feedback Type',
    typeUI: 'UI',
    typeFeature: 'Feature',
    typeText: 'Text',
    typeMove: 'Move',

    /* Common actions */
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    close: 'Close',
    confirm: 'Confirm',

    /* Feedback input */
    feedbackPlaceholder: 'Enter your feedback...',

    /* Inspect panel */
    inspectTitle: 'Design Info',
    inspectSize: 'Size',
    inspectTypography: 'Typography',
    inspectStyle: 'Style',
    inspectLayout: 'Layout',
    inspectImage: 'Image',

    /* Move mode */
    moveSelectMethod: 'Select Move Method',
    moveComponent: 'Component Move',
    moveFree: 'Free Position Move',
    moveSelectDirection: 'Select Direction',
    moveDirLeft: 'Left',
    moveDirRight: 'Right',
    moveDirUp: 'Up',
    moveDirDown: 'Down',
    moveMemoPlaceholder: 'Additional note (optional)...',
    moveFreeMemoPlaceholder: 'e.g. Move to below the sidebar',
    moveFreeMemoRequired: 'A note is required for free move.',
    moveDragGuide: 'Drag to destination — from:',
    moveStart: 'From',
    moveDest: 'To',
    moveAutoLabelComponent: 'Component move',
    moveAutoLabelFree: 'Free move',

    /* Output modal */
    outputTitle: 'Prompt Export ({n} items)',
    copyToClipboard: 'Copy to Clipboard',
    copied: 'Copied!',
    copyFailed: 'Copy failed',
    githubIssue: 'GitHub Issue',

    /* Toasts / misc */
    noFeedback: 'No feedback yet.',
    confirmReset: 'Delete all {n} feedback items?',
    stubNotPorted: '{name}: not yet ported — see legacy file',
    sessionComingSoon: 'Sessions: rewrite pending (see legacy)',

    /* Sessions */
    sessionSaveTitle: 'Save Session',
    sessionListTitle: 'Saved Sessions',
    sessionEmpty: 'No saved sessions.',
    sessionSaveDesc: 'Save {n} feedback items as a session.',
    sessionNamePlaceholder: 'Session name',
    sessionSaved: 'Session saved.',
    sessionLoaded: 'Loaded session "{name}".',
    sessionDeleteConfirm: 'Delete session "{name}"?',
    sessionAutoCleanup: '{n} old sessions (30+ days) auto-deleted.',
    sessionLoadBtn: 'Load',
    sessionReviewBtn: 'Re-review',
    sessionItemsCount: '{n} items',
    noFeedbackToSave: 'No feedback to save.',
    reviewNotPorted: 'Re-review: not yet ported — see legacy',

    /* Shortcuts */
    shortcutSettingsTitle: 'Shortcut Settings',
    shortcutActionToggle: 'Toggle QA Mode',
    shortcutActionElement: 'Select Element',
    shortcutActionExport: 'Export Prompt',
    shortcutActionReset: 'Reset',
    shortcutChange: 'Change',
    shortcutListening: 'Press key...',
    shortcutRestore: 'Restore Defaults',
    shortcutHintAltQ: 'The browser-level Alt+Q shortcut can be changed at chrome://extensions/shortcuts.',

    /* Markdown */
    mdTitle: 'QA Feedback',
    mdReviewDate: 'Review date',
    mdTotal: 'Total feedback',
    mdItems: 'items',
    mdElement: 'Element',
    mdCurrentText: 'Current text',
    mdFeedback: 'Feedback',
    mdPosition: 'Position',
    mdMoveMethod: 'Move method',
    mdDirection: 'Direction',
    mdMoveDest: 'Destination',
    mdMemo: 'Note',
    mdMultiElements: 'Additional elements',
    mdArea: 'Area',
    mdFooter: 'Paste this feedback into Claude Code to request fixes.',
    mdNear: 'near',
  },
} satisfies Record<Lang, Record<string, string>>;

export type StringKey = keyof (typeof STRINGS)['ko'];

/** Simple {var} interpolation. */
export function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    str,
  );
}

export function t(key: StringKey, lang: Lang, vars?: Record<string, string | number>): string {
  const str = STRINGS[lang][key] ?? STRINGS.en[key] ?? (key as string);
  return interpolate(str, vars);
}

export function detectLangFromNavigator(): Lang {
  const browser = (navigator.language || 'en').toLowerCase();
  return browser.startsWith('ko') ? 'ko' : 'en';
}

export async function loadLangFromStorage(): Promise<Lang> {
  try {
    const res = await chrome.storage.local.get(LANG_STORAGE_KEY);
    const saved = res[LANG_STORAGE_KEY];
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return detectLangFromNavigator();
}

export async function saveLangToStorage(lang: Lang): Promise<void> {
  try {
    await chrome.storage.local.set({ [LANG_STORAGE_KEY]: lang });
  } catch {
    /* ignore */
  }
}
