import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
  spring,
  interpolate,
} from "remotion";
import { COLORS, fullScreen, FONT_FAMILY } from "../styles";
import { slideUp, slideInFromRight, scaleIn, fadeIn, pulse } from "../animations";

interface StepSceneProps {
  stepNumber: number;
  title: string;
  description: string;
  imageSrc: string;
}

export const StepScene: React.FC<StepSceneProps> = ({
  stepNumber,
  title,
  description,
  imageSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const badgeAnim = scaleIn(frame, fps, 3);
  const titleAnim = slideUp(frame, fps, 8);
  const descAnim = slideUp(frame, fps, 15);
  const imageAnim = slideInFromRight(frame, fps, 5);
  const imageFloat = Math.sin(frame / 30) * 5;

  // Background decorative circles
  const circleOpacity = fadeIn(frame, 0, 20) * 0.08;
  const circleScale = pulse(frame, fps, 0.8);

  // Progress dots
  const dots = Array.from({ length: 5 }, (_, i) => {
    const isActive = i + 1 === stepNumber;
    const isPast = i + 1 < stepNumber;
    const dotAnim = scaleIn(frame, fps, 2 + i * 3);

    return (
      <div
        key={i}
        style={{
          width: isActive ? 40 : 12,
          height: 12,
          borderRadius: 6,
          background: isActive
            ? COLORS.orange
            : isPast
            ? COLORS.orange + "80"
            : COLORS.textLight + "30",
          margin: "0 5px",
          transform: `scale(${dotAnim.scale})`,
          opacity: dotAnim.opacity,
          transition: "width 0.3s",
        }}
      />
    );
  });

  return (
    <div
      style={{
        ...fullScreen,
        flexDirection: "row",
        background: COLORS.bg,
        padding: "80px 100px",
        position: "relative",
      }}
    >
      {/* Background decorative elements */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          border: `3px solid ${COLORS.orange}`,
          opacity: circleOpacity,
          transform: `scale(${circleScale})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: -80,
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: `3px solid ${COLORS.blue}`,
          opacity: circleOpacity,
          transform: `scale(${circleScale})`,
        }}
      />

      {/* Left side - Text content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingRight: 60,
          zIndex: 1,
        }}
      >
        {/* Step badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            transform: `scale(${badgeAnim.scale})`,
            opacity: badgeAnim.opacity,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: COLORS.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_FAMILY,
              fontSize: 28,
              fontWeight: 800,
              color: COLORS.white,
              boxShadow: `0 4px 20px ${COLORS.orange}40`,
            }}
          >
            {stepNumber}
          </div>
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 18,
              fontWeight: 600,
              color: COLORS.orange,
              textTransform: "uppercase",
              letterSpacing: 3,
            }}
          >
            Step {stepNumber} of 5
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 64,
            fontWeight: 800,
            color: COLORS.text,
            margin: "0 0 20px 0",
            lineHeight: 1.1,
            letterSpacing: -1,
            transform: `translateY(${titleAnim.translateY}px)`,
            opacity: titleAnim.opacity,
          }}
        >
          {title}
        </h2>

        {/* Description */}
        <p
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 26,
            color: COLORS.textLight,
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 500,
            transform: `translateY(${descAnim.translateY}px)`,
            opacity: descAnim.opacity,
          }}
        >
          {description}
        </p>

        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 50,
          }}
        >
          {dots}
        </div>
      </div>

      {/* Right side - Image */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <div
          style={{
            transform: `translateX(${imageAnim.translateX}px) translateY(${imageFloat}px)`,
            opacity: imageAnim.opacity,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: `0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)`,
          }}
        >
          <Img
            src={staticFile(imageSrc)}
            style={{
              maxWidth: 750,
              maxHeight: 700,
              objectFit: "contain",
              borderRadius: 24,
            }}
          />
        </div>
      </div>
    </div>
  );
};
