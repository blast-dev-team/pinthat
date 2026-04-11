import { useEffect, useState } from 'react';
import { useStore } from '../state/store';

interface Arrow {
  id: number;
  srcX: number;
  srcY: number;
  destX: number;
  destY: number;
  midX: number;
  midY: number;
}

/**
 * For each saved 'free' move feedback, renders a persistent SVG arrow
 * from the source element's center to the stored page-coordinate target.
 * Uses `position: absolute` in document coords so arrows scroll with the page.
 */
export function FreeMoveArrowOverlays() {
  const feedbacks = useStore((s) => s.feedbacks);
  const setPopup = useStore((s) => s.setPopup);
  const [arrows, setArrows] = useState<Arrow[]>([]);

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next: Arrow[] = [];
        feedbacks.forEach((fb) => {
          if (fb.fbType !== '위치이동' || fb.moveType !== 'free' || !fb.moveTarget) return;
          if (!fb.selector) return;
          let el: Element | null = null;
          try {
            el = document.querySelector(fb.selector);
          } catch {
            return;
          }
          if (!el) return;
          const r = el.getBoundingClientRect();
          const srcX = r.left + window.scrollX + r.width / 2;
          const srcY = r.top + window.scrollY + r.height / 2;
          const destX = fb.moveTarget.x;
          const destY = fb.moveTarget.y;
          next.push({
            id: fb.id,
            srcX,
            srcY,
            destX,
            destY,
            midX: (srcX + destX) / 2,
            midY: (srcY + destY) / 2,
          });
        });
        setArrows(next);
      });
    };

    schedule();
    const obs = new MutationObserver(schedule);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [feedbacks]);

  if (arrows.length === 0) return null;

  const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

  return (
    <>
      <svg
        className="qa-feedback-arrow-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: docW,
          height: docH,
          pointerEvents: 'none',
          zIndex: 99990,
        }}
      >
        <defs>
          <marker
            id="qa-arrow-head-saved"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" />
          </marker>
        </defs>
        {arrows.map((a) => (
          <g key={a.id}>
            <circle cx={a.srcX} cy={a.srcY} r={4} fill="#f43f5e" />
            <line
              x1={a.srcX}
              y1={a.srcY}
              x2={a.destX}
              y2={a.destY}
              stroke="#f43f5e"
              strokeWidth={2}
              markerEnd="url(#qa-arrow-head-saved)"
            />
          </g>
        ))}
      </svg>
      {arrows.map((a) => (
        <button
          key={a.id}
          className="qa-feedback-number-badge qa-feedback-move-badge qa-feedback-arrow-badge"
          style={{
            position: 'absolute',
            left: a.midX,
            top: a.midY,
            transform: 'translate(-50%, -50%)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setPopup({ kind: 'edit', feedbackId: a.id });
          }}
        >
          {a.id}
        </button>
      ))}
    </>
  );
}
