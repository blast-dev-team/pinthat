import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { useDraggable } from '../../hooks/useDraggable';
import { useT } from '../../hooks/useT';
import { captureElement } from '../../utils/dom';
import type { StringKey } from '../../../shared/i18n';

interface Props {
  targetEl: Element;
  fbType: 'UI' | '기능' | '텍스트';
}

const TYPE_LABEL_KEYS: Record<Props['fbType'], StringKey> = {
  UI: 'typeUI',
  기능: 'typeFeature',
  텍스트: 'typeText',
};

export function FeedbackInputPopup({ targetEl, fbType }: Props) {
  const setPopup = useStore((s) => s.setPopup);
  const addFeedback = useStore((s) => s.addFeedback);
  const t = useT();
  const info = useMemo(() => captureElement(targetEl), [targetEl]);

  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useDraggable(popupRef, headerRef);

  const [text, setText] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const initial = useMemo(() => {
    const r = targetEl.getBoundingClientRect();
    const top = Math.max(10, Math.min(r.bottom + 10, window.innerHeight - 300));
    const left = Math.max(10, Math.min(r.left, window.innerWidth - 360));
    return { top, left };
  }, [targetEl]);

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    addFeedback({ ...info, feedback: trimmed, fbType, moveTarget: null });
    setPopup(null);
  };

  return (
    <div ref={popupRef} className="qa-feedback-popup" style={{ top: initial.top, left: initial.left }}>
      <div ref={headerRef} className="qa-feedback-popup-header">
        <div className="qa-fb-sel">{info.selector}</div>
        <div className="qa-fb-loc">{info.section}</div>
        <div style={{ marginTop: 4 }}>
          <span className="qa-feedback-type-label">{t(TYPE_LABEL_KEYS[fbType])}</span>
        </div>
      </div>
      <div className="qa-feedback-popup-body">
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
          style={error ? { borderColor: '#ef4444' } : undefined}
        />
      </div>
      <div className="qa-feedback-popup-footer">
        <button className="qa-fb-cancel" onClick={() => setPopup(null)}>{t('cancel')}</button>
        <button className="qa-fb-save" onClick={save}>{t('save')}</button>
      </div>
    </div>
  );
}
