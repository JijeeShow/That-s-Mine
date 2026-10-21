"use client";

import { useScrollPx } from "../scrollBridge";

// The two fish silhouettes from the reference images, both facing right in a shared 66 x 46 box (y = 15 is the body line).
// tail is drawn separately so it can beat around `pivot`.
const SPECIES = {
  // deep-bodied reef fish with a serrated spiny dorsal fin, pelvic and anal fins
  bream: {
    body: "M61,17 C61.5,10.5 57.5,5.5 51,4.6 C50,4.4 49,4.3 48,4.3 L48.0,3.8 L46.0,0.0 L44.0,4.3 L42.0,0.9 L40.0,4.8 L38.0,1.8 L36.0,5.4 L34.0,2.7 L32.0,5.9 L30.0,3.6 L28.0,6.4 L26.0,4.4 C24,7.6 21,8.5 18,10.5 L13,12.8 L13,17.2 C16,19 18,21 20,22 L22,28 L25,23.5 C28,24.5 31,25.5 35,26 L38,33 L41,26.5 C49,26.5 55,25 59,21.5 C60.5,20 61,18.5 61,17 Z",
    tail: "M14,15 L3,6 L6,15 L3,24 Z",
    pivot: 13,
  },
  // triangle fish: tall dorsal and anal fins sweeping back to sharp points
  angel: {
    body: "M62,16 C60,11.5 55,8 48,7 C42,3 33,-3 23,-8 C25,-1 23,5 18.5,10 C17,11.5 15.5,12.5 14,13.2 L14,16.8 C15.5,17.5 17,18.5 18.5,20 C23,25 25,31 25,38 C33,33 41,27 47,23.5 C54,22.5 59,20 62,16 Z",
    tail: "M15,15 L5,6 C7,10 8,13 8,15 C8,17 7,20 5,24 Z",
    pivot: 14,
  },
} as const;
type Species = keyof typeof SPECIES;

// Each group swims as one: a school, or a single fish (count 1). y = % from the top, width/height =
// how far it spreads (vw/vh), size = typical fish length (vw), speed = vw swum per px scrolled,
// phase = head start in vw. Farther groups are smaller, paler and slower.
const GROUPS: {
  species: Species;
  count: number;
  y: number;
  width: number;
  height: number;
  size: number;
  speed: number;
  phase: number;
  color: string;
  alpha: number;
}[] = [
  { species: "bream", count: 14, y: 10, width: 20, height: 9, size: 1.7, speed: 0.032, phase: 20, color: "#5b9bd8", alpha: 0.6 },
  { species: "angel", count: 10, y: 26, width: 16, height: 9, size: 1.9, speed: 0.026, phase: 70, color: "#5596d6", alpha: 0.62 },
  { species: "bream", count: 12, y: 44, width: 18, height: 8, size: 1.5, speed: 0.038, phase: 5, color: "#5b9bd8", alpha: 0.55 },
  { species: "angel", count: 8, y: 56, width: 13, height: 7, size: 1.7, speed: 0.03, phase: 110, color: "#5596d6", alpha: 0.58 },
];

// Positions inside a group on a golden-angle spiral (even, natural spacing) with a wide spread of sizes.
const LAYOUT = Array.from({ length: 18 }, (_, i) => {
  const r = Math.sqrt((i + 0.5) / 18);
  const a = i * 2.39996;
  return { x: 0.5 + Math.cos(a) * r * 0.5, y: 0.5 + Math.sin(a) * r * 0.5, s: 0.6 + ((i * 7) % 6) * 0.15, k: i * 1.7 };
});

// Soft pink glows far behind the fish (distant coral heads). x/y = % of the screen, w/h in vw/vh.
const GLOWS = [
  { x: 6, y: 20, w: 6, h: 6, color: "#f2a7c3" },
  { x: 26, y: 40, w: 4, h: 4, color: "#ee9fbe" },
  { x: 44, y: 12, w: 5, h: 5, color: "#f5b4cb" },
  { x: 62, y: 34, w: 7, h: 6, color: "#f2a7c3" },
  { x: 80, y: 18, w: 4, h: 4, color: "#ee9fbe" },
  { x: 91, y: 44, w: 5, h: 5, color: "#f5b4cb" },
];

// Sea-fish silhouettes and pink glows behind the About bubbles. Swims with scroll (not a timer):
// each group drifts across together while its fish weave a little and beat their tails;
// the layer fades in with the bubble.
export default function FishBackdrop({ visible }: { visible: number }) {
  const px = useScrollPx();
  if (visible <= 0) return null;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 14, pointerEvents: "none", overflow: "hidden", opacity: visible }}>
      {/* {GLOWS.map((g, i) => (
        <span
          key={`glow${i}`}
          style={{
            position: "absolute",
            left: `${((g.x + px * 0.003) % 110) - 5}%`,
            top: `${g.y}%`,
            width: `${g.w}vw`,
            height: `${g.h}vh`,
            borderRadius: "50%",
            background: g.color,
            opacity: 0.35,
            filter: "blur(7px)",
          }}
        />
      ))} */}

      {GROUPS.map((group, gi) => {
        const fish = SPECIES[group.species];
        const lap = 100 + group.width * 2 + group.size;
        const left = ((group.phase + px * group.speed) % lap) - group.width - group.size; // vw, wraps once fully off the right
        const solo = group.count === 1;
        return (
          <div
            key={gi}
            style={{
              position: "absolute",
              left: `${left}vw`,
              top: `calc(${group.y}% + ${Math.sin(px / 160 + gi * 2) * 1.5}vh)`,
              width: `${group.width}vw`,
              height: `${group.height}vh`,
              fill: group.color,
              opacity: group.alpha,
            }}
          >
            {LAYOUT.slice(0, group.count).map((f, i) => (
              <svg
                key={i}
                viewBox="0 -8 66 46"
                style={{
                  position: "absolute",
                  left: solo ? 0 : `calc(${f.x * 100}% + ${Math.sin(px / 40 + f.k) * 0.6}vw)`,
                  top: solo ? 0 : `calc(${f.y * 100}% + ${Math.cos(px / 50 + f.k) * 0.6}vh)`,
                  width: `${group.size * (solo ? 1 : f.s)}vw`,
                  height: "auto",
                  overflow: "visible",
                }}
              >
                <path d={fish.body} />
                <path d={fish.tail} transform={`rotate(${Math.sin(px / 5 + f.k + gi) * 14} ${fish.pivot} 15)`} />
              </svg>
            ))}
          </div>
        );
      })}
    </div>
  );
}
