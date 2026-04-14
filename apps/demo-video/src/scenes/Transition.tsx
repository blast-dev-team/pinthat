import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, fullScreen, FONT_FAMILY } from "../styles";

interface TransitionProps {
  text?: string;
}

export const Transition: React.FC<TransitionProps> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Expanding circle wipe
  const circleProgress = spring({
    frame,
    fps,
    config: { damping: 20, mass: 0.8, stiffness: 60 },
  });
  const circleSize = interpolate(circleProgress, [0, 1], [0, 3000]);

  // Text fade
  const textOpacity = interpolate(frame, [5, 15, 20, 30], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        ...fullScreen,
        background: COLORS.bg,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          background: COLORS.gradient,
          opacity: 0.1,
        }}
      />
      {text && (
        <p
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 32,
            color: COLORS.orange,
            fontWeight: 700,
            opacity: textOpacity,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
};
