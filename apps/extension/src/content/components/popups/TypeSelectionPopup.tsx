import { useEffect, useMemo, useRef, useState } from 'react';
import { Palette, Cog, Type, Move3d } from 'lucide-react';
import { useStore } from '../../state/store';
import { useDraggable } from '../../hooks/useDraggable';
import { useT } from '../../hooks/useT';
import { captureElement, rgbToHex } from '../../utils/dom';
import { DesignInspector } from './DesignInspector';
import type { StringKey } from '../../../shared/i18n';

interface Props {
  targetEl: Element;
}

type InlineType = 'UI' | '기능' | '텍스트';

const TYPE_LABEL_KEYS: Record<InlineType, StringKey> = {
  UI: 'typeUI',
  기능: 'typeFeature',
  텍스트: 'typeText',
};

const POPUP_WIDTH = 310;

export function TypeSelectionPopup({ targetEl }: Props) {
  const setPopup = useStore((s) => s.setPopup);
  const addFeedback = useStore((s) => s.addFeedback);
  const t = useT();
  const info = useMemo(() => captureElement(targetEl), [targetEl]);

  const popupRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useDraggable(popupRef, handleRef);

  // Initial position: below the target, clamped to viewport.
  const initial = useMemo(() => {
    const r = targetEl.getBoundingClientRect();
    const top = Math.max(10, Math.min(r.bottom + 10, window.innerHeight - 300));
    const left = Math.max(10, Math.min(r.left, window.innerWidth - POPUP_WIDTH));
    return { top, left };
  }, [targetEl]);

  const [inspectOpen, setInspectOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<InlineType | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState(false);

  // Focus the textarea once a type is picked so the user can start typing.
  useEffect(() => {
    if (selectedType) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [selectedType]);

  const choose = (fbType: InlineType | '위치이동', e?: React.MouseEvent) => {
    if (fbType === '위치이동') {
      const pos = e
        ? { top: Math.max(10, e.clientY - 20), left: Math.max(10, e.clientX - 20) }
        : undefined;
      setPopup({ kind: 'move-sub', targetEl, pos });
      return;
    }
    setSelectedType(fbType);
    if (error) setError(false);
  };

  const save = () => {
    if (!selectedType) return;
    const trimmed = text.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    addFeedback({
      ...info,
      feedback: trimmed,
      fbType: selectedType,
      moveTarget: null,
    });
    setPopup(null);
  };

  const typeBtn = (
    type: InlineType | '위치이동',
    label: string,
    Icon: typeof Palette,
  ) => (
    <button
      className={`qa-feedback-type-btn${selectedType === type ? ' active' : ''}`}
      data-tooltip={label}
      aria-label={label}
      onClick={(e) => choose(type, e)}
    >
      <Icon size={18} strokeWidth={2} />
    </button>
  );

  return (
    <div
      ref={popupRef}
      className="qa-feedback-popup"
      style={{ top: initial.top, left: initial.left, width: POPUP_WIDTH }}
    >
      <div ref={handleRef} className="qa-feedback-drag-handle" />
      <DesignInspector
        info={info}
        open={inspectOpen}
        onToggle={() => setInspectOpen((o) => !o)}
        rgbToHex={rgbToHex}
      />
      <div className="qa-feedback-type-select">
        <div style={{ fontSize: 12, color: 'var(--qa-on-surface-variant)', marginBottom: 8 }}>
          {t('selectType')}
        </div>
        <div className="qa-feedback-type-buttons">
          {typeBtn('UI', t('typeUI'), Palette)}
          {typeBtn('기능', t('typeFeature'), Cog)}
          {typeBtn('텍스트', t('typeText'), Type)}
          {typeBtn('위치이동', t('typeMove'), Move3d)}
        </div>
      </div>

      {selectedType && (
        <div className="qa-feedback-popup-body">
          <div style={{ marginBottom: 8 }}>
            <span className="qa-feedback-type-label">
              {t(TYPE_LABEL_KEYS[selectedType])}
            </span>
          </div>
          <textarea
            ref={textareaRef}
            placeholder={t('feedbackPlaceholder')}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
            }}
            style={error ? { borderColor: 'var(--qa-error)' } : undefined}
          />
        </div>
      )}

      <div className="qa-feedback-popup-footer">
        <button className="qa-fb-cancel" onClick={() => setPopup(null)}>
          {t('cancel')}
        </button>
        {selectedType && (
          <button className="qa-fb-save" onClick={save}>
            {t('save')}
          </button>
        )}
      </div>
    </div>
  );
}
