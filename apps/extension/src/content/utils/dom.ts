import type { CapturedElement, ComputedStyleInfo } from '../types';

export function getSelector(el: Element): string {
  if (el.id) return '#' + el.id;
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.body && parts.length < 5) {
    let s = cur.tagName.toLowerCase();
    if (cur.id) {
      parts.unshift('#' + cur.id);
      break;
    }
    if (cur.className && typeof cur.className === 'string') {
      const cls = cur.className
        .trim()
        .split(/\s+/)
        .filter((c) => !c.startsWith('qa-feedback-') && !c.startsWith('pinthat-'))
        .slice(0, 2)
        .join('.');
      if (cls) s += '.' + cls;
    }
    const parent = cur.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === cur!.tagName);
      if (siblings.length > 1) {
        s += ':nth-child(' + (Array.from(parent.children).indexOf(cur) + 1) + ')';
      }
    }
    parts.unshift(s);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

export function getSection(el: Element): string {
  let cur: Element | null = el;
  while (cur) {
    const tag = cur.tagName;
    if (tag === 'SECTION' || tag === 'FOOTER' || tag === 'HEADER' || tag === 'NAV') {
      const className = typeof cur.className === 'string' ? cur.className : '';
      return cur.id || className.split(/\s+/)[0] || tag.toLowerCase();
    }
    cur = cur.parentElement;
  }
  return 'body';
}

export function truncate(s: string, n: number): string {
  return s && s.length > n ? s.slice(0, n) + '...' : s;
}

export function getComputedProps(el: Element): ComputedStyleInfo {
  const cs = getComputedStyle(el);
  return {
    color: cs.color,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    backgroundColor: cs.backgroundColor,
    padding: cs.padding,
    margin: cs.margin,
    display: cs.display,
    position: cs.position,
    border: cs.border,
    lineHeight: cs.lineHeight,
    textAlign: cs.textAlign,
    fontFamily: cs.fontFamily,
    borderRadius: cs.borderRadius,
    opacity: cs.opacity,
    gap: cs.gap,
    flexDirection: cs.flexDirection,
    justifyContent: cs.justifyContent,
    alignItems: cs.alignItems,
    overflow: cs.overflow,
    boxShadow: cs.boxShadow,
    marginTop: cs.marginTop,
    marginRight: cs.marginRight,
    marginBottom: cs.marginBottom,
    marginLeft: cs.marginLeft,
    paddingTop: cs.paddingTop,
    paddingRight: cs.paddingRight,
    paddingBottom: cs.paddingBottom,
    paddingLeft: cs.paddingLeft,
  };
}

export function rgbToHex(rgb: string): string {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return 'transparent';
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return rgb;
  const hex =
    '#' +
    match
      .slice(0, 3)
      .map((n) => parseInt(n).toString(16).padStart(2, '0'))
      .join('');
  return hex.toUpperCase();
}

export function captureElement(el: Element): CapturedElement {
  const rect = el.getBoundingClientRect();
  const info: CapturedElement = {
    selector: getSelector(el),
    section: getSection(el),
    tagName: el.tagName,
    classes: Array.from(el.classList).filter((c) => !c.startsWith('qa-feedback-') && !c.startsWith('pinthat-')),
    elementId: el.id || '',
    textContent: truncate((el.textContent || '').trim(), 120),
    bbox: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    },
    styles: getComputedProps(el),
  };
  if (el.tagName === 'IMG') {
    const img = el as HTMLImageElement;
    info.imgInfo = {
      src: img.src ? img.src.split('/').pop() || '' : '',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      alt: img.alt || '',
    };
  }
  const bgImage = getComputedStyle(el).backgroundImage;
  if (bgImage && bgImage !== 'none') {
    info.bgImage = bgImage.replace(/url\(["']?/, '').replace(/["']?\)/, '').split('/').pop();
  }
  return info;
}

/** Is the element part of our extension UI? Used for hit-testing during selection mode. */
export function isPinthatElement(el: Element | null): boolean {
  if (!el) return false;
  // Shadow-root host and anything inside it
  if ((el as Element).id === 'pinthat-root') return true;
  let cur: Node | null = el;
  while (cur) {
    if (cur instanceof Element && cur.id === 'pinthat-root') return true;
    cur = cur.parentNode;
  }
  return false;
}

export function circled(n: number): string {
  const chars = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  return n <= 20 ? chars[n - 1]! : '(' + n + ')';
}
