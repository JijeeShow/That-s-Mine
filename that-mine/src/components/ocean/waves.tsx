"use client";

import type { ReactNode } from "react";
import { DEEP_EDGE_COLOR, DEEP_EDGE_COLOR_BACK } from "../../lib/const/constants";
import { useScrollPx } from "../scrollBridge";
import { WAVE_FRONT_TOP_OFFSET_PX, WAVE_RISE_SPEED } from "../../lib/hooks";

// Irregular wave outline from a list of alternating crest/trough heights (y,
// smaller = higher). One period is 1200 units and the pattern is drawn twice
// across the 2400-wide svg, so the wave-sway keyframe (-50%) loops with no
// seam. Falling edges are steeper than rising ones so crests lean forward.
function waveLine(ys: number[]) {
  const n = ys.length;
  const w = 1200 / n;
  let d = `M0,${ys[0]}`;
  for (let p = 0; p < 2; p++) {
    for (let i = 0; i < n; i++) {
      const x0 = p * 1200 + i * w;
      const y0 = ys[i];
      const y1 = ys[(i + 1) % n];
      const k = y1 > y0 ? 0.36 : 0.56; // falling edge: tighter control handles = steeper
      d += ` C${(x0 + w * k).toFixed(1)},${y0} ${(x0 + w * (1 - k)).toFixed(1)},${y1} ${(x0 + w).toFixed(1)},${y1}`;
    }
  }
  return d;
}
const waveFill = (ys: number[]) => `${waveLine(ys)} L2400,300 L0,300 Z`;

const WAVE_BACK = [48, 24, 52, 30, 56];
const WAVE_MID = [46, 20, 42, 14, 48, 26, 40];
const WAVE_FRONT = [44, 14, 38, 24, 46, 18];
const WAVE_MID_COLOR = "#2c86a6"; // between --sea-deep and --sea-mid, so layers step lighter toward the front

// All three layers rise at the same speed, so these offsets keep a constant gap between them.
const WAVE_BACK_TOP_OFFSET_PX = 64;
const WAVE_MID_TOP_OFFSET_PX = 82;

// One wave layer: a tall box that starts just below the viewport and rises
// with scroll. Inside, a swell wrapper rocks up and down (each layer on its own
// period, so they drift in and out of phase) around an svg twice its width that sways sideways.
function WaveLayer({
  topOffsetPx,
  zIndex,
  liftPx,
  swayDuration,
  bobDuration,
  reverse,
  children,
}: {
  topOffsetPx: number;
  zIndex: number;
  liftPx: number;
  swayDuration: number;
  bobDuration: number;
  reverse?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: `calc(100% + ${topOffsetPx}px)`,
        left: 0,
        width: "100%",
        height: 700,
        zIndex,
        overflow: "hidden",
        pointerEvents: "none",
        transform: `translateY(-${liftPx}px)`,
      }}
    >
      <div style={{ height: "100%", animation: `wave-bob ${bobDuration}s ease-in-out infinite alternate` }}>
        <svg
          viewBox="0 0 2400 300"
          preserveAspectRatio="none"
          style={{
            width: "200%",
            height: "100%",
            display: "block",
            animation: `wave-sway ${swayDuration}s linear infinite${reverse ? " reverse" : ""}`,
          }}
        >
          {children}
        </svg>
      </div>
    </div>
  );
}

// Three wave layers (dark back, mid, light front with crest) rising as you scroll to cover the screen.
export default function DeepWaveSeam() {
  const px = useScrollPx();
  const liftPx = px * WAVE_RISE_SPEED;

  return (
    <>
      <WaveLayer topOffsetPx={WAVE_BACK_TOP_OFFSET_PX} zIndex={3} liftPx={liftPx} swayDuration={26} bobDuration={7}>
        <path d={waveFill(WAVE_BACK)} fill={DEEP_EDGE_COLOR_BACK} />
        <path d={waveLine(WAVE_BACK)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      </WaveLayer>

      <WaveLayer topOffsetPx={WAVE_MID_TOP_OFFSET_PX} zIndex={3} liftPx={liftPx} swayDuration={19} bobDuration={5.3}>
        <path d={waveFill(WAVE_MID)} fill={WAVE_MID_COLOR} />
        <path d={waveLine(WAVE_MID)} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      </WaveLayer>

      <WaveLayer topOffsetPx={WAVE_FRONT_TOP_OFFSET_PX} zIndex={4} liftPx={liftPx} swayDuration={16} bobDuration={4.2} reverse>
        <defs>
          {/* Lighter crest settling into the body color */}
          <linearGradient id="waveFrontFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#97e1ee" />
            <stop offset="9%" stopColor="#7fd6e8" />
            <stop offset="24%" stopColor={DEEP_EDGE_COLOR} />
          </linearGradient>
          <filter id="waveGlow" x="-20%" y="-300%" width="140%" height="700%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={waveFill(WAVE_FRONT)} fill="url(#waveFrontFill)" />
        <path
          d={waveLine(WAVE_FRONT)}
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#waveGlow)"
        />
      </WaveLayer>
    </>
  );
}
