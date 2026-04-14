import { interpolate, spring, SpringConfig } from "remotion";

export const SPRING_CONFIG: SpringConfig = {
  damping: 12,
  mass: 0.5,
  stiffness: 100,
};

export const SPRING_SLOW: SpringConfig = {
  damping: 15,
  mass: 0.8,
  stiffness: 80,
};

export function fadeIn(frame: number, start: number, duration = 15): number {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function fadeOut(frame: number, start: number, duration = 15): number {
  return interpolate(frame, [start, start + duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function slideUp(
  frame: number,
  fps: number,
  delay = 0
): { translateY: number; opacity: number } {
  const s = spring({ frame: frame - delay, fps, config: SPRING_CONFIG });
  return {
    translateY: interpolate(s, [0, 1], [60, 0]),
    opacity: s,
  };
}

export function slideInFromRight(
  frame: number,
  fps: number,
  delay = 0
): { translateX: number; opacity: number } {
  const s = spring({ frame: frame - delay, fps, config: SPRING_CONFIG });
  return {
    translateX: interpolate(s, [0, 1], [200, 0]),
    opacity: s,
  };
}

export function scaleIn(
  frame: number,
  fps: number,
  delay = 0
): { scale: number; opacity: number } {
  const s = spring({ frame: frame - delay, fps, config: SPRING_CONFIG });
  return {
    scale: interpolate(s, [0, 1], [0.5, 1]),
    opacity: s,
  };
}

export function pulse(frame: number, fps: number, speed = 2): number {
  return 1 + 0.03 * Math.sin((frame / fps) * Math.PI * speed);
}
