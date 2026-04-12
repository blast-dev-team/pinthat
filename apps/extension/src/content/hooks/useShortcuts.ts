import { useEffect } from 'react';
import { useStore } from '../state/store';
import { matchShortcut } from '../features/shortcuts';

/**
 * Document-level keydown listener for configurable shortcuts.
 *
 * Skipped when:
 * - Focus is in an <input>/<textarea>/<select>
 * - The shortcut-settings modal is open (so key-capture isn't fought by the global handler)
 *
 * Also handles Escape to close any open popup/modal.
 */
export function useShortcuts() {
  const shortcuts = useStore((s) => s.shortcuts);
  const active = useStore((s) => s.active);
  const popupKind = useStore((s) => s.popup?.kind ?? null);
  const toggleActive = useStore((s) => s.toggleActive);
  const setActive = useStore((s) => s.setActive);
  const setPopup = useStore((s) => s.setPopup);
  const resetFeedbacks = useStore((s) => s.resetFeedbacks);
  const feedbacks = useStore((s) => s.feedbacks);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape closes any open popup — even from inside input/textarea.
      if (e.key === 'Escape') {
        if (popupKind) {
          e.preventDefault();
          setPopup(null);
        }
        return;
      }

      // Don't steal keys from editable fields.
      const target = e.target as Element | null;
      const tag = (target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((target as HTMLElement | null)?.isContentEditable) return;

      // Don't fire shortcuts while the shortcut settings modal is open
      // or while a text-input popup is active.
      if (popupKind === 'shortcut-settings') return;
      if (popupKind === 'feedback-input' || popupKind === 'move-component-memo' || popupKind === 'move-free-memo' || popupKind === 'session-name' || popupKind === 'edit') return;

      if (matchShortcut(e, shortcuts.toggle)) {
        e.preventDefault();
        toggleActive();
        return;
      }

      if (matchShortcut(e, shortcuts.export)) {
        e.preventDefault();
        if (feedbacks.length > 0) setPopup({ kind: 'output' });
        return;
      }

      if (!active) return;

      if (matchShortcut(e, shortcuts.element)) {
        e.preventDefault();
        setActive(true);
        return;
      }

      if (matchShortcut(e, shortcuts.reset)) {
        e.preventDefault();
        if (feedbacks.length > 0 && confirm('Reset all feedback?')) {
          resetFeedbacks();
        }
        return;
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [
    shortcuts,
    active,
    popupKind,
    feedbacks.length,
    toggleActive,
    setActive,
    setPopup,
    resetFeedbacks,
  ]);
}
