"use client";

import { useScrollPx } from "../scrollBridge";
import { useViewportHeight, WAVE_FRONT_TOP_OFFSET_PX, WAVE_RISE_SPEED } from "../../lib/hooks";

const TEXT_HALF_HEIGHT_PX = 110; // rough half-height of the title block, centered on screen
const CREST_DEPTH_PX = 70; // the crest line sits about this far below the wave layer's top edge

// Title text. Sits under the wave (z-index 2), and fades out as the crest rises up to it, so it is
// gone by the time the wave covers it - computed from the wave position, not a timer, so fast
// scrolling or scrolling back never leaves a faint ghost.
export default function Intro() {
  const px = useScrollPx();
  const vh = useViewportHeight();
  const crestY = vh + WAVE_FRONT_TOP_OFFSET_PX + CREST_DEPTH_PX - px * WAVE_RISE_SPEED;
  const textBottom = vh / 2 + TEXT_HALF_HEIGHT_PX;
  const visible = vh > 0 ? Math.min(1, Math.max(0, (crestY - textBottom) / 120)) : 1;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2, // topmost layer
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 8vw",
        color: "white",
        pointerEvents: "none",
        opacity: visible,
        transform: `translateY(${Math.min(px / 12, 100)}px)`, // sinks slowly toward the wave as you scroll
        textShadow: "0 2px 12px rgba(0,0,0,0.5)",
      }}
    >
      <p
        style={{
          fontSize: "0.95rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          opacity: 0.8,
          margin: 0,
          marginBottom: "0.5rem",
        }}
      >
        Hi there! I&apos;m
      </p>
      <h1
        style={{
          fontSize: "clamp(2.25rem, 7vw, 4rem)",
          fontWeight: 700,
          margin: 0,
        }}
      >
        Kittipat Chofa
      </h1>
      <p
        style={{
          fontSize: "1.15rem",
          opacity: 0.85,
          marginTop: "0.75rem",
          maxWidth: 480,
        }}
      >
        Call me Jijee
      </p>

      {/* Scroll hint */}
      <div
        style={{
          position: "absolute",
          bottom: "6vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.4rem",
          animation: "bounce-down 1.8s ease-in-out infinite",
        }}
      >
        <span
          style={{ fontSize: "0.8rem", letterSpacing: "0.1em", opacity: 0.8 }}
        >
          เลื่อนลง
        </span>
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
          <path
            d="M1 1L10 10L19 1"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

// Small cue on the sand that the page keeps going. Dark text because the front sand is light.
export function DiveHint({ visible }: { visible: number }) {
  if (visible <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "3vh",
        zIndex: 16,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: visible,
      }}
    >
      {/* Frosted pill so the text stays readable over whatever coral sits behind it. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.2rem",
          padding: "0.4rem 1.1rem",
          borderRadius: 999,
          color: "#0d3d50",
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(6px)",
          animation: "bounce-down 1.8s ease-in-out infinite",
        }}
      >
        <span style={{ fontSize: "0.85rem", letterSpacing: "0.08em" }}>เลื่อนลงเพื่อดำต่อ</span>
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
          <path d="M1 1L10 10L19 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
