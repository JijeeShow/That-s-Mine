"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import {
  getScrollOffset,
  setScrollOffset,
  subscribeScrollOffset,
} from "./scrollBridge";

const Boat3D = dynamic(() => import("./Boat3D"), { ssr: false });

// How many viewport-heights tall the scrollable track is. Bigger = slower,
// longer descent.
const PAGE_COUNT = 6;

// Purely thematic - not a real depth scale, just something to count up as
// you scroll so the descent feels like it's going somewhere.
const MAX_DEPTH_METERS = 6000;

type Zone = {
  from: number; // scroll offset (0-1) this zone starts at
  nameTh: string;
  nameEn: string;
};

const ZONES: Zone[] = [
  { from: 0, nameTh: "ผิวน้ำ", nameEn: "Surface" },
  { from: 0.12, nameTh: "เขตแสงส่องถึง", nameEn: "Sunlight Zone" },
  { from: 0.32, nameTh: "เขตแสงรำไร", nameEn: "Twilight Zone" },
  { from: 0.55, nameTh: "เขตมืด", nameEn: "Midnight Zone" },
  { from: 0.8, nameTh: "เขตก้นสมุทร", nameEn: "Abyssal Zone" },
];

function getZone(offset: number): Zone {
  let current = ZONES[0];
  for (const zone of ZONES) {
    if (offset >= zone.from) current = zone;
  }
  return current;
}

// Ocean color at each depth, from bright sunlit surface down to near-black
// abyss. Interpolated linearly between stops.
const COLOR_STOPS: Array<{ stop: number; rgb: [number, number, number] }> = [
  { stop: 0, rgb: [146, 215, 227] },
  { stop: 0.12, rgb: [72, 169, 201] },
  { stop: 0.3, rgb: [27, 109, 158] },
  { stop: 0.5, rgb: [12, 58, 102] },
  { stop: 0.7, rgb: [6, 29, 58] },
  { stop: 0.88, rgb: [2, 12, 26] },
  { stop: 1, rgb: [0, 2, 6] },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function colorAt(offset: number): [number, number, number] {
  const o = Math.min(1, Math.max(0, offset));
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (o >= a.stop && o <= b.stop) {
      const t = (o - a.stop) / (b.stop - a.stop || 1);
      return [
        lerp(a.rgb[0], b.rgb[0], t),
        lerp(a.rgb[1], b.rgb[1], t),
        lerp(a.rgb[2], b.rgb[2], t),
      ];
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].rgb;
}

function useScrollOffset() {
  return useSyncExternalStore(subscribeScrollOffset, getScrollOffset, () => 0);
}

function ScrollLayer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const offset = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      setScrollOffset(offset);
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10,
        overflowY: "auto",
      }}
    >
      <div style={{ height: `${PAGE_COUNT * 100}vh` }} />
    </div>
  );
}

// Fixed full-viewport background whose color darkens with scroll depth,
// plus a fading sunlight glow near the surface.
function OceanBackground() {
  const offset = useScrollOffset();
  const [r, g, b] = colorAt(offset);
  const sunOpacity = Math.max(0, 1 - offset * 2.4);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        background: `rgb(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: sunOpacity,
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,255,255,0.55), transparent 60%)",
        }}
      />
     
    </div>
  );
}

// Sky + waterline, visible only right at the very top of the page. Gives
// the first impression of standing above the water looking down, before
// sinking below the surface as soon as you start scrolling.
function SkyOverlay() {
  const offset = useScrollOffset();
  // Takes the first ~22% of the scroll to fully pass by overhead - it
  // slides up and out like a normal part of the page, instead of just
  // fading in place, so scrolling reads as sinking past the surface.
  const progress = Math.min(1, offset / 0.22);
  const translateVh = -progress * 100;
  // Only fade right at the very end, so it doesn't pop off abruptly.
  const opacity = 1 - Math.max(0, (progress - 0.85) / 0.15);

  if (progress >= 1) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2,
        opacity,
        transform: `translateY(${translateVh}vh)`,
        pointerEvents: "none",
      }}
    >
      {/* Sky */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          height: "55%",
          background:
            "linear-gradient(to bottom, #6cb7e8 0%, #a9dcef 55%, #e4f6f4 100%)",
        }}
      />
      {/* Sun */}
      {/* <div
        style={{
          position: "absolute",
          top: "8%",
          left: "50%",
          width: 90,
          height: 90,
          borderRadius: "9999px",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(circle, rgba(255,250,220,0.95), rgba(255,250,220,0.15) 70%, transparent 75%)",
        }}
      /> */}
      {/* Water, below the horizon */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: "55%",
          background:
            "linear-gradient(to bottom, #d9f3ee 0%, #9fdce0 40%, #4fb3c9 100%)",
        }}
      />
      {/* Waterline shimmer */}
      <div
        style={{
          position: "absolute",
          top: "calc(55% - 3px)",
          left: 0,
          right: 0,
          height: 6,
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.9), transparent)",
          filter: "blur(1px)",
        }}
      />
      {/* Boat, floating right on the waterline */}
      <div
        style={{
          position: "absolute",
          left: "22%",
          top: "55%",
          // <Bounds fit> centers the hull within the canvas rather than
          // sitting it on the bottom edge, so nudge the whole box down a
          // bit to land the hull on the waterline instead of above it.
          transform: "translate(-50%, -100%) translateY(28px)",
          width: 130,
          height: 110,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            animation: "boat-bob 4s ease-in-out infinite",
          }}
        >
          <Boat3D />
        </div>
      </div>
    </div>
  );
}

function makeBubbles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    // Deterministic pseudo-randomness so it's stable across renders.
    const seed = i * 37.618;
    const left = (seed % 100 + 100) % 100;
    const size = 6 + ((seed * 3) % 18);
    const duration = 9 + ((seed * 7) % 12);
    const delay = -((seed * 5) % duration);
    const drift = ((seed % 7) - 3) * 12;
    const opacity = 0.25 + ((seed * 11) % 40) / 100;
    return { left, size, duration, delay, drift, opacity };
  });
}

function Bubbles() {
  const bubbles = useMemo(() => makeBubbles(22), []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1 }}>
      {bubbles.map((bubble, i) => (
        <span
          key={i}
          className="ocean-bubble"
          style={
            {
              left: `${bubble.left}%`,
              width: bubble.size,
              height: bubble.size,
              animationDuration: `${bubble.duration}s`,
              animationDelay: `${bubble.delay}s`,
              "--drift": `${bubble.drift}px`,
              "--bubble-opacity": bubble.opacity,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// Depth readout + current zone name, fixed bottom-left.
function DepthReadout() {
  const offset = useScrollOffset();
  const zone = getZone(offset);
  const depth = Math.round(offset * MAX_DEPTH_METERS);

  return (
    <div
      style={{
        position: "fixed",
        left: "6vw",
        bottom: "6vh",
        zIndex: 20,
        color: "white",
        pointerEvents: "none",
        textShadow: "0 2px 10px rgba(0,0,0,0.6)",
      }}
    >
      {/* <div style={{ fontSize: "0.95rem", opacity: 0.7, letterSpacing: "0.05em" }}>
        {zone.nameTh} · {zone.nameEn}
      </div>
      <div style={{ fontSize: "2.25rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {depth.toLocaleString()} ม.
      </div> */}
    </div>
  );
}

function Intro() {
  const offset = useScrollOffset();
  const opacity = Math.max(0, 1 - offset * 8);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 8vw",
        color: "white",
        pointerEvents: "none",
        opacity,
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
        Hi there! I'm
      </p>
      <h1 style={{ fontSize: "clamp(2.25rem, 7vw, 4rem)", fontWeight: 700, margin: 0 }}>
        Kittipat Chofa
      </h1>
      <p style={{ fontSize: "1.15rem", opacity: 0.85, marginTop: "0.75rem", maxWidth: 480 }}>
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
        <span style={{ fontSize: "0.8rem", letterSpacing: "0.1em", opacity: 0.8 }}>
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

export default function OceanScene() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <OceanBackground />
      <Bubbles />
      <SkyOverlay />
      <Intro />
      <DepthReadout />
      <ScrollLayer />
    </div>
  );
}
