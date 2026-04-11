import { useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { useStore } from '../state/store';
import { useT } from '../hooks/useT';
import { getSelector, isPinthatElement, truncate } from '../utils/dom';

interface Props {
  targetEl: Element;
}

/**
 * Active during the 'move-free-drag' popup state.
 *
 * - Adds a purple outline to the source element.
 * - Renders a full-viewport SVG with a line from the source center
 *   following the mouse cursor.
 * - Shows a top guide bar with a cancel button.
 * - On mouseup >20px away, transitions the popup to 'move-free-memo'.
 *
 * Mirrors legacy enterFreeMoveMode / onDragArrowMove / onDragArrowEnd.
 */
export function FreeMoveDragOverlay({ targetEl }: Props) {
  const setPopup = useStore((s) => s.setPopup);
  const t = useT();

  // Source center (viewport coords, captured once on mount).
  const sourceCenter = useRef<{ x: number; y: number } | null>(null);
  if (!sourceCenter.current) {
    const r = targetEl.getBoundingClientRect();
    sourceCenter.current = {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
    };
  }

  const [cursor, setCursor] = useState<{ x: number; y: number }>(() => ({
    x: sourceCenter.current!.x,
    y: sourceCenter.current!.y,
  }));

  // Apply a dashed outline to the source element. Since the element lives
  // in the host page (not our shadow DOM), shadow-DOM CSS can't reach it —
  // we use inline styles and restore the previous values on cleanup.
  useEffect(() => {
    const htmlEl = targetEl as HTMLElement;
    const prevOutline = htmlEl.style.outline;
    const prevOffset = htmlEl.style.outlineOffset;
    htmlEl.style.outline = '2px dashed #f43f5e';
    htmlEl.style.outlineOffset = '2px';
    return () => {
      htmlEl.style.outline = prevOutline;
      htmlEl.style.outlineOffset = prevOffset;
    };
  }, [targetEl]);

  // mousemove follows cursor; mouseup (after a grace period) commits.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setCursor({ x: e.clientX, y: e.clientY });
    };
    const onUp = (e: MouseEvent) => {
      if (!sourceCenter.current) return;
      // If the mouseup happens on our own UI (e.g. the top guide bar's
      // Cancel button), let that UI handle it — don't commit a drop.
      const upTarget = e.target as Element | null;
      if (upTarget && isPinthatElement(upTarget)) return;
      const dx = e.clientX - sourceCenter.current.x;
      const dy = e.clientY - sourceCenter.current.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        // Not a real drag — ignore this mouseup and keep listening.
        return;
      }

      // Resolve nearest host element at the drop point.
      let nearestSelector: string | null = null;
      // Temporarily hide the shadow host so elementFromPoint returns the
      // underlying host page element, not our overlay.
      const host = document.getElementById('pinthat-root');
      const prevDisplay = host?.style.display;
      if (host) host.style.display = 'none';
      const nearestEl = document.elementFromPoint(e.clientX, e.clientY);
      if (host) host.style.display = prevDisplay || '';
      if (nearestEl && !isPinthatElement(nearestEl)) {
        try {
          nearestSelector = getSelector(nearestEl);
        } catch {
          nearestSelector = null;
        }
      }

      setPopup({
        kind: 'move-free-memo',
        targetEl,
        destX: Math.round(e.pageX),
        destY: Math.round(e.pageY),
        nearestSelector,
      });
    };

    // Swallow clicks on the host page so the drop target (link/button) doesn't activate.
    const onClickCapture = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t || isPinthatElement(t)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('click', onClickCapture, true);
    // Delay mouseup binding ~300ms so the mouseup of the button that
    // started this mode doesn't immediately end the drag.
    const timer = setTimeout(() => {
      document.addEventListener('mouseup', onUp);
    }, 300);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, [targetEl, setPopup]);

  const srcX = sourceCenter.current!.x;
  const srcY = sourceCenter.current!.y;

  return (
    <>
      <div className="qa-feedback-move-guide">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Target size={14} strokeWidth={2} />
          {t('moveDragGuide')}{' '}
          <code>{truncate((targetEl as HTMLElement).tagName.toLowerCase(), 40)}</code>
        </span>
        <button
          className="qa-feedback-move-guide-cancel"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setPopup(null);
          }}
        >
          {t('cancel')}
        </button>
      </div>
      <svg
        className="qa-feedback-arrow-svg"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 99995,
        }}
      >
        <defs>
          <marker
            id="qa-arrow-head-drag"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" />
          </marker>
        </defs>
        <circle cx={srcX} cy={srcY} r={4} fill="#f43f5e" opacity={0.7} />
        <line
          x1={srcX}
          y1={srcY}
          x2={cursor.x}
          y2={cursor.y}
          stroke="#f43f5e"
          strokeWidth={2}
          opacity={0.7}
          markerEnd="url(#qa-arrow-head-drag)"
        />
      </svg>
    </>
  );
}
