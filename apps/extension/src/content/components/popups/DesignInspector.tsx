import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CapturedElement } from '../../types';
import { useT } from '../../hooks/useT';

interface Props {
  info: CapturedElement;
  open: boolean;
  onToggle: () => void;
  rgbToHex: (s: string) => string;
}

export function DesignInspector({ info, open, onToggle, rgbToHex }: Props) {
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
                <InspectRow label="Font" value={fontShort || ''} />
                <InspectRow label="Size" value={s.fontSize} />
                <InspectRow label="Weight" value={s.fontWeight} />
                <InspectRow label="Line-H" value={s.lineHeight} />
                <div className="qa-inspect-row">
                  <span className="qa-inspect-label">Color</span>
                  <span className="qa-inspect-value">
                    <span className="qa-inspect-color-swatch" style={{ background: s.color }} />
                    {fgHex}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="qa-inspect-section">
            <div className="qa-inspect-title">{t('inspectStyle')}</div>
            <div className="qa-inspect-rows">
              <div className="qa-inspect-row">
                <span className="qa-inspect-label">Background</span>
                <span className="qa-inspect-value">
                  <span
                    className="qa-inspect-color-swatch"
                    style={{ background: s.backgroundColor }}
                  />
                  {bgHex}
                </span>
              </div>
              {s.borderRadius && s.borderRadius !== '0px' && (
                <InspectRow label="Radius" value={s.borderRadius} />
              )}
              {s.border && !s.border.startsWith('0px') && (
                <InspectRow label="Border" value={s.border} />
              )}
              {s.boxShadow && s.boxShadow !== 'none' && (
                <InspectRow label="Shadow" value={s.boxShadow} />
              )}
            </div>
          </div>

          {isFlexGrid && (
            <div className="qa-inspect-section">
              <div className="qa-inspect-title">{t('inspectLayout')}</div>
              <div className="qa-inspect-rows">
                <InspectRow label="Display" value={s.display} />
                <InspectRow label="Direction" value={s.flexDirection} />
                {s.gap && s.gap !== 'normal' && s.gap !== '0px' && (
                  <InspectRow label="Gap" value={s.gap} />
                )}
                <InspectRow label="Justify" value={s.justifyContent} />
                <InspectRow label="Align" value={s.alignItems} />
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

function InspectRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="qa-inspect-row">
      <span className="qa-inspect-label">{label}</span>
      <span className="qa-inspect-value">{value}</span>
    </div>
  );
}
