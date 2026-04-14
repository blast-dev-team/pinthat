import { CSSProperties } from "react";

export const COLORS = {
  bg: "#FDF8F4",
  bgDark: "#1a1a2e",
  orange: "#e47a25",
  orangeLight: "#f8ece4",
  brown: "#7f2e10",
  blue: "#4995cd",
  blueDark: "#1a4c73",
  text: "#2d2d2d",
  textLight: "#6b6b6b",
  white: "#ffffff",
  gradient: "linear-gradient(135deg, #e47a25 0%, #7f2e10 100%)",
};

export const fullScreen: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

export const FONT_FAMILY = "'Inter', 'Helvetica Neue', Arial, sans-serif";
