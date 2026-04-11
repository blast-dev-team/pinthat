import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { useStore } from '../../state/store';
import { useT } from '../../hooks/useT';
import {
  captureKeyConfig,
  DEFAULT_SHORTCUTS,
  keyLabel,
  SHORTCUT_ACTION_ORDER,
  type KeyConfig,
  type ShortcutAction,
} from '../../features/shortcuts';
import type { StringKey } from '../../../shared/i18n';

const ACTION_LABEL_KEYS: Record<ShortcutAction, StringKey> = {
  toggle: 'shortcutActionToggle',
  element: 'shortcutActionElement',
  export: 'shortcutActionExport',
  reset: 'shortcutActionReset',
};

export function ShortcutSettingsModal() {
  const current = useStore((s) => s.shortcuts);
  const setShortcuts = useStore((s) => s.setShortcuts);
  const setPopup = useStore((s) => s.setPopup);
  const t = useT();

  // Draft copy — edits only commit on Save.
  const [draft, setDraft] = useState(() => structuredClone(current));
  const [listeningFor, setListeningFor] = useState<ShortcutAction | null>(null);

  const close = () => setPopup(null);

  const save = () => {
    setShortcuts(draft);
    close();
  };

  const restore = () => {
    setDraft({ ...DEFAULT_SHORTCUTS });
  };

  // Key-capture: while listening, the next non-modifier key press sets the binding.
  // Uses capture phase + stopPropagation so it preempts everything else.
  useEffect(() => {
    if (!listeningFor) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setListeningFor(null);
        return;
      }
      const cfg = captureKeyConfig(e);
      if (!cfg) return; // bare modifier — keep listening
      setDraft((d) => ({ ...d, [listeningFor]: cfg }));
      setListeningFor(null);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [listeningFor]);

  return (
    <div
      className="qa-settings-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="qa-settings-modal">
        <div className="qa-settings-modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={16} strokeWidth={2} />
            {t('shortcutSettingsTitle')}
          </h3>
        </div>
        <div className="qa-settings-modal-body">
          {SHORTCUT_ACTION_ORDER.map((action) => {
            const cfg: KeyConfig = draft[action];
            const isListening = listeningFor === action;
            return (
              <div key={action} className="qa-settings-row">
                <span>{t(ACTION_LABEL_KEYS[action])}</span>
                <span className="qa-settings-key">{keyLabel(cfg)}</span>
                <button
                  className={`qa-settings-change${isListening ? ' listening' : ''}`}
                  onClick={() => setListeningFor(isListening ? null : action)}
                >
                  {isListening ? t('shortcutListening') : t('shortcutChange')}
                </button>
              </div>
            );
          })}
          <div className="qa-settings-hint">{t('shortcutHintAltQ')}</div>
        </div>
        <div className="qa-settings-modal-footer">
          <button className="qa-settings-btn-restore" onClick={restore}>
            {t('shortcutRestore')}
          </button>
          <button className="qa-settings-btn-close" onClick={close}>
            {t('close')}
          </button>
          <button className="qa-settings-btn-save" onClick={save}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
