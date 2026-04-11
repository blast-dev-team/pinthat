import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Package,
  Shuffle,
} from 'lucide-react';
import { useStore } from '../../state/store';
import { useDraggable } from '../../hooks/useDraggable';
import { useT } from '../../hooks/useT';
import { captureElement, truncate } from '../../utils/dom';
import type { CapturedElement } from '../../types';
import type { StringKey } from '../../../shared/i18n';

type MoveDir = 'up' | 'down' | 'left' | 'right';

const DIR_LABEL_KEYS: Record<MoveDir, StringKey> = {
  left: 'moveDirLeft',
  right: 'moveDirRight',
  up: 'moveDirUp',
  down: 'moveDirDown',
};

const DIR_ICONS: Record<MoveDir, typeof ArrowLeft> = {
  left: ArrowLeft,
  right: ArrowRight,
  up: ArrowUp,
  down: ArrowDown,
};

/** Position a popup below the target, clamped to the viewport. */
function usePopupPosition(
  targetEl: Element,
  width = 340,
  height = 200,
  override?: { top: number; left: number },
) {
  return useMemo(() => {
    if (override) return override;
    const r = targetEl.getBoundingClientRect();
    const top = Math.max(10, Math.min(r.bottom + 10, window.innerHeight - height));
    const left = Math.max(10, Math.min(r.left, window.innerWidth - width));
    return { top, left };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetEl, width, height, override?.top, override?.left]);
}

/* ============================================================ */
/* 1) MoveSubOptionsPopup                                          */
/* ============================================================ */
export function MoveSubOptionsPopup({
  targetEl,
  pos: override,
}: {
  targetEl: Element;
  pos?: { top: number; left: number };
}) {
  const setPopup = useStore((s) => s.setPopup);
  const t = useT();
  const info = useMemo(() => captureElement(targetEl), [targetEl]);
  const pos = usePopupPosition(targetEl, 340, 200, override);

  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  useDraggable(popupRef, headerRef);

  // Anchor the next popup to the cursor so the pointer lands inside the new
  // popup instead of floating over empty space.
  const posFromEvent = (e: React.MouseEvent) => ({
    top: Math.max(10, e.clientY - 20),
    left: Math.max(10, e.clientX - 20),
  });

  return (
    <div ref={popupRef} className="qa-feedback-popup" style={{ top: pos.top, left: pos.left }}>
      <div ref={headerRef} className="qa-feedback-popup-header">
        <div className="qa-fb-sel">{info.selector}</div>
        <div className="qa-fb-loc">{info.section}</div>
      </div>
      <div className="qa-feedback-type-select">
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{t('moveSelectMethod')}</div>
        <div className="qa-feedback-move-sub-buttons">
          <button
            className="qa-feedback-move-sub-btn"
            onClick={(e) =>
              setPopup({
                kind: 'move-component-dir',
                targetEl,
                pos: posFromEvent(e),
              })
            }
          >
            <Package size={16} strokeWidth={2} />
            <span>{t('moveComponent')}</span>
          </button>
          <button
            className="qa-feedback-move-sub-btn"
            onClick={() => setPopup({ kind: 'move-free-drag', targetEl })}
          >
            <Shuffle size={16} strokeWidth={2} />
            <span>{t('moveFree')}</span>
          </button>
        </div>
      </div>
      <div className="qa-feedback-popup-footer">
        <button className="qa-fb-cancel" onClick={() => setPopup(null)}>{t('cancel')}</button>
      </div>
    </div>
  );
}

/* ============================================================ */
/* 2) ComponentDirectionPopup                                      */
/* ============================================================ */
export function ComponentDirectionPopup({
  targetEl,
  pos: override,
}: {
  targetEl: Element;
  pos?: { top: number; left: number };
}) {
  const setPopup = useStore((s) => s.setPopup);
  const t = useT();
  const info = useMemo(() => captureElement(targetEl), [targetEl]);
  const pos = usePopupPosition(targetEl, 360, 300, override);

  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  useDraggable(popupRef, headerRef);

  const posFromEvent = (e: React.MouseEvent) => ({
    top: Math.max(10, e.clientY - 20),
    left: Math.max(10, e.clientX - 20),
  });

  const dirs: MoveDir[] = ['left', 'right', 'up', 'down'];

  return (
    <div ref={popupRef} className="qa-feedback-popup" style={{ top: pos.top, left: pos.left }}>
      <div ref={headerRef} className="qa-feedback-popup-header">
        <div style={{ marginBottom: 4 }}>
          <span className="qa-feedback-type-label">{t('moveComponent')}</span>
        </div>
        <div className="qa-fb-sel">{info.selector}</div>
      </div>
      <div className="qa-feedback-move-options">
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{t('moveSelectDirection')}</div>
        <div className="qa-feedback-move-direction-buttons">
          {dirs.map((d) => {
            const Icon = DIR_ICONS[d];
            return (
              <button
                key={d}
                className="qa-feedback-move-option-btn"
                onClick={(e) =>
                  setPopup({
                    kind: 'move-component-memo',
                    targetEl,
                    direction: d,
                    pos: posFromEvent(e),
                  })
                }
              >
                <Icon size={14} strokeWidth={2} />
                <span>{t(DIR_LABEL_KEYS[d])}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="qa-feedback-popup-footer">
        <button className="qa-fb-cancel" onClick={() => setPopup(null)}>{t('cancel')}</button>
      </div>
    </div>
  );
}

/* ============================================================ */
/* 3) ComponentMemoPopup                                            */
/* ============================================================ */
export function ComponentMemoPopup({
  targetEl,
  direction,
  pos: override,
}: {
  targetEl: Element;
  direction: MoveDir;
  pos?: { top: number; left: number };
}) {
  const setPopup = useStore((s) => s.setPopup);
  const addFeedback = useStore((s) => s.addFeedback);
  const t = useT();
  const info = useMemo(() => captureElement(targetEl), [targetEl]);
  const pos = usePopupPosition(targetEl, 360, 300, override);

  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useDraggable(popupRef, headerRef);

  const [memo, setMemo] = useState('');
  const autoFeedback = `${t('moveAutoLabelComponent')}: ${info.selector} → ${t(DIR_LABEL_KEYS[direction])}`;

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const save = () => {
    const trimmed = memo.trim();
    const fullFeedback = trimmed ? autoFeedback + ' — ' + trimmed : autoFeedback;
    addFeedback({
      ...info,
      feedback: fullFeedback,
      fbType: '위치이동',
      moveType: 'component',
      moveDirection: direction,
      moveTarget: null,
    });
    setPopup(null);
  };

  return (
    <div ref={popupRef} className="qa-feedback-popup" style={{ top: pos.top, left: pos.left }}>
      <div ref={headerRef} className="qa-feedback-popup-header">
        <div style={{ marginBottom: 4 }}>
          <span className="qa-feedback-type-label">{t('moveComponent')}</span>
        </div>
        <div className="qa-fb-sel" style={{ marginTop: 4 }}>{autoFeedback}</div>
      </div>
      <div className="qa-feedback-popup-body">
        <textarea
          ref={textareaRef}
          placeholder={t('moveMemoPlaceholder')}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
          }}
        />
      </div>
      <div className="qa-feedback-popup-footer">
        <button className="qa-fb-cancel" onClick={() => setPopup(null)}>{t('cancel')}</button>
        <button className="qa-fb-save" onClick={save}>{t('save')}</button>
      </div>
    </div>
  );
}

/* ============================================================ */
/* 4) FreeMoveMemoPopup                                             */
/* ============================================================ */
interface FreeMoveMemoProps {
  targetEl: Element;
  destX: number;
  destY: number;
  nearestSelector: string | null;
}

export function FreeMoveMemoPopup({ targetEl, destX, destY, nearestSelector }: FreeMoveMemoProps) {
  const setPopup = useStore((s) => s.setPopup);
  const addFeedback = useStore((s) => s.addFeedback);
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  const info: CapturedElement = useMemo(() => captureElement(targetEl), [targetEl]);
  const pos = usePopupPosition(targetEl, 360, 300);

  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useDraggable(popupRef, headerRef);

  const [memo, setMemo] = useState('');
  const destDesc = nearestSelector ? `${nearestSelector} ${t('mdNear')}` : `(${destX}, ${destY})`;
  const autoFeedback = `${t('moveAutoLabelFree')}: ${info.selector} → ${destDesc}`;

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const save = () => {
    const trimmed = memo.trim();
    if (!trimmed) {
      showToast(t('moveFreeMemoRequired'));
      return;
    }
    const fullFeedback = autoFeedback + ' — ' + trimmed;
    addFeedback({
      ...info,
      feedback: fullFeedback,
      fbType: '위치이동',
      moveType: 'free',
      moveTarget: { x: destX, y: destY, nearestSelector, description: destDesc },
    });
    setPopup(null);
  };

  return (
    <div ref={popupRef} className="qa-feedback-popup" style={{ top: pos.top, left: pos.left }}>
      <div ref={headerRef} className="qa-feedback-popup-header">
        <div style={{ marginBottom: 4 }}>
          <span className="qa-feedback-type-label">{t('moveFree')}</span>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          {t('moveStart')}: <code>{truncate(info.selector, 30)}</code>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          {t('moveDest')}: {destDesc} ({destX}, {destY})
        </div>
      </div>
      <div className="qa-feedback-popup-body">
        <textarea
          ref={textareaRef}
          placeholder={t('moveFreeMemoPlaceholder')}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
          }}
        />
      </div>
      <div className="qa-feedback-popup-footer">
        <button className="qa-fb-cancel" onClick={() => setPopup(null)}>{t('cancel')}</button>
        <button className="qa-fb-save" onClick={save}>{t('save')}</button>
      </div>
    </div>
  );
}
