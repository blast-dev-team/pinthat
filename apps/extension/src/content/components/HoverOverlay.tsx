interface HoverInfo {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
}

interface HoverOverlayProps {
  info: HoverInfo;
}

export function HoverOverlay({ info }: HoverOverlayProps) {
  // Place label above if there's room, otherwise below.
  const labelAbove = info.top > 24;
  return (
    <div
      className="qa-feedback-hover-overlay"
      style={{
        left: info.left,
        top: info.top,
        width: info.width,
        height: info.height,
      }}
    >
      <span
        className="qa-feedback-hover-label"
        style={
          labelAbove
            ? { top: -22 }
            : { top: info.height + 4 }
        }
      >
        {info.label}
      </span>
    </div>
  );
}
