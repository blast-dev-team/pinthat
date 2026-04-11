/**
 * Shortcut config + storage + matching utilities.
 * Stored in chrome.storage.local under 'qa-shortcuts'.
 */

export type ShortcutAction = 'toggle' | 'element' | 'export' | 'reset';

export interface KeyConfig {
  key: string; // single char (lowercased) or full key name like 'Escape'
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
}

export type ShortcutsConfig = Record<ShortcutAction, KeyConfig>;

export const DEFAULT_SHORTCUTS: ShortcutsConfig = {
  toggle: { alt: true, key: 'q' },
  element: { key: '1' },
  export: { key: 'e' },
  reset: { key: 'r' },
};

export const SHORTCUTS_STORAGE_KEY = 'qa-shortcuts';

export const SHORTCUT_ACTION_ORDER: ShortcutAction[] = [
  'toggle',
  'element',
  'export',
  'reset',
];

/** Legacy format tolerated strings like { toggle: 'q' }; normalize to full object. */
function normalizeKeyConfig(v: unknown): KeyConfig {
  if (typeof v === 'string') return { key: v };
  if (v && typeof v === 'object' && 'key' in v) return v as KeyConfig;
  return { key: '' };
}

export async function loadShortcutsFromStorage(): Promise<ShortcutsConfig> {
  try {
    const result = await chrome.storage.local.get(SHORTCUTS_STORAGE_KEY);
    const saved = result[SHORTCUTS_STORAGE_KEY];
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_SHORTCUTS };
    const merged: ShortcutsConfig = { ...DEFAULT_SHORTCUTS };
    (Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]).forEach((k) => {
      if (saved[k]) merged[k] = normalizeKeyConfig(saved[k]);
    });
    return merged;
  } catch {
    return { ...DEFAULT_SHORTCUTS };
  }
}

export async function saveShortcutsToStorage(shortcuts: ShortcutsConfig): Promise<void> {
  try {
    await chrome.storage.local.set({ [SHORTCUTS_STORAGE_KEY]: shortcuts });
  } catch {
    /* ignore */
  }
}

/** Human-readable label — "⌥Q", "⌘⇧E", etc. */
export function keyLabel(config: KeyConfig): string {
  let label = '';
  if (config.ctrl) label += '⌃';
  if (config.alt) label += '⌥';
  if (config.shift) label += '⇧';
  if (config.meta) label += '⌘';
  label += config.key.length === 1 ? config.key.toUpperCase() : config.key;
  return label;
}

/** Does a KeyboardEvent match the given shortcut config? */
export function matchShortcut(e: KeyboardEvent, config: KeyConfig): boolean {
  if (!config.key) return false;
  if (e.key.toLowerCase() !== config.key.toLowerCase()) return false;
  if (!!config.alt !== e.altKey) return false;
  if (!!config.ctrl !== e.ctrlKey) return false;
  if (!!config.shift !== e.shiftKey) return false;
  if (!!config.meta !== e.metaKey) return false;
  return true;
}

/** Capture a KeyboardEvent into a KeyConfig. Returns null for bare modifier keys. */
export function captureKeyConfig(e: KeyboardEvent): KeyConfig | null {
  if (['Alt', 'Control', 'Shift', 'Meta'].includes(e.key)) return null;
  const cfg: KeyConfig = { key: e.key.length === 1 ? e.key.toLowerCase() : e.key };
  if (e.altKey) cfg.alt = true;
  if (e.ctrlKey) cfg.ctrl = true;
  if (e.shiftKey) cfg.shift = true;
  if (e.metaKey) cfg.meta = true;
  return cfg;
}
