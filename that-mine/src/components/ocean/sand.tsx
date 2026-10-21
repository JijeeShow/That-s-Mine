"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  usePxPastCover,
  useSmoothValue,
  useViewportHeight,
} from "../../lib/hooks";

const Rock3D = dynamic(() => import("../Rock3D"), { ssr: false });

const SEA_FLOOR_RISE_SPEED = 3; // px risen per px scrolled once the wave has covered the screen
const SEA_FLOOR_DELAY_PX = 300; // extra scroll after the wave covers the screen before the sand starts rising
const SEA_FLOOR_HOLD_PX = 400; // scroll px the sand stays still after reaching its resting spot, before it starts flowing
export const PX_PER_LAYER = 300; // scroll px for one sand layer to flow forward by one place

// Sand is an endless conveyor of numbered layers n = 0, 1, 2, ... Layer n sits at depth p = n - t:
// 0 = front, 1 = middle, 2 = back, 3 = just appearing on the horizon, -3 = fully off the bottom (removed).
// Each layer uses one of the PATTERNS (dune shape + its corals/rocks), so they flow with it.

// Values at p = -3, -2, -1, 0, 1, 2, 3 (smooth curve between). Layers keep sinking well past -1, so rocks
// standing on a hilltop are fully below the screen before the layer is removed.
const TOP_VH = [56, 41, 26, 11, 7.5, 2.2, -0.5]; // where the dune's top edge sits below the strip's top, in vh
const SAND_FROM = [
  "#f3e3b8",
  "#f3e3b8",
  "#f3e3b8",
  "#f3e3b8",
  "#e0c386",
  "#c9a468",
  "#b08f58",
];
const SAND_TO = [
  "#d9bb82",
  "#d9bb82",
  "#d9bb82",
  "#d9bb82",
  "#c2a066",
  "#a8854f",
  "#8f7348",
];

// Each pattern is a terrain profile: surface height at 9 evenly spaced points across the screen,
// in vh below the layer's top line (negative = a hill rising above it, positive = a dip).
// Items stand on that surface wherever they are: at = center, % across; h = height in vh;
// sink = how far the base sits below the surface, in vh. Cliffs also need w (box width in vh).
type Item = { file?: string; cliff?: number; at: number; w?: number; h: number; sink: number };
const PATTERNS: { surface: number[]; items: Item[] }[] = [
  {
    // twin peaks with a dip between
    surface: [2, -3, -6, -2, 2.5, 1, -4.5, -2, 1.5],
    items: [
      { file: "coral_1_blue.png", at: 25, h: 18, sink: 5.5 },
      { file: "coral_8_indigo.png", at: 75, h: 18, sink: 1.5 },
      { file: "coral_2_pink.png", at: 51, h: 11, sink: 7 },
    ],
  },
  {
    // low on the left, rising to a plateau with a rock on top
    surface: [3, 1.5, 2, 0, -3, -6, -6.5, -5, -2],
    items: [
      { cliff: 4, at: 74, w: 54, h: 52, sink: 35 },
      { file: "coral_4_green.png", at: 14, h: 20, sink: 9.5 },
      { file: "coral_6_yellow.png", at: 38, h: 12, sink: 3 },
    ],
  },
  {
    // one big hill in the middle
    surface: [3, 2, -1, -6, -8.5, -5.5, -0.5, 2.5, 3],
    items: [
      { file: "coral_3_orange.png", at: 50, h: 18, sink: 7.5 },
      { file: "coral_5_red.png", at: 22, h: 15, sink: 4.5 },
      { file: "coral_7_purple.png", at: 80, h: 14, sink: 12.5 },
    ],
  },
  {
    // a valley between two rises, rock on the left slope
    surface: [-5, -6, -2, 2.5, 3.5, 2, -2, -5.5, -4],
    items: [
      { cliff: 3, at: 14, w: 54, h: 52, sink: 40 },
      { file: "coral_2_pink.png", at: 49, h: 13, sink: 3 },
      { file: "coral_8_indigo.png", at: 86, h: 16, sink: 3.5 },
    ],
  },
  {
    // gentle rolling swells
    surface: [0, -2.5, 0.5, -3, 1, -2, 1.5, -1.5, 0.5],
    items: [
      { file: "coral_4_green.png", at: 20, h: 18, sink: 5.5 },
      { file: "coral_6_yellow.png", at: 56, h: 13, sink: 6 },
      { file: "coral_1_blue.png", at: 84, h: 16, sink: 2.5 },
    ],
  },
];

// Catmull-Rom through evenly spaced heights. With even x spacing the curve's x is linear in the
// segment parameter, so the same formula both draws the path and tells the height under any point.
const catmull = (p0: number, p1: number, p2: number, p3: number, f: number) =>
  0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f);

function surfaceAt(ys: number[], atPercent: number) {
  const x = (Math.min(100, Math.max(0, atPercent)) / 100) * (ys.length - 1);
  const i = Math.min(ys.length - 2, Math.floor(x));
  const y = (k: number) => ys[Math.min(ys.length - 1, Math.max(0, k))];
  return catmull(y(i - 1), y(i), y(i + 1), y(i + 2), x - i);
}

// Smooth outline through the heights (x in 0..1900, y in vh), as cubic Beziers.
function surfacePath(ys: number[]) {
  const dx = 1900 / (ys.length - 1);
  const y = (k: number) => ys[Math.min(ys.length - 1, Math.max(0, k))];
  let d = `M0,${y(0)}`;
  for (let i = 0; i < ys.length - 1; i++) {
    const c1 = y(i) + (y(i + 1) - y(i - 1)) / 6;
    const c2 = y(i + 1) - (y(i + 2) - y(i)) / 6;
    d += ` C${(i + 1 / 3) * dx},${c1.toFixed(2)} ${(i + 2 / 3) * dx},${c2.toFixed(2)} ${(i + 1) * dx},${y(i + 1)}`;
  }
  return d;
}

// Random but never repeats a pattern within the last 2 layers, so neighbours always differ.
// Seeded so one page load is consistent while scrolling back and forth.
function makeSequence(seed: number, length: number) {
  let s = seed >>> 0;
  const rand = () => {
    s += 0x6d2b79f5;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const seq: number[] = [];
  for (let n = 0; n < length; n++) {
    const recent = seq.slice(-2);
    const choices = PATTERNS.map((_, i) => i).filter(
      (i) => !recent.includes(i),
    );
    seq.push(choices[Math.floor(rand() * choices.length)]);
  }
  return seq;
}

// Catmull-Rom through the points, so speed changes smoothly as a layer passes each depth (no kinks).
function sample(points: number[], p: number) {
  const n = points.length;
  const x = Math.min(n - 1, Math.max(0, p + 3));
  const i = Math.min(n - 2, Math.floor(x));
  const f = x - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(n - 1, i + 2)];
  return (
    0.5 *
    (2 * p1 +
      (p2 - p0) * f +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f +
      (3 * p1 - p0 - 3 * p2 + p3) * f * f * f)
  );
}

function sampleColor(hexes: string[], p: number) {
  const x = Math.min(hexes.length - 1, Math.max(0, p + 3));
  const i = Math.min(hexes.length - 2, Math.floor(x));
  const f = x - i;
  const ch = (k: number) => {
    const a = parseInt(hexes[i].slice(k, k + 2), 16);
    const b = parseInt(hexes[i + 1].slice(k, k + 2), 16);
    return Math.round(a + (b - a) * f);
  };
  return `rgb(${ch(1)},${ch(3)},${ch(5)})`;
}

// The layer's svg spans from SVG_TOP_VH above its top line to SVG_BOTTOM_VH below it, with y in vh,
// so hills can rise above the line and the sand still reaches past the bottom of the screen.
const SVG_TOP_VH = -15;
const SVG_BOTTOM_VH = 40;

function SandLayer({ n, p, pattern }: { n: number; p: number; pattern: (typeof PATTERNS)[number] }) {
  const { surface, items } = pattern;
  const top = sample(TOP_VH, p);
  const scale = 1 - 0.1 * Math.min(3, Math.max(0, p)); // corals shrink slightly with distance
  const itemOpacity = Math.min(1, Math.max(0, (2.5 - p) / 0.5)); // items appear only once their dune has mostly faded in
  const line = surfacePath(surface);
  const body = `${line} L1900,${SVG_BOTTOM_VH} L0,${SVG_BOTTOM_VH} Z`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: Math.round(100 - p * 10), // nearer layers cover the bases of farther ones
        opacity: Math.min(1, Math.max(0, 3 - p)), // the new layer fades in on the horizon
        transform: `translateY(${top}vh)`,
      }}
    >
      <svg
        viewBox={`0 ${SVG_TOP_VH} 1900 ${SVG_BOTTOM_VH - SVG_TOP_VH}`}
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: 0,
          top: `${SVG_TOP_VH}vh`,
          width: "100%",
          height: `${SVG_BOTTOM_VH - SVG_TOP_VH}vh`,
          display: "block",
          overflow: "visible",
        }}
      >
        <defs>
          {/* Fixed in vh, not per shape: hilltops catch the light and dips sit in shade */}
          <linearGradient id={`sandLayer${n}`} gradientUnits="userSpaceOnUse" x1="0" y1="-9" x2="0" y2="14">
            <stop offset="0%" stopColor={sampleColor(SAND_FROM, p)} />
            <stop offset="100%" stopColor={sampleColor(SAND_TO, p)} />
          </linearGradient>
          <filter id={`sandShade${n}`} x="-5%" y="-50%" width="110%" height="200%">
            <feGaussianBlur stdDeviation="14 0.9" />
          </filter>
        </defs>
        {/* Soft shadow this layer casts onto the one behind it */}
        <path d={body} transform="translate(0,-1.1)" fill="rgba(70,45,15,0.22)" filter={`url(#sandShade${n})`} />
        <path d={body} fill={`url(#sandLayer${n})`} />
        {/* Thin rim of light along the crest */}
        <path d={line} fill="none" stroke="rgba(255,246,220,0.6)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>

      {items.map(({ file, cliff, at, w = 0, h, sink }) => {
        const ground = surfaceAt(surface, at); // vh below the layer's top line
        if (cliff) {
          // No scale on anything holding a WebGL canvas: a size change would reallocate its buffer.
          return (
            <div
              key={`cliff${cliff}`}
              style={{
                position: "absolute",
                left: `calc(${at}% - ${w / 2}vh)`,
                top: `${ground + sink - h}vh`,
                width: `${w}vh`,
                height: `${h}vh`,
                opacity: itemOpacity,
              }}
            >
              <Rock3D url={`/models/Environment_Cliff${cliff}.gltf`} />
            </div>
          );
        }
        return (
          <div
            key={`${file}${at}`}
            style={{
              position: "absolute",
              left: `${at}%`,
              top: `${ground + sink - h}vh`,
              height: `${h}vh`,
              opacity: itemOpacity,
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: "bottom center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/corals/${file}`}
              alt=""
              style={{
                display: "block",
                height: "100%",
                width: "auto",
                maskImage: "linear-gradient(to bottom, #000 90%, transparent 95%)",
                WebkitMaskImage: "linear-gradient(to bottom, #000 90%, transparent 95%)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// Scroll-driven state of the sea floor, shared so OceanScene can also react to it.
// offset = px the strip still sits below its resting spot; t = layers flowed forward so far
// (0 while the sand is rising or holding still).
export function useSandFlow() {
  const vh = useViewportHeight();
  const pastCover = usePxPastCover();
  const riseDistance = vh / SEA_FLOOR_RISE_SPEED;
  const pastDelay = Math.max(0, pastCover - SEA_FLOOR_DELAY_PX);
  // Both the rise and the flow ease toward their scroll-driven targets, so they glide together.
  const risen = useSmoothValue(
    Math.min(vh, pastDelay * SEA_FLOOR_RISE_SPEED),
    0.12,
    0.3,
  );
  const t = useSmoothValue(
    Math.max(0, pastDelay - riseDistance - SEA_FLOOR_HOLD_PX) / PX_PER_LAYER,
    0.1,
    0.0015,
  );
  return { offset: vh - risen, t };
}

// Sea floor strip. Starts a screen below and rises with scroll once the wave covers the
// screen; after it settles and holds, further scrolling flows the sand layers forward (front layer
// slides off the bottom, the rest move up a place, a new one appears at the back).
export default function SeaFloor({ offset, t }: { offset: number; t: number }) {
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const sequence = useMemo(() => makeSequence(seed, 64), [seed]);

  // Fetch every rock model up front, so a rock never waits on the network when its layer arrives.
  useEffect(() => {
    const cliffs = new Set(PATTERNS.flatMap((pt) => pt.items.flatMap((it) => (it.cliff ? [it.cliff] : []))));
    import("../Rock3D").then(({ preloadRock }) => cliffs.forEach((c) => preloadRock(`/models/Environment_Cliff${c}.gltf`)));
  }, []);

  const layers = [];
  for (let n = Math.max(0, Math.floor(t) - 3); n <= Math.floor(t) + 4; n++) {
    const p = n - t;
    // The next layer is mounted one step early (3 <= p < 4) while still invisible, so its rock's
    // canvas is built and drawn before it fades in on the horizon.
    if (p < -3 || p >= 4) continue;
    layers.push(
      <SandLayer
        key={n}
        n={n}
        p={p}
        pattern={PATTERNS[sequence[n % sequence.length]]}
      />,
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "22vh",
        zIndex: 4, // same tier as the wave front - DOM order puts it on top
        pointerEvents: "none",
        transform: `translateY(${offset}px)`, // no overflow:hidden - rocks and corals rise above the strip's own box
      }}
    >
      {layers}
    </div>
  );
}
