"use client";

import { useEffect, useRef } from "react";
import { usePxPastCover, useViewportHeight } from "../../lib/hooks";

// Bubbles only start once the wave has covered the screen. They rise slowly on their own (so the water
// stays alive while you stop to read), and while scrollBoost is on, scrolling down pushes them up faster.
// Bigger bubbles rise faster than small ones, which gives a parallax feel.
// left = % across the screen, idle = px risen per second on their own, speed = extra px risen per px
// scrolled down, phase = head start in px.
const BUBBLES = [
  { left: 6, size: 24, idle: 46, speed: 4.2, phase: 540, wobble: 8 },
  { left: 19, size: 40, idle: 62, speed: 5.1, phase: 0, wobble: 11 },
  { left: 34, size: 14, idle: 34, speed: 3.3, phase: 420, wobble: 6 },
  { left: 49, size: 32, idle: 54, speed: 4.6, phase: 760, wobble: 9 },
  { left: 63, size: 18, idle: 38, speed: 3.7, phase: 200, wobble: 7 },
  { left: 76, size: 44, idle: 66, speed: 5.3, phase: 620, wobble: 12 },
  { left: 90, size: 22, idle: 42, speed: 4.0, phase: 330, wobble: 8 },
];
const SCROLL_SMOOTH_S = 0.15; // scroll speed is eased over this long, so wheel steps become a smooth surge

// Something that drifts up: idle = px per second on its own, speed = extra px per px scrolled down (while
// boosted), phase = head start in px, loop = px for one trip before it wraps, wobble = sideways sway in px,
// wobbleRate = px of rise per radian of sway, seed = sway phase offset.
type Drifter = { idle: number; speed: number; phase: number; loop: number; wobble: number; wobbleRate: number; seed: number };

// Moves elements up every frame, writing transforms straight to them (no React re-render): they rise on
// their own, and scrolling down adds a smoothed burst on top, scaled by scrollBoost (0..1).
function useRisingDrift(drifters: Drifter[], active: boolean, pastCover: number, scrollBoost: number) {
  const els = useRef<(HTMLElement | null)[]>([]);
  const live = useRef({ drifters, pastCover, scrollBoost });
  useEffect(() => {
    live.current = { drifters, pastCover, scrollBoost };
  });

  useEffect(() => {
    if (!active) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // then only scroll moves them
    const traveled = live.current.drifters.map((d) => d.phase);
    let last = performance.now();
    let lastScroll = live.current.pastCover;
    let velocity = 0; // px scrolled per second, eased
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { drifters, pastCover, scrollBoost } = live.current;
      const instant = dt > 0 ? (pastCover - lastScroll) / dt : 0;
      lastScroll = pastCover;
      velocity += (instant - velocity) * (1 - Math.exp(-dt / SCROLL_SMOOTH_S));

      drifters.forEach((d, i) => {
        const rise = (still ? 0 : d.idle) + d.speed * scrollBoost * Math.max(0, velocity); // scrolling up doesn't pull them back
        traveled[i] = (traveled[i] + rise * dt) % d.loop;
        const x = Math.sin(traveled[i] / d.wobbleRate + d.seed) * d.wobble;
        const el = els.current[i];
        if (el) el.style.transform = `translate(${x}px, -${traveled[i]}px)`;
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return els;
}

// scrollBoost 0..1: how much scrolling speeds the bubbles up (1 on the way down to About, 0 once there).
export function SeaFloorBubbles({ scrollBoost = 1 }: { scrollBoost?: number }) {
  const pastCover = usePxPastCover();
  const vh = useViewportHeight();
  const active = pastCover > 0 && vh > 0;
  const els = useRisingDrift(
    BUBBLES.map((b, i) => ({ ...b, loop: vh + b.size * 2, wobbleRate: 48, seed: i * 2 })),
    active,
    pastCover,
    scrollBoost,
  );

  if (!active) return null;

  const entrance = Math.min(1, pastCover / 40); // one-time fade-in, not tied to height

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 4, // above the wave crest(4), below Intro(20)
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {BUBBLES.map((b, i) => {
        return (
          <span
            key={i}
            ref={(el) => {
              els.current[i] = el;
            }}
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
              // transform is set every frame by the effect above
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

// Soft diagonal shafts of light from the surface. They fade in once the wave has covered the
// screen, then dim with depth, and drift sideways slowly as you scroll.
const RAYS = [
  { left: 6, width: 10, alpha: 0.66, drift: 0.04 },
  { left: 28, width: 7, alpha: 0.2, drift: 0.07 },
  { left: 50, width: 12, alpha: 0.68, drift: 0.03 },
  { left: 73, width: 8, alpha: 0.2, drift: 0.06 },
];

export function SeaLightRays() {
  const pastCover = usePxPastCover();
  const vh = useViewportHeight();
 
  if (pastCover <= 0 || vh === 0) return null;

  const entrance = Math.min(1, pastCover / 200);
  const depth = Math.min(1, pastCover / (vh * 1.2));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 4,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: entrance * (1 - 0.7 * depth),
      }}
    >
      {RAYS.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "-15vh",
            left: `${r.left}%`,
            width: `${r.width}vw`,
            height: "140vh",
            transformOrigin: "top center",
            transform: `rotate(16deg) translateX(${pastCover * r.drift}px)`,
            background: `linear-gradient(to right, transparent, rgba(255,255,255,${r.alpha}), transparent)`,
            maskImage: "linear-gradient(to bottom, #000, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000, transparent 85%)",
          }}
        />
      ))}
    </div>
  );
}

// Tiny drifting specks (marine snow). Like the bubbles they drift up slowly on their own and get pushed
// faster by scrolling while scrollBoost is on, but much slower than the bubbles.
const SNOW = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 53 + 7) % 100,
  size: 1.5 + ((i * 7) % 3),
  idle: 6 + ((i * 17) % 10) * 1.4, // px per second on their own
  speed: 0.25 + ((i * 13) % 10) / 20,
  phase: (i * 397) % 1200,
  alpha: 0.3 + ((i * 11) % 5) / 10,
}));

// scrollBoost 0..1: how much scrolling speeds the specks up (1 on the way down to About, 0 once there).
export function SeaSnow({ scrollBoost = 1 }: { scrollBoost?: number }) {
  const pastCover = usePxPastCover();
  const vh = useViewportHeight();
  const active = pastCover > 0 && vh > 0;
  const els = useRisingDrift(
    SNOW.map((f, i) => ({ ...f, loop: vh + 20, wobble: 6, wobbleRate: 70, seed: i })),
    active,
    pastCover,
    scrollBoost,
  );

  if (!active) return null;

  const entrance = Math.min(1, pastCover / 200);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none", overflow: "hidden" }}>
      {SNOW.map((s, i) => {
        return (
          <span
            key={i}
            ref={(el) => {
              els.current[i] = el;
            }}
            style={{
              position: "absolute",
              left: `${s.left}%`,
              bottom: -10,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              background: "white",
              opacity: entrance * s.alpha, // transform is set every frame by useRisingDrift
            }}
          />
        );
      })}
    </div>
  );
}

// Darkens the scene a small step for each deeper zone you travel into (About = 0, Projects = 1, ...).
// Sits over the water and sand but under the bubbles and section text.
const ZONE_DARKEN = 0.14; // opacity added per zone
export function SeaZoneTint({ depth }: { depth: number }) {
  if (depth <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 6,
        pointerEvents: "none",
        background: "#04182b",
        opacity: Math.min(0.6, depth * ZONE_DARKEN),
      }}
    />
  );
}
