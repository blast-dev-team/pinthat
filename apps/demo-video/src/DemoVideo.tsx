import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { Intro } from "./scenes/Intro";
import { StepScene } from "./scenes/StepScene";
import { Outro } from "./scenes/Outro";

const STEPS = [
  {
    title: "Turn on\nExtension",
    description:
      "Click the PinThat icon in your browser toolbar and toggle QA mode on. You're ready to inspect.",
    image: "step1.png",
  },
  {
    title: "Pin Point",
    description:
      "Hover over any element on the page — a highlight overlay appears. Click to select the element you want to change.",
    image: "step2.png",
  },
  {
    title: "Describe\nYour Vibe",
    description:
      'Type what you want to change. "Make this dark mode", "Add a search bar", or "Move this button left."',
    image: "step3.png",
  },
  {
    title: "Copy the\nPrompt",
    description:
      "Click Export to generate a structured, AI-ready markdown prompt. Copy it to your clipboard in one click.",
    image: "step4.png",
  },
  {
    title: "Paste &\nExecute",
    description:
      "Paste into Claude Code, Cursor, or ChatGPT. Let AI implement your changes instantly.",
    image: "step5.png",
  },
];

// Timeline (in frames at 30fps) — no transition gaps
const INTRO_START = 0;
const INTRO_DURATION = 75; // 2.5 seconds

const STEP_DURATION = 75; // 2.5 seconds each

const STEP_1_START = INTRO_DURATION;
const STEP_2_START = STEP_1_START + STEP_DURATION;
const STEP_3_START = STEP_2_START + STEP_DURATION;
const STEP_4_START = STEP_3_START + STEP_DURATION;
const STEP_5_START = STEP_4_START + STEP_DURATION;

const OUTRO_START = STEP_5_START + STEP_DURATION;
const OUTRO_DURATION = 75; // 2.5 seconds

export const DemoVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Quick fade-in only (no fade-out since scenes are only 1s)
  const sceneOpacity = (start: number) => {
    return interpolate(frame, [start, start + 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  const stepStarts = [STEP_1_START, STEP_2_START, STEP_3_START, STEP_4_START, STEP_5_START];

  return (
    <AbsoluteFill style={{ background: "#FDF8F4" }}>
      {/* Intro */}
      <Sequence from={INTRO_START} durationInFrames={INTRO_DURATION}>
        <AbsoluteFill style={{ opacity: sceneOpacity(INTRO_START) }}>
          <Intro />
        </AbsoluteFill>
      </Sequence>

      {/* Steps — direct crossfade, no transition scenes */}
      {STEPS.map((step, i) => {
        const stepStart = stepStarts[i];
        return (
          <Sequence key={i} from={stepStart} durationInFrames={STEP_DURATION}>
            <AbsoluteFill style={{ opacity: sceneOpacity(stepStart) }}>
              <StepScene
                stepNumber={i + 1}
                title={step.title}
                description={step.description}
                imageSrc={step.image}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Outro */}
      <Sequence from={OUTRO_START} durationInFrames={OUTRO_DURATION}>
        <AbsoluteFill style={{ opacity: sceneOpacity(OUTRO_START) }}>
          <Outro />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
