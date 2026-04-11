import { useRef, type ComponentType } from 'react';
import {
  MousePointer2,
  List,
  Upload,
  Trash2,
  Settings,
  Globe,
  Move,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { useStore } from '../state/store';
import { useDraggable } from '../hooks/useDraggable';
import { useT } from '../hooks/useT';
import { keyLabel } from '../features/shortcuts';
import type { Lang } from '../../shared/i18n';

type IconComponent = ComponentType<LucideProps>;

/**
 * Main toolbar — horizontal floating island.
 * Icon-only buttons reveal their label as a tooltip on hover.
 * Language button reveals a dropdown on hover.
 */
export function Panel() {
  const active = useStore((s) => s.active);
  const feedbackCount = useStore((s) => s.feedbacks.length);
  const toggleActive = useStore((s) => s.toggleActive);
  const resetFeedbacks = useStore((s) => s.resetFeedbacks);
  const setPopup = useStore((s) => s.setPopup);
  const showToast = useStore((s) => s.showToast);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const shortcuts = useStore((s) => s.shortcuts);
  const t = useT();

  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  useDraggable(panelRef, handleRef);

  const onExport = () => {
    if (feedbackCount === 0) {
      showToast(t('noFeedback'));
      return;
    }
    setPopup({ kind: 'output' });
  };

  const onReset = () => {
    if (feedbackCount === 0) return;
    if (confirm(t('confirmReset', { n: feedbackCount }))) {
      resetFeedbacks();
    }
  };

  const onShowSelected = () => {
    setPopup({ kind: 'selected-list' });
  };

  const onShortcutSettings = () => {
    setPopup({ kind: 'shortcut-settings' });
  };

  type ToolBtn = {
    Icon: IconComponent;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    shortcut?: string;
    badge?: number;
  };

  const tooltipText = (b: ToolBtn) =>
    b.shortcut ? `${b.label} · ${b.shortcut}` : b.label;

  const renderBtn = (b: ToolBtn, key: string) => (
    <button
      key={key}
      className={`qa-tb-btn${b.active ? ' active' : ''}`}
      data-tooltip={tooltipText(b)}
      onClick={b.onClick}
      disabled={b.disabled}
    >
      <b.Icon size={16} strokeWidth={2} className="qa-tb-icon" />
      {b.badge != null && b.badge > 0 && (
        <span className="qa-tb-badge">{b.badge}</span>
      )}
    </button>
  );

  const groups: ToolBtn[][] = [
    [
      {
        Icon: MousePointer2,
        label: t('btnModeOn'),
        onClick: toggleActive,
        active,
        shortcut: keyLabel(shortcuts.toggle),
      },
      {
        Icon: List,
        label: t('btnSelectElement'),
        onClick: onShowSelected,
        shortcut: keyLabel(shortcuts.element),
        badge: feedbackCount,
      },
    ],
    [
      {
        Icon: Upload,
        label: t('btnExportMarkdown'),
        onClick: onExport,
        shortcut: keyLabel(shortcuts.export),
      },
      {
        Icon: Trash2,
        label: t('btnReset'),
        onClick: onReset,
        disabled: feedbackCount === 0,
        shortcut: keyLabel(shortcuts.reset),
      },
    ],
    [
      {
        Icon: Settings,
        label: t('btnShortcuts'),
        onClick: onShortcutSettings,
      },
    ],
  ];

  const langs: { code: Lang; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
  ];

  return (
    <div
      ref={panelRef}
      className="qa-feedback-panel qa-toolbar"
      style={{ bottom: 20, left: '50%', transform: 'translateX(-50%)' }}
    >
      <div ref={handleRef} className="qa-tb-handle" title={t('appName')}>
        <Move size={14} strokeWidth={2} className="qa-tb-grip" />
      </div>

      {groups.map((group, gi) => (
        <div key={gi} className="qa-tb-group">
          {group.map((b, bi) => renderBtn(b, `${gi}-${bi}`))}
          {gi < groups.length - 1 && <div className="qa-tb-sep" />}
        </div>
      ))}

      <div className="qa-tb-sep" />

      <div className="qa-tb-lang">
        <button
          className="qa-tb-btn"
          data-tooltip={t('langLabel')}
        >
          <Globe size={16} strokeWidth={2} className="qa-tb-icon" />
        </button>
        <div className="qa-tb-lang-menu">
          {langs.map((l) => (
            <button
              key={l.code}
              className={`qa-tb-lang-item${lang === l.code ? ' active' : ''}`}
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
