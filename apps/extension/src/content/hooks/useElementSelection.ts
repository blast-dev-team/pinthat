import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { isPinthatElement } from '../utils/dom';

interface HoverInfo {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
}

/** Short human-readable label for the hovered element (tag + #id / .class). */
function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  if (typeof el.className === 'string' && el.className.trim()) {
    const cls = el.className
      .trim()
      .split(/\s+/)
      .filter((c) => !c.startsWith('qa-feedback-') && !c.startsWith('pinthat-'))[0];
    if (cls) return `${tag}.${cls}`;
  }
  return tag;
}

/**
 * Handles document-level mousemove/click when QA mode is active.
 * Returns the current hover info (for the outline + label).
 */
export function useElementSelection() {
  const active = useStore((s) => s.active);
  const setPopup = useStore((s) => s.setPopup);
  const popup = useStore((s) => s.popup);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  useEffect(() => {
    if (!active || popup) {
      setHoverInfo(null);
      return;
    }

    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || isPinthatElement(target)) {
        setHoverInfo(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setHoverInfo({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        label: describeElement(target),
      });
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || isPinthatElement(target)) return;
      e.preventDefault();
      e.stopPropagation();
      setHoverInfo(null);
      setPopup({ kind: 'type-select', targetEl: target });
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, popup, setPopup]);

  return hoverInfo;
}
