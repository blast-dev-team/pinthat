import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import { COLORS, fullScreen, FONT_FAMILY } from "../styles";
import { scaleIn, slideUp, fadeIn, pulse } from "../animations";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoAnim = scaleIn(frame, fps, 3);
  const titleAnim = slideUp(frame, fps, 10);
  const ctaAnim = slideUp(frame, fps, 20);
  const badgesAnim = slideUp(frame, fps, 30);
  const pulseScale = pulse(frame, fps, 2);

  // Animated background rings
  const rings = Array.from({ length: 4 }, (_, i) => {
    const delay = i * 15;
    const ringOpacity = fadeIn(frame, delay, 20) * 0.06;
    const size = 300 + i * 200 + frame * 0.5;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: "50%",
          border: `2px solid ${COLORS.orange}`,
          opacity: ringOpacity,
        }}
      />
    );
  });

  return (
    <div
      style={{
        ...fullScreen,
        background: `radial-gradient(ellipse at center, ${COLORS.orangeLight} 0%, ${COLORS.bg} 60%)`,
        position: "relative",
      }}
    >
      {rings}

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoAnim.scale})`,
          opacity: logoAnim.opacity,
          marginBottom: 20,
        }}
      >
        <Img
          src={staticFile("pinthat_logo.svg")}
          style={{ width: 120, height: 120 }}
        />
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 72,
          fontWeight: 800,
          color: COLORS.brown,
          margin: "0 0 16px 0",
          letterSpacing: -2,
          transform: `translateY(${titleAnim.translateY}px)`,
          opacity: titleAnim.opacity,
        }}
      >
        Start Pinning <span style={{ color: COLORS.orange }}>Today</span>
      </h1>

      {/* CTA */}
      <div
        style={{
          transform: `translateY(${ctaAnim.translateY}px) scale(${pulseScale})`,
          opacity: ctaAnim.opacity,
          marginTop: 20,
        }}
      >
        <div
          style={{
            padding: "18px 60px",
            borderRadius: 50,
            background: COLORS.gradient,
            boxShadow: `0 8px 30px ${COLORS.orange}50`,
          }}
        >
          <p
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 30,
              color: COLORS.white,
              margin: 0,
              fontWeight: 700,
            }}
          >
            Get PinThat for Chrome
          </p>
        </div>
      </div>

      {/* Badges */}
      <div
        style={{
          display: "flex",
          gap: 40,
          marginTop: 50,
          transform: `translateY(${badgesAnim.translateY}px)`,
          opacity: badgesAnim.opacity,
        }}
      >
        {["One-Time Purchase", "No Subscription", "Lifetime Access"].map(
          (text, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: COLORS.orange + "20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: COLORS.orange,
                }}
              >
                ✓
              </div>
              <span
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 20,
                  color: COLORS.textLight,
                  fontWeight: 500,
                }}
              >
                {text}
              </span>
            </div>
          )
        )}
      </div>

      {/* URL */}
      <p
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 22,
          color: COLORS.textLight,
          marginTop: 40,
          opacity: fadeIn(frame, 35, 10),
          fontWeight: 400,
        }}
      >
        pinthat.co
      </p>
    </div>
  );
};
