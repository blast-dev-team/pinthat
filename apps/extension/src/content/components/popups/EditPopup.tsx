import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { useDraggable } from '../../hooks/useDraggable';
import { useT } from '../../hooks/useT';
import type { FeedbackType } from '../../types';
import type { StringKey } from '../../../shared/i18n';

interface Props {
  feedbackId: number;
}

const TABS: Array<{ type: Exclude<FeedbackType, '위치이동'>; labelKey: StringKey }> = [
  { type: 'UI', labelKey: 'typeUI' },
  { type: '기능', labelKey: 'typeFeature' },
  { type: '텍스트', labelKey: 'typeText' },
];

export function EditPopup({ feedbackId }: Props) {
  const fb = useStore((s) => s.feedbacks.find((f) => f.id === feedbackId));
  const updateFeedback = useStore((s) => s.updateFeedback);
  const removeFeedback = useStore((s) => s.removeFeedback);
  const setPopup = useStore((s) => s.setPopup);
  const t = useT();

  const [text, setText] = useState(fb?.feedback || '');
  const [editType, setEditType] = useState<FeedbackType>(fb?.fbType || 'UI');

  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  useDraggable(popupRef, headerRef);

  const initial = useMemo(() => {
    if (!fb?.selector) return { top: 100, left: 100 };
    const el = document.querySelector(fb.selector);
    if (!el) return { top: 100, left: 100 };
    const r = el.getBoundingClientRect();
    return {
      top: Math.max(10, Math.min(r.bottom + 10, window.innerHeight - 300)),
      left: Math.max(10, Math.min(r.left, window.innerWidth - 360)),
    };
  }, [fb?.selector]);

  if (!fb) return null;

  const save = () => {
    updateFeedback(feedbackId, { feedback: text.trim(), fbType: editType });
    setPopup(null);
  };

  const del = () => {
    removeFeedback(feedbackId);
    setPopup(null);
  };

  return (
    <div ref={popupRef} className="qa-feedback-popup" style={{ top: initial.top, left: initial.left }}>
      <div ref={headerRef} className="qa-feedback-popup-header">
        <div className="qa-fb-sel">{fb.selector}</div>
        <div className="qa-fb-loc">{fb.section}</div>
      </div>
      <div className="qa-feedback-type-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            className={`qa-feedback-type-tab${editType === tab.type ? ' active' : ''}`}
            onClick={() => setEditType(tab.type)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      <div className="qa-feedback-popup-body">
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="qa-feedback-popup-footer">
        <button className="qa-fb-delete" onClick={del}>{t('delete')}</button>
        <button className="qa-fb-cancel" onClick={() => setPopup(null)}>{t('cancel')}</button>
        <button className="qa-fb-save" onClick={save}>{t('save')}</button>
      </div>
    </div>
  );
}
