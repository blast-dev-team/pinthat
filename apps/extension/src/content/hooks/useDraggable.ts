import { useEffect, useRef, type RefObject } from 'react';

const DRAG_STYLE_ID = 'pinthat-drag-style';

/**
 * Inject a host-page <style> that forces the grabbing cursor across the
 * whole document while a drag is active. Shadow-DOM CSS can't reach the
 * underlying page, so we have to put this rule in the host page's <head>.
 *
 * The style element is created lazily on first drag and left in place.
 * The behavior is gated by the `.pinthat-dragging` class on <html>.
 */
function ensureDragStyle() {
  if (document.getElementById(DRAG_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = DRAG_STYLE_ID;
  style.textContent = `
    html.pinthat-dragging, html.pinthat-dragging * {
      cursor: grabbing !important;
      user-select: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

/**
 * Makes a popup/panel draggable by a handle element.
 * On first drag, switches positioning from {bottom,right} to {left,top}.
 */
export function useDraggable(
  containerRef: RefObject<HTMLElement>,
  handleRef: RefObject<HTMLElement>,
) {
  const dragging = useRef(false);
  const off = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handle = handleRef.current;
    const container = containerRef.current;
    if (!handle || !container) return;

    const DRAG_CLASS = 'pinthat-dragging';
    ensureDragStyle();

    const onDown = (e: MouseEvent) => {
      dragging.current = true;
      const rect = container.getBoundingClientRect();
      off.current.x = e.clientX - rect.left;
      off.current.y = e.clientY - rect.top;
      document.documentElement.classList.add(DRAG_CLASS);
      e.preventDefault();
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      container.style.left = Math.max(0, e.clientX - off.current.x) + 'px';
      container.style.top = Math.max(0, e.clientY - off.current.y) + 'px';
      container.style.right = 'auto';
      container.style.bottom = 'auto';
      // The panel is centred via translateX(-50%); clear that the moment
      // the user starts dragging so left/top are honoured literally.
      if (container.style.transform) container.style.transform = 'none';
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.documentElement.classList.remove(DRAG_CLASS);
    };

    handle.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      handle.removeEventListener('mousedown', onDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.documentElement.classList.remove(DRAG_CLASS);
    };
  }, [containerRef, handleRef]);
}
