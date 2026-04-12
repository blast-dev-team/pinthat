import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CapturedElement } from '../../types';
import { useT } from '../../hooks/useT';

interface Props {
  info: CapturedElement;
  open: boolean;
  onToggle: () => void;
  rgbToHex: (s: string) => string;
  targetEl?: Element;
}

/** Map from display label to CSS property name for editable rows. */
const LABEL_TO_CSS: Record<string, string> = {
  Font: 'font-family',
  Size: 'font-size',
  Weight: 'font-weight',
  'Line-H': 'line-height',
  Color: 'color',
  Background: 'background-color',
  Radius: 'border-radius',
  Border: 'border',
  Shadow: 'box-shadow',
  Display: 'display',
  Direction: 'flex-direction',
  Gap: 'gap',
  Justify: 'justify-content',
  Align: 'align-items',
};

export function DesignInspector({ info, open, onToggle, rgbToHex, targetEl }: Props) {
  const t = useT();
  const s = info.styles;
  const isFlexGrid =
    s.display === 'flex' ||
    s.display === 'grid' ||
    s.display === 'inline-flex' ||
    s.display === 'inline-grid';
  const hasText = !!info.textContent;
  const isImg = info.tagName === 'IMG';
  const fgHex = rgbToHex(s.color);
  const bgHex = rgbToHex(s.backgroundColor);
  const fontShort = (s.fontFamily || '').split(',')[0]?.replace(/['"]/g, '').trim();

  const applyStyle = (label: string, value: string) => {
    const cssProp = LABEL_TO_CSS[label];
    if (!cssProp || !targetEl || !(targetEl instanceof HTMLElement)) return;
    targetEl.style.setProperty(cssProp, value);
  };

  return (
    <div className="qa-feedback-inspect">
      <button className="qa-feedback-inspect-toggle" onClick={onToggle}>
        <span>{t('inspectTitle')}</span>
        <span className="qa-inspect-arrow">
          {open ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
        </span>
      </button>
      {open && (
        <div className="qa-feedback-inspect-body">
          <div className="qa-inspect-section">
            <div className="qa-inspect-title">{t('inspectSize')}</div>
            <div className="qa-inspect-grid">
              <span className="qa-inspect-label">W</span>
              <span className="qa-inspect-value">{info.bbox.w}px</span>
              <span className="qa-inspect-label">H</span>
              <span className="qa-inspect-value">{info.bbox.h}px</span>
            </div>
          </div>

          {hasText && (
            <div className="qa-inspect-section">
              <div className="qa-inspect-title">{t('inspectTypography')}</div>
              <div className="qa-inspect-rows">
                <EditableRow label="Font" value={fontShort || ''} onCommit={applyStyle} />
                <EditableRow label="Size" value={s.fontSize} onCommit={applyStyle} />
                <EditableRow label="Weight" value={s.fontWeight} onCommit={applyStyle} />
                <EditableRow label="Line-H" value={s.lineHeight} onCommit={applyStyle} />
                <EditableColorRow label="Color" hex={fgHex} raw={s.color} onCommit={applyStyle} />
              </div>
            </div>
          )}

          <div className="qa-inspect-section">
            <div className="qa-inspect-title">{t('inspectStyle')}</div>
            <div className="qa-inspect-rows">
              <EditableColorRow label="Background" hex={bgHex} raw={s.backgroundColor} onCommit={applyStyle} />
              {s.borderRadius && s.borderRadius !== '0px' && (
                <EditableRow label="Radius" value={s.borderRadius} onCommit={applyStyle} />
              )}
              {s.border && !s.border.startsWith('0px') && (
                <EditableRow label="Border" value={s.border} onCommit={applyStyle} />
              )}
              {s.boxShadow && s.boxShadow !== 'none' && (
                <EditableRow label="Shadow" value={s.boxShadow} onCommit={applyStyle} />
              )}
            </div>
          </div>

          {isFlexGrid && (
            <div className="qa-inspect-section">
              <div className="qa-inspect-title">{t('inspectLayout')}</div>
              <div className="qa-inspect-rows">
                <EditableRow label="Display" value={s.display} onCommit={applyStyle} />
                <EditableRow label="Direction" value={s.flexDirection} onCommit={applyStyle} />
                {s.gap && s.gap !== 'normal' && s.gap !== '0px' && (
                  <EditableRow label="Gap" value={s.gap} onCommit={applyStyle} />
                )}
                <EditableRow label="Justify" value={s.justifyContent} onCommit={applyStyle} />
                <EditableRow label="Align" value={s.alignItems} onCommit={applyStyle} />
              </div>
            </div>
          )}

          {isImg && info.imgInfo && (
            <div className="qa-inspect-section">
              <div className="qa-inspect-title">{t('inspectImage')}</div>
              <div className="qa-inspect-rows">
                <InspectRow label="File" value={info.imgInfo.src} />
                <InspectRow
                  label="Original"
                  value={`${info.imgInfo.naturalWidth} × ${info.imgInfo.naturalHeight}px`}
                />
                <InspectRow label="Rendered" value={`${info.bbox.w} × ${info.bbox.h}px`} />
                <InspectRow label="Alt" value={info.imgInfo.alt} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Read-only row (used for image info, size, etc.) */
function InspectRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="qa-inspect-row">
      <span className="qa-inspect-label">{label}</span>
      <span className="qa-inspect-value">{value}</span>
    </div>
  );
}

/** Editable row — click the value to edit, Enter/blur to commit. */
function EditableRow({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (label: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onCommit(label, draft);
  };

  return (
    <div className="qa-inspect-row">
      <span className="qa-inspect-label">{label}</span>
      {editing ? (
        <input
          ref={inputRef}
          className="qa-inspect-edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(value); setEditing(false); }
          }}
        />
      ) : (
        <span
          className="qa-inspect-value qa-inspect-value-editable"
          onClick={() => { setDraft(value); setEditing(true); }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

/** Editable color row — click to edit hex value, shows swatch. */
function EditableColorRow({
  label,
  hex,
  raw,
  onCommit,
}: {
  label: string;
  hex: string;
  raw: string;
  onCommit: (label: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(hex);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== hex) onCommit(label, draft);
  };

  return (
    <div className="qa-inspect-row">
      <span className="qa-inspect-label">{label}</span>
      {editing ? (
        <input
          ref={inputRef}
          className="qa-inspect-edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(hex); setEditing(false); }
          }}
        />
      ) : (
        <span
          className="qa-inspect-value qa-inspect-value-editable"
          onClick={() => { setDraft(hex); setEditing(true); }}
        >
          <span className="qa-inspect-color-swatch" style={{ background: raw }} />
          {hex}
        </span>
      )}
    </div>
  );
}
