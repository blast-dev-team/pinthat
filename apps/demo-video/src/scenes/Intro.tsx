import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { COLORS, fullScreen, FONT_FAMILY } from "../styles";
import { fadeIn, scaleIn, slideUp, pulse } from "../animations";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoAnim = scaleIn(frame, fps, 3);
  const titleAnim = slideUp(frame, fps, 10);
  const subtitleAnim = slideUp(frame, fps, 18);
  const taglineAnim = slideUp(frame, fps, 28);

  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const x = (i * 137.5) % 100;
    const y = ((i * 73.7) % 100);
    const size = 4 + (i % 5) * 3;
    const speed = 0.3 + (i % 4) * 0.15;
    const offset = i * 30;
    const currentY = y + Math.sin((frame + offset) / (30 / speed)) * 8;
    const currentX = x + Math.cos((frame + offset) / (40 / speed)) * 5;
    const opacity = fadeIn(frame, i * 2, 20) * 0.15;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${currentX}%`,
          top: `${currentY}%`,
          width: size,
          height: size,
          borderRadius: "50%",
          background: i % 2 === 0 ? COLORS.orange : COLORS.blue,
          opacity,
        }}
      />
    );
  });

  // Radial glow behind logo
  const glowScale = pulse(frame, fps, 1.5);
  const glowOpacity = fadeIn(frame, 0, 30) * 0.4;

  return (
    <div
      style={{
        ...fullScreen,
        background: `radial-gradient(ellipse at center, ${COLORS.orangeLight} 0%, ${COLORS.bg} 70%)`,
        position: "relative",
      }}
    >
      {particles}

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.orange}30 0%, transparent 70%)`,
          transform: `scale(${glowScale})`,
          opacity: glowOpacity,
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoAnim.scale})`,
          opacity: logoAnim.opacity,
          marginBottom: 30,
        }}
      >
        <Img
          src={staticFile("pinthat_logo.svg")}
          style={{ width: 160, height: 160 }}
        />
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 90,
          fontWeight: 800,
          color: COLORS.brown,
          margin: 0,
          letterSpacing: -2,
          transform: `translateY(${titleAnim.translateY}px)`,
          opacity: titleAnim.opacity,
        }}
      >
        Pin
        <span style={{ color: COLORS.orange }}>That</span>
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 36,
          color: COLORS.textLight,
          margin: "16px 0 0 0",
          fontWeight: 500,
          transform: `translateY(${subtitleAnim.translateY}px)`,
          opacity: subtitleAnim.opacity,
        }}
      >
        Point. Pin. Prompt.
      </p>

      {/* Tagline */}
      <div
        style={{
          marginTop: 40,
          padding: "14px 40px",
          borderRadius: 50,
          background: COLORS.gradient,
          transform: `translateY(${taglineAnim.translateY}px)`,
          opacity: taglineAnim.opacity,
        }}
      >
        <p
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 24,
            color: COLORS.white,
            margin: 0,
            fontWeight: 600,
          }}
        >
          AI-Ready QA Feedback in Seconds
        </p>
      </div>
    </div>
  );
};
