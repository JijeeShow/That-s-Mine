"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { usePxPastCover, useSmoothValue, useViewportHeight } from "../../lib/hooks";

const Rock3D = dynamic(() => import("../Rock3D"), { ssr: false });

const SEA_FLOOR_RISE_SPEED = 3; // px risen per px scrolled once the wave has covered the screen
const SEA_FLOOR_DELAY_PX = 300; // extra scroll after the wave covers the screen before the sand starts rising
const PX_PER_LAYER = 300; // scroll px for one sand layer to flow forward by one place

// Sand is an endless conveyor of numbered layers n = 0, 1, 2, ... Layer n sits at depth p = n - t:
// 0 = front, 1 = middle, 2 = back, 3 = just appearing on the horizon, -2 = fully off the bottom (removed).
// Each layer uses one of the PATTERNS (dune shape + its corals/rocks), so they flow with it.

// Values at p = -2, -1, 0, 1, 2, 3 (smooth curve between). Layers keep sinking past -1 until tall rocks are off screen too.
const TOP_VH = [41, 26, 11, 7.5, 2.2, -0.5]; // where the dune's top edge sits below the strip's top, in vh
const SAND_FROM = ["#f3e3b8", "#f3e3b8", "#f3e3b8", "#e0c386", "#c9a468", "#b08f58"];
const SAND_TO = ["#d9bb82", "#d9bb82", "#d9bb82", "#c2a066", "#a8854f", "#8f7348"];

type Item = {
  file?: string;
  cliff?: number;
  left: number;
  w?: number;
  h: number;
  sink: number;
  x: number;
};
// sink = how far below the dune's top edge the item's base sits, in vh. Dune paths span x=0..1900.
const PATTERNS: { d: string; items: Item[] }[] = [
  {
    d: "M0,40 C220,80 520,10 900,45 S1350,90 1650,35 S1830,15 1900,40",
    items: [
      { file: "coral_1_blue.png", left: 17, h: 19, sink: 2 , x: 7 },
      { file: "coral_2_pink.png", left: 36, h: 15, sink: 1.5 , x: 12 },
      { file: "coral_8_indigo.png", left: 81, h: 19, sink: 2, x: 5 },
    ],
  },
  {
    d: "M0,55 C300,15 520,95 880,50 S1300,15 1600,60 S1820,85 1900,50",
    items: [
      { cliff: 3, left: 2, w: 54, h: 52, sink: 30, x: 2 },
      { file: "coral_4_green.png", left: 7, h: 21, sink: 2, x: 7 },
      { file: "coral_3_orange.png", left: 56, h: 17, sink: 2, x: 4 },
    ],
  },
  {
    d: "M0,45 C250,90 480,20 820,55 S1280,95 1580,40 S1810,20 1900,55",
    items: [
      { cliff: 4, left: 62, w: 54, h: 52, sink: 30, x: 2 },
      { file: "coral_5_red.png", left: 22, h: 17, sink: 2, x: 6 },
      { file: "coral_6_yellow.png", left: 44, h: 13, sink: 2, x: 9 },
    ],
  },
  {
    d: "M0,50 C280,15 560,85 900,45 S1320,20 1620,60 S1830,80 1900,45",
    items: [
      { file: "coral_7_purple.png", left: 14, h: 15, sink: 2, x: 4 },
      { file: "coral_1_blue.png", left: 70, h: 16, sink: 2, x: 7 },
    ],
  },
  {
    d: "M0,60 C260,20 600,100 960,55 S1380,10 1640,65 S1840,90 1900,55",
    items: [
      { file: "coral_2_pink.png", left: 10, h: 14, sink: 2, x: 12 },
      { file: "coral_4_green.png", left: 48, h: 21, sink: 2, x: 7 },
      { file: "coral_3_orange.png", left: 82, h: 16, sink: 2, x: 4 },
    ],
  },
];

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
    const choices = PATTERNS.map((_, i) => i).filter((i) => !recent.includes(i));
    seq.push(choices[Math.floor(rand() * choices.length)]);
  }
  return seq;
}

// Catmull-Rom through the points, so speed changes smoothly as a layer passes each depth (no kinks).
function sample(points: number[], p: number) {
  const n = points.length;
  const x = Math.min(n - 1, Math.max(0, p + 2));
  const i = Math.min(n - 2, Math.floor(x));
  const f = x - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(n - 1, i + 2)];
  return 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f);
}

function sampleColor(hexes: string[], p: number) {
  const x = Math.min(hexes.length - 1, Math.max(0, p + 2));
  const i = Math.min(hexes.length - 2, Math.floor(x));
  const f = x - i;
  const ch = (k: number) => {
    const a = parseInt(hexes[i].slice(k, k + 2), 16);
    const b = parseInt(hexes[i + 1].slice(k, k + 2), 16);
    return Math.round(a + (b - a) * f);
  };
  return `rgb(${ch(1)},${ch(3)},${ch(5)})`;
}

function SandLayer({ n, p, pattern }: { n: number; p: number; pattern: (typeof PATTERNS)[number] }) {
  const { d, items } = pattern;
  const top = sample(TOP_VH, p);
  const scale = 1 - 0.1 * Math.min(3, Math.max(0, p)); // corals shrink slightly with distance
  const itemOpacity = Math.min(1, Math.max(0, (2.5 - p) / 0.5)); // items appear only once their dune has mostly faded in

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
        viewBox="0 0 1900 730"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "40vh",
          display: "block",
        }}
      >
        <defs>
          <linearGradient id={`sandLayer${n}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sampleColor(SAND_FROM, p)} />
            <stop offset="100%" stopColor={sampleColor(SAND_TO, p)} />
          </linearGradient>
        </defs>
        <path d={`${d} L1900,730 L0,730 Z`} fill={`url(#sandLayer${n})`} />
      </svg>

      {items.map(({ file, cliff, left, w, h, sink, x }) =>
        cliff ? (
          // No scale on anything holding a WebGL canvas: a size change would reallocate its buffer.
          <div
            key={`cliff${cliff}`}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${sink - h }vh`,
              width: `${w}vh`,
              height: `${h}vh`,
              opacity: itemOpacity,
            }}
          >
            <Rock3D url={`/models/Environment_Cliff${cliff}.gltf`} />
          </div>
        ) : (
          <div
            key={`${file}${left}`}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${sink - h + x}vh`,
              height: `${h}vh`,
              opacity: itemOpacity,
              transform: `scale(${scale})`,
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
                maskImage:
                  "linear-gradient(to bottom, #000 90%, transparent 95%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, #000 90%, transparent 95%)",
              }}
            />
          </div>
        ),
      )}
    </div>
  );
}

// Sea floor strip. Starts a screen below and rises with scroll once the wave covers the
// screen; after it settles, further scrolling flows the sand layers forward (front layer
// slides off the bottom, the rest move up a place, a new one appears at the back).
export default function SeaFloor() {
  const vh = useViewportHeight();
  const pastCover = usePxPastCover();
  const riseDistance = vh / SEA_FLOOR_RISE_SPEED;
  const pastDelay = Math.max(0, pastCover - SEA_FLOOR_DELAY_PX);
  // Both the rise and the flow ease toward their scroll-driven targets, so they glide together.
  const risen = useSmoothValue(Math.min(vh, pastDelay * SEA_FLOOR_RISE_SPEED), 0.12, 0.3);
  const offset = vh - risen; // vh = fully hidden below, 0 = resting
  const t = useSmoothValue(Math.max(0, pastDelay - riseDistance) / PX_PER_LAYER, 0.1, 0.0015); // layers flowed forward so far
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const sequence = useMemo(() => makeSequence(seed, 64), [seed]);

  const layers = [];
  for (let n = Math.max(0, Math.floor(t) - 2); n <= Math.floor(t) + 3; n++) {
    const p = n - t;
    if (p < -2 || p >= 3) continue; // off the bottom, or not on the horizon yet
    layers.push(<SandLayer key={n} n={n} p={p} pattern={PATTERNS[sequence[n % sequence.length]]} />);
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
