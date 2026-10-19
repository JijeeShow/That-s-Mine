"use client";

import { usePxPastCover, useViewportHeight } from "../../lib/hooks";

// Bubbles only start once the wave has covered the screen. Each one is driven
// directly by scroll px (not a CSS timer), so they only move while scrolling.
// Bigger bubbles rise faster than small ones, which gives a parallax feel.
// left = % across the screen, speed = px risen per px scrolled, phase = head start in px.
const BUBBLES = [
  { left: 6, size: 24, speed: 4.2, phase: 540, wobble: 8 },
  { left: 19, size: 40, speed: 5.1, phase: 0, wobble: 11 },
  { left: 34, size: 14, speed: 3.3, phase: 420, wobble: 6 },
  { left: 49, size: 32, speed: 4.6, phase: 760, wobble: 9 },
  { left: 63, size: 18, speed: 3.7, phase: 200, wobble: 7 },
  { left: 76, size: 44, speed: 5.3, phase: 620, wobble: 12 },
  { left: 90, size: 22, speed: 4.0, phase: 330, wobble: 8 },
];

export function SeaFloorBubbles() {
  const pastCover = usePxPastCover();
  const vh = useViewportHeight();

  if (pastCover <= 0 || vh === 0) return null;

  const entrance = Math.min(1, pastCover / 40); // one-time fade-in, not tied to height

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5, // above the wave crest(4), below Intro(20)
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {BUBBLES.map((b, i) => {
        const loop = vh + b.size * 2; // one full trip from below the screen to above it
        const traveled = (pastCover * b.speed + b.phase) % loop;
        const x = Math.sin(traveled / 48 + i * 2) * b.wobble;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${b.left}%`,
              bottom: -b.size,
              width: b.size,
              height: b.size,
              borderRadius: "50%",
              // Clear body that thickens at the edge, with a cool tint low and a warm one high, like a real soap-film bubble.
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 52%, rgba(190,235,255,0.28) 78%, rgba(255,255,255,0.5) 100%)",
              boxShadow:
                "inset -2px -3px 6px rgba(120,200,255,0.35), inset 2px 2px 5px rgba(255,255,255,0.35), 0 0 6px rgba(255,255,255,0.18)",
              opacity: entrance * (0.6 + b.size / 120), // small ones fainter
              transform: `translate(${x}px, -${traveled}px)`,
            }}
          >
            {/* Glint on the upper-left */}
            <span
              style={{
                position: "absolute",
                left: "18%",
                top: "14%",
                width: "30%",
                height: "18%",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.85)",
                transform: "rotate(-35deg)",
                filter: "blur(0.4px)",
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

// Blue layer over the water whose opacity follows scroll once the wave has
// covered the screen, so the sea looks deeper as you dive. Sits under the
// sand and bubbles (DOM order), so those keep their own colors.
const DEPTH_TINT_MAX = 0.5; // opacity at the end of the dwell
const DEPTH_TINT_COLOR = "#1160e6";

export function SeaDepthTint() {
  const pastCover = usePxPastCover();
  const vh = useViewportHeight();
  const t = vh > 0 ? Math.min(1, pastCover / (vh * 0.6)) : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 4,
        pointerEvents: "none",
        background: DEPTH_TINT_COLOR,
        opacity: t * DEPTH_TINT_MAX,
      }}
    />
  );
}
