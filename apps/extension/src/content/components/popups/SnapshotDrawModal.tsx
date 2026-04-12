import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { useT } from '../../hooks/useT';
import { captureElement } from '../../utils/dom';

interface Props {
  targetEl: Element;
  imageDataUrl: string;
  bbox: { x: number; y: number; w: number; h: number };
}

type DrawTool = 'pen' | 'arrow';

const COLORS = ['#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#3182ce', '#805ad5', '#000000', '#ffffff'];
const SIZES = [2, 4, 8];

export function SnapshotDrawModal({ targetEl, imageDataUrl, bbox }: Props) {
  const setPopup = useStore((s) => s.setPopup);
  const addFeedback = useStore((s) => s.addFeedback);
  const t = useT();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#e53e3e');
  const [size, setSize] = useState(4);
  const [drawing, setDrawing] = useState(false);
  const [text, setText] = useState('');

  // Store drawn strokes so we can replay after clear
  const strokesRef = useRef<Array<{ tool: DrawTool; color: string; size: number; points: { x: number; y: number }[] }>>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  // Arrow state
  const arrowStartRef = useRef<{ x: number; y: number } | null>(null);

  // Canvas dimensions — fit into a max area while preserving aspect ratio
  const MAX_W = 800;
  const MAX_H = 560;
  const dpr = window.devicePixelRatio || 1;
  const naturalW = bbox.w * dpr;
  const naturalH = bbox.h * dpr;
  const scale = Math.min(1, MAX_W / naturalW, MAX_H / naturalH);
  const displayW = Math.round(naturalW * scale);
  const displayH = Math.round(naturalH * scale);

  // Load the background image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      bgImageRef.current = img;
      setLoaded(true);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = bgImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      if (stroke.tool === 'pen' && stroke.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.tool === 'arrow' && stroke.points.length === 2) {
        drawArrow(ctx, stroke.points[0], stroke.points[1], stroke.color, stroke.size);
      }
    }
  }, []);

  useEffect(() => {
    if (loaded) redraw();
  }, [loaded, redraw]);

  const getCanvasPos = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pos = getCanvasPos(e);
    setDrawing(true);

    if (tool === 'pen') {
      currentStrokeRef.current = [pos];
    } else if (tool === 'arrow') {
      arrowStartRef.current = pos;
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const pos = getCanvasPos(e);

    if (tool === 'pen') {
      currentStrokeRef.current.push(pos);
      // Draw live stroke
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const pts = currentStrokeRef.current;
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    } else if (tool === 'arrow' && arrowStartRef.current) {
      // Redraw to show preview arrow
      redraw();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      drawArrow(ctx, arrowStartRef.current, pos, color, size);
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!drawing) return;
    setDrawing(false);

    if (tool === 'pen' && currentStrokeRef.current.length > 1) {
      strokesRef.current.push({
        tool: 'pen',
        color,
        size,
        points: [...currentStrokeRef.current],
      });
      currentStrokeRef.current = [];
    } else if (tool === 'arrow' && arrowStartRef.current) {
      const pos = getCanvasPos(e);
      strokesRef.current.push({
        tool: 'arrow',
        color,
        size,
        points: [arrowStartRef.current, pos],
      });
      arrowStartRef.current = null;
      redraw();
    }
  };

  const handleClear = () => {
    strokesRef.current = [];
    redraw();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const info = captureElement(targetEl);
    addFeedback({
      ...info,
      feedback: text.trim() || 'Snapshot annotation',
      fbType: 'UI',
      snapshotDataUrl: dataUrl,
      moveTarget: null,
    });
    setPopup(null);
  };

  return (
    <div className="qa-snapshot-overlay" onMouseDown={(e) => e.stopPropagation()}>
      <div className="qa-snapshot-modal">
        <div className="qa-snapshot-header">
          <h3>{t('snapshotTitle')}</h3>
          <button onClick={() => setPopup(null)}>&times;</button>
        </div>

        <div className="qa-snapshot-toolbar">
          <div className="qa-snapshot-tools">
            <button
              className={`qa-snapshot-tool-btn${tool === 'pen' ? ' active' : ''}`}
              onClick={() => setTool('pen')}
              title="Pen"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
            <button
              className={`qa-snapshot-tool-btn${tool === 'arrow' ? ' active' : ''}`}
              onClick={() => setTool('arrow')}
              title="Arrow"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="qa-snapshot-sep" />

          <div className="qa-snapshot-colors">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`qa-snapshot-color${color === c ? ' active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <div className="qa-snapshot-sep" />

          <div className="qa-snapshot-sizes">
            {SIZES.map((s) => (
              <button
                key={s}
                className={`qa-snapshot-size-btn${size === s ? ' active' : ''}`}
                onClick={() => setSize(s)}
              >
                <span className="qa-snapshot-size-dot" style={{ width: s + 4, height: s + 4 }} />
              </button>
            ))}
          </div>

          <div className="qa-snapshot-sep" />

          <button className="qa-snapshot-clear-btn" onClick={handleClear}>
            {t('snapshotClear')}
          </button>
        </div>

        <div className="qa-snapshot-canvas-wrap">
          {!loaded && <div className="qa-snapshot-loading">{t('snapshotCapturing')}</div>}
          <canvas
            ref={canvasRef}
            width={displayW}
            height={displayH}
            style={{ width: displayW, height: displayH, display: loaded ? 'block' : 'none', cursor: tool === 'pen' ? 'crosshair' : 'default' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { if (drawing) setDrawing(false); }}
          />
        </div>

        <div className="qa-snapshot-footer">
          <textarea
            className="qa-snapshot-memo"
            placeholder={t('feedbackPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
            }}
          />
          <div className="qa-snapshot-actions">
            <button className="qa-fb-cancel" onClick={() => setPopup(null)}>
              {t('cancel')}
            </button>
            <button className="qa-fb-save" onClick={handleSave}>
              {t('snapshotSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  lineWidth: number,
) {
  const headLen = Math.max(12, lineWidth * 4);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLen * Math.cos(angle - Math.PI / 6),
    to.y - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    to.x - headLen * Math.cos(angle + Math.PI / 6),
    to.y - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}
