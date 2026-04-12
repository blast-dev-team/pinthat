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
    authSwitchToSignUp: "Don't have an account? Sign up",
    authSwitchToSignIn: 'Already have an account? Sign in',
    authSignedInAs: 'Signed in as',
    authLoginRequired: 'Login required',
    authLoginPrompt: 'Sign in to use PinThat.',
    authSignUpSuccess: 'Check your email for verification.',
    authConfigMissing: 'Supabase config missing. Check .env.local.',

    /* Paywall */
    paywallTitle: 'Lifetime access required',
    paywallDesc: 'Unlock all PinThat features permanently.',
    paywallPrice: '$10 USD · one-time',
    paywallBuyBtn: 'Buy Lifetime Access',
    paywallRefresh: 'Refresh after payment',
    paywallPaidBadge: 'Lifetime access active',

    /* Panel buttons */
    btnModeOn: 'Select',
    btnModeOff: 'Select',
    btnSelectElement: 'Selected Elements',
    btnSelectedListEmpty: 'No elements selected.',
    btnSelectedListTitle: 'Selected Elements',
    btnExportMarkdown: 'Export Prompt',
    btnImportMarkdown: 'Import Markdown',
    btnReset: 'Reset',
    btnGithub: 'GitHub Settings',
    btnSessionSave: 'Save Session',
    btnSessionLoad: 'Load Session',
    btnShortcuts: 'Shortcut Settings',
    langLabel: 'Language',

    /* Feedback type */
    selectType: 'Select feedback type',
    typeUI: 'UI',
    typeFeature: 'Feature',
    typeText: 'Text',
    typeMove: 'Move',
    typeSnapshot: 'Snapshot',

    /* Snapshot */
    snapshotTitle: 'Snapshot & Draw',
    snapshotSave: 'Save',
    snapshotClear: 'Clear',
    snapshotCapturing: 'Capturing...',

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
    moveSelectMethod: 'Select move method',
    moveComponent: 'Component Move',
    moveFree: 'Free Position Move',
    moveSelectDirection: 'Select direction',
    moveDirLeft: 'Left',
    moveDirRight: 'Right',
    moveDirUp: 'Up',
    moveDirDown: 'Down',
    moveMemoPlaceholder: 'Additional memo (optional)...',
    moveFreeMemoPlaceholder: 'e.g. Move below the sidebar',
    moveFreeMemoRequired: 'Free move requires a memo.',
    moveDragGuide: 'Drag to destination — from:',
    moveStart: 'Start',
    moveDest: 'Destination',
    moveAutoLabelComponent: 'Component Move',
    moveAutoLabelFree: 'Free Move',

    /* Output modal */
    outputTitle: 'Export Prompt ({n})',
    outputExportAll: 'All Combined',
    outputExportSingle: 'Single',
    outputClearAfterExport: 'Clear feedback after export',
    copyToClipboard: 'Copy to Clipboard',
    copied: 'Copied!',
    copyFailed: 'Copy failed',
    githubIssue: 'GitHub Issue',

    /* Claude Code integration */
    downloadMd: 'Download .md',
    downloadMdDone: 'Downloaded!',
    copyForClaude: 'Copy for Claude Code',
    promptWrapLabel: 'Wrap as Claude Code prompt',
    promptWrapPrefix: 'Fix the following QA issues on this page. Each item includes the CSS selector, current state, and what needs to change.\n\n',
    promptWrapSuffix: '\nApply these changes and confirm each fix.',

    /* Toasts / misc */
    noFeedback: 'No feedback yet.',
    confirmReset: 'Delete all {n} feedback items?',
    stubNotPorted: '{name}: React rewrite incomplete — see legacy',
    sessionComingSoon: 'Sessions: rewrite pending (see legacy)',

    /* Sessions */
    sessionSaveTitle: 'Save Session',
    sessionListTitle: 'Saved Sessions',
    sessionEmpty: 'No saved sessions.',
    sessionSaveDesc: 'Save {n} feedback items as a session.',
    sessionNamePlaceholder: 'Session name',
    sessionSaved: 'Session saved.',
    sessionLoaded: 'Session "{name}" loaded.',
    sessionDeleteConfirm: 'Delete session "{name}"?',
    sessionAutoCleanup: '{n} old sessions (30+ days) auto-deleted.',
    sessionLoadBtn: 'Load',
    sessionReviewBtn: 'Review',
    sessionItemsCount: '{n} items',
    noFeedbackToSave: 'No feedback to save.',
    reviewNotPorted: 'Review: rewrite incomplete — see legacy',

    /* Shortcuts */
    shortcutSettingsTitle: 'Shortcut Settings',
    shortcutActionToggle: 'Select ON/OFF',
    shortcutActionElement: 'View Selection',
    shortcutActionExport: 'Export Prompt',
    shortcutActionReset: 'Reset',
    shortcutChange: 'Change',
    shortcutListening: 'Press a key...',
    shortcutRestore: 'Restore Defaults',
    shortcutHintAltQ: 'The browser shortcut (Alt+Q) can be changed at chrome://extensions/shortcuts.',

    /* Markdown */
    mdTitle: 'QA Feedback',
    mdReviewDate: 'Review Date',
    mdPage: 'Page',
    mdTotal: 'Total Feedback',
    mdItems: 'items',
    mdElement: 'Element',
    mdCurrentText: 'Current Text',
    mdFeedback: 'Feedback',
    mdPosition: 'Position',
    mdMoveMethod: 'Move Method',
    mdDirection: 'Direction',
    mdMoveDest: 'Move Destination',
    mdMemo: 'Memo',
    mdMultiElements: 'Additional Elements',
    mdArea: 'Area',
    mdFooter: 'Paste this feedback into Claude Code to request fixes.',
    mdNear: 'near',
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
    authSwitchToSignUp: "Don't have an account? Sign up",
    authSwitchToSignIn: 'Already have an account? Sign in',
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
    typeSnapshot: 'Snapshot',

    /* Snapshot */
    snapshotTitle: 'Snapshot & Draw',
    snapshotSave: 'Save',
    snapshotClear: 'Clear',
    snapshotCapturing: 'Capturing...',

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
    outputExportAll: 'All Combined',
    outputExportSingle: 'Single',
    outputClearAfterExport: 'Clear feedback after export',
    copyToClipboard: 'Copy to Clipboard',
    copied: 'Copied!',
    copyFailed: 'Copy failed',
    githubIssue: 'GitHub Issue',

    /* Claude Code integration */
    downloadMd: 'Download .md',
    downloadMdDone: 'Downloaded!',
    copyForClaude: 'Copy for Claude Code',
    promptWrapLabel: 'Wrap as Claude Code prompt',
    promptWrapPrefix: 'Fix the following QA issues on this page. Each item includes the CSS selector, current state, and what needs to change.\n\n',
    promptWrapSuffix: '\nApply these changes and confirm each fix.',

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
    mdPage: 'Page',
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
