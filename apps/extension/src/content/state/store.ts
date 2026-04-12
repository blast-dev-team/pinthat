import { create } from 'zustand';
import type { Feedback } from '../types';
import { detectLangFromNavigator, saveLangToStorage, type Lang } from '../../shared/i18n';
import {
  DEFAULT_SHORTCUTS,
  saveShortcutsToStorage,
  type ShortcutsConfig,
} from '../features/shortcuts';

/**
 * Active popup descriptor — which popup is currently open and its target element.
 * Using a discriminated union so each popup type carries only the data it needs.
 */
export type ActivePopup =
  | null
  | { kind: 'type-select'; targetEl: Element }
  | { kind: 'feedback-input'; targetEl: Element; fbType: 'UI' | '기능' | '텍스트' }
  | { kind: 'edit'; feedbackId: number }
  | { kind: 'output' }
  | { kind: 'move-sub'; targetEl: Element; pos?: { top: number; left: number } }
  | {
      kind: 'move-component-dir';
      targetEl: Element;
      pos?: { top: number; left: number };
    }
  | {
      kind: 'move-component-memo';
      targetEl: Element;
      direction: 'up' | 'down' | 'left' | 'right';
      pos?: { top: number; left: number };
    }
  | { kind: 'move-free-drag'; targetEl: Element }
  | {
      kind: 'move-free-memo';
      targetEl: Element;
      destX: number;
      destY: number;
      nearestSelector: string | null;
    }
  | { kind: 'session-name' }
  | { kind: 'session-list' }
  | { kind: 'shortcut-settings' }
  | { kind: 'selected-list' }
  | { kind: 'snapshot-draw'; targetEl: Element; imageDataUrl: string; bbox: { x: number; y: number; w: number; h: number } };

export interface Toast {
  id: number;
  message: string;
}

interface QaStore {
  /* Panel visibility — toggled from the browser popup */
  panelVisible: boolean;
  /* Selection mode — toggled from the Panel's Select button */
  active: boolean;
  /* Feedback collection */
  feedbacks: Feedback[];
  nextId: number;
  /* Panel UI */
  panelCollapsed: boolean;
  /* Active popup */
  popup: ActivePopup;
  /* Toasts */
  toasts: Toast[];
  /* Language */
  lang: Lang;
  /* Shortcuts */
  shortcuts: ShortcutsConfig;
  /* actions */
  setPanelVisible: (v: boolean) => void;
  togglePanelVisible: () => void;
  setActive: (v: boolean) => void;
  toggleActive: () => void;
  setPanelCollapsed: (v: boolean) => void;
  addFeedback: (fb: Omit<Feedback, 'id'>) => Feedback;
  updateFeedback: (id: number, patch: Partial<Feedback>) => void;
  removeFeedback: (id: number) => void;
  resetFeedbacks: () => void;
  setFeedbacksFromStorage: (feedbacks: Feedback[], nextId: number) => void;
  loadSession: (feedbacks: Feedback[], nextId: number) => void;
  setPopup: (p: ActivePopup) => void;
  showToast: (message: string) => void;
  dismissToast: (id: number) => void;
  setLang: (lang: Lang) => void;
  setShortcuts: (shortcuts: ShortcutsConfig) => void;
}

let toastIdSeq = 1;
/**
 * Debounce timestamp for toggleActive. Alt+Q can fire twice:
 * once via chrome.commands (background → message → toggleActive) and
 * once via the content-script keydown listener. The debounce swallows
 * the second call so they don't cancel out.
 */
let lastToggleTs = 0;

export const useStore = create<QaStore>((set, get) => ({
  panelVisible: false,
  active: false,
  feedbacks: [],
  nextId: 1,
  panelCollapsed: false,
  popup: null,
  toasts: [],
  lang: detectLangFromNavigator(),
  shortcuts: { ...DEFAULT_SHORTCUTS },

  setPanelVisible: (v) =>
    set((s) => ({ panelVisible: v, active: v ? s.active : false })),
  togglePanelVisible: () => {
    const now = Date.now();
    if (now - lastToggleTs < 250) return;
    lastToggleTs = now;
    set((s) => ({
      panelVisible: !s.panelVisible,
      // Hiding the panel also exits selection mode.
      active: !s.panelVisible ? s.active : false,
    }));
  },
  setActive: (v) => set({ active: v }),
  toggleActive: () => set((s) => ({ active: !s.active })),
  setPanelCollapsed: (v) => set({ panelCollapsed: v }),

  addFeedback: (fb) => {
    const id = get().nextId;
    const entry: Feedback = { ...fb, id, pageUrl: location.href };
    set((s) => ({ feedbacks: [...s.feedbacks, entry], nextId: s.nextId + 1 }));
    persistFeedbacks(get().feedbacks, get().nextId);
    return entry;
  },
  updateFeedback: (id, patch) => {
    set((s) => ({
      feedbacks: s.feedbacks.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
    persistFeedbacks(get().feedbacks, get().nextId);
  },
  removeFeedback: (id) => {
    set((s) => ({ feedbacks: s.feedbacks.filter((f) => f.id !== id) }));
    persistFeedbacks(get().feedbacks, get().nextId);
  },
  resetFeedbacks: () => {
    set({ feedbacks: [], nextId: 1 });
    persistFeedbacks([], 1);
  },
  setFeedbacksFromStorage: (feedbacks, nextId) => set({ feedbacks, nextId }),
  loadSession: (feedbacks, nextId) => {
    set({ feedbacks, nextId, popup: null });
    persistFeedbacks(feedbacks, nextId);
  },
  setPopup: (p) => set({ popup: p }),
  showToast: (message) => {
    const id = toastIdSeq++;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 2400);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setLang: (lang) => {
    if (get().lang === lang) return;
    set({ lang });
    void saveLangToStorage(lang);
  },
  setShortcuts: (shortcuts) => {
    set({ shortcuts });
    void saveShortcutsToStorage(shortcuts);
  },
}));

/* --- Chrome storage sync --- */

function currentStorageKey(): string {
  return 'qa-feedbacks-' + location.origin + location.pathname;
}

export async function loadFeedbacksFromStorage(): Promise<{ feedbacks: Feedback[]; nextId: number }> {
  try {
    const key = currentStorageKey();
    const result = await chrome.storage.local.get(key);
    const saved = result[key];
    if (!saved || !saved.feedbacks) return { feedbacks: [], nextId: 1 };
    return {
      feedbacks: saved.feedbacks as Feedback[],
      nextId: (saved.nextId as number) || saved.feedbacks.length + 1,
    };
  } catch {
    return { feedbacks: [], nextId: 1 };
  }
}

async function persistFeedbacks(feedbacks: Feedback[], nextId: number) {
  try {
    await chrome.storage.local.set({
      [currentStorageKey()]: { feedbacks, nextId },
    });
  } catch {
    /* ignore */
  }
}
