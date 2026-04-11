import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useStore } from '../state/store';

interface ResolvedRect {
  id: number;
  badgeLabel: ReactNode;
  isMove: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
}

const DIR_ICONS: Record<string, ReactNode> = {
  left: <ArrowLeft size={12} strokeWidth={2.5} />,
  right: <ArrowRight size={12} strokeWidth={2.5} />,
  up: <ArrowUp size={12} strokeWidth={2.5} />,
  down: <ArrowDown size={12} strokeWidth={2.5} />,
};

/**
 * For each feedback, resolve its selector on the page and render a
 * numbered badge overlay. Re-resolves on scroll/resize/mutation.
 * 위치이동 feedbacks render in purple with a direction icon (component)
 * or the id number (free).
 */
export function SelectedOverlays() {
  const feedbacks = useStore((s) => s.feedbacks);
  const setPopup = useStore((s) => s.setPopup);
  const [rects, setRects] = useState<ResolvedRect[]>([]);

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next: ResolvedRect[] = [];
        feedbacks.forEach((fb, idx) => {
          if (!fb.selector) return;
          let el: Element | null = null;
          try {
            el = document.querySelector(fb.selector);
          } catch {
            /* invalid selector — skip */
          }
          if (!el) return;
          const r = el.getBoundingClientRect();

          const isMove = fb.fbType === '위치이동';
          const badgeLabel: ReactNode =
            isMove && fb.moveType === 'component' && fb.moveDirection
              ? DIR_ICONS[fb.moveDirection] ?? String(idx + 1)
              : String(idx + 1);

          next.push({
            id: fb.id,
            badgeLabel,
            isMove,
            left: r.left + window.scrollX,
            top: r.top + window.scrollY,
            width: r.width,
            height: r.height,
          });
        });
        setRects(next);
      });
    };

    schedule();
    const obs = new MutationObserver(schedule);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const interval = setInterval(schedule, 2000);

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      clearInterval(interval);
    };
  }, [feedbacks]);

  return (
    <>
      {rects.map((r) => (
        <div
          key={r.id}
          className={
            'qa-feedback-selected-overlay' +
            (r.isMove ? ' qa-feedback-move-overlay' : '')
          }
          style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
        >
          <button
            className={
              'qa-feedback-number-badge' +
              (r.isMove ? ' qa-feedback-move-badge' : '')
            }
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setPopup({ kind: 'edit', feedbackId: r.id });
            }}
          >
            {r.badgeLabel}
          </button>
        </div>
      ))}
    </>
  );
}
