"use client";

import { useEffect, useRef } from "react";

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

// Each group swims as one: a school, or a single fish (count 1). y = the lane it swims along, % from the top;
// width/height = how far it spreads (vw/vh), size = typical fish length (vw), speed = vw swum per second,
// dir = 1 swims left to right, -1 right to left, start = where the school's center begins (vw).
// Farther groups are smaller, paler and slower.
const GROUPS: {
  species: Species;
  count: number;
  y: number;
  width: number;
  height: number;
  size: number;
  speed: number;
  dir: 1 | -1;
  start: number;
  color: string;
  alpha: number;
}[] = [
  { species: "bream", count: 14, y: 10, width: 20, height: 9, size: 1.7, speed: 3.6, dir: 1, start: 20, color: "#7BA3CB", alpha: 0.6 },
  { species: "angel", count: 10, y: 26, width: 16, height: 9, size: 1.9, speed: 2.6, dir: -1, start: 70, color: "#3780C9", alpha: 0.62 },
  { species: "bream", count: 12, y: 44, width: 18, height: 8, size: 1.5, speed: 3.2, dir: 1, start: 5, color: "#7BA3CB", alpha: 0.55 },
  { species: "angel", count: 8, y: 56, width: 13, height: 7, size: 1.7, speed: 2.2, dir: -1, start: 110, color: "#3780C9", alpha: 0.58 },
];

// Positions inside a group on a golden-angle spiral (even, natural spacing) with a wide spread of sizes.
const LAYOUT = Array.from({ length: 18 }, (_, i) => {
  const r = Math.sqrt((i + 0.5) / 18);
  const a = i * 2.39996;
  return { x: 0.5 + Math.cos(a) * r * 0.5, y: 0.5 + Math.sin(a) * r * 0.5, s: 0.6 + ((i * 7) % 6) * 0.15, k: i * 1.7 };
});

const WRAP_MARGIN = 4; // vw a school swims past the edge before it comes back in on the other side
const MAX_PITCH = 22; // degrees a fish tips its nose up or down

// The lane a school follows: a gentle wave along x that also rises and sinks slowly over time.
// Returns height in vh and its slopes (vh per vw along the lane, vh per second over time).
function lane(gi: number, x: number, t: number) {
  const a = x * 0.05 + gi * 1.7;
  const b = t * 0.3 + gi;
  return { y: 4 * Math.sin(a) + 2.5 * Math.sin(b), dx: 0.2 * Math.cos(a), dt: 0.75 * Math.cos(b) };
}

// Swims on its own clock with requestAnimationFrame, writing transforms straight onto the elements,
// so the fish stay alive while the page is still and never cost a React render while scrolling.
function Schools() {
  const fishRefs = useRef<(SVGSVGElement | null)[]>([]);
  const tailRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const schools = GROUPS.map((g) => ({ x: g.start, tail: 0, shift: 0 }));
    const pitch = new Float32Array(GROUPS.length * LAYOUT.length);
    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // a hidden tab resumes where it left off
      last = now;
      const t = now / 1000;
      const aspect = window.innerHeight / window.innerWidth; // vh -> vw, so angles match what's on screen

      GROUPS.forEach((g, gi) => {
        const school = schools[gi];
        // Swim in bursts: speed swells and eases off on its own rhythm, and tails beat faster while it does.
        const surge = 1 + 0.45 * Math.sin(t * 0.8 + gi * 2.1);
        const speed = g.speed * surge;
        school.x += g.dir * speed * dt;
        school.tail += dt * 9 * surge;
        // Once fully off one side, come back in on the other along a slightly different lane.
        const half = g.width / 2 + WRAP_MARGIN;
        if (school.x > 100 + half || school.x < -half) {
          school.x = g.dir > 0 ? -half : 100 + half;
          school.shift = (Math.random() - 0.5) * 10;
        }

        const fish = SPECIES[g.species];
        const solo = g.count === 1;
        for (let i = 0; i < g.count; i++) {
          const idx = gi * LAYOUT.length + i;
          const el = fishRefs.current[idx];
          if (!el) continue;
          const f = LAYOUT[i];
          // Spot in the formation plus each fish's own slow weave, so the school breathes.
          const x = school.x + (solo ? 0 : (f.x - 0.5) * g.width + Math.sin(t * 0.6 + f.k) * 0.9);
          const off = solo ? 0 : (f.y - 0.5) * g.height + Math.cos(t * 0.75 + f.k * 1.3) * 0.8;
          // Each fish rides the lane at its own x, so a bend ripples back through the school.
          const l = lane(gi, x, t);
          const y = g.y + school.shift + l.y + off;
          // Nose follows the direction of travel, eased so it turns smoothly.
          const climb = l.dx * g.dir * speed + l.dt; // vh per second
          const target = g.dir * Math.max(-MAX_PITCH, Math.min(MAX_PITCH, (Math.atan2(climb * aspect, speed) * 180) / Math.PI));
          pitch[idx] += (target - pitch[idx]) * Math.min(1, dt * 4);

          el.style.transform = `translate3d(${x.toFixed(2)}vw, ${y.toFixed(2)}vh, 0) translate(-50%, -50%) rotate(${pitch[idx].toFixed(1)}deg) scaleX(${g.dir})`;
          tailRefs.current[idx]?.setAttribute("transform", `rotate(${(Math.sin(school.tail + f.k) * 16).toFixed(1)} ${fish.pivot} 15)`);
        }
      });
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return GROUPS.map((g, gi) => {
    const fish = SPECIES[g.species];
    return (
      <div key={gi} style={{ fill: g.color, opacity: g.alpha }}>
        {LAYOUT.slice(0, g.count).map((f, i) => (
          <svg
            key={i}
            ref={(el) => {
              fishRefs.current[gi * LAYOUT.length + i] = el;
            }}
            viewBox="0 -8 66 46"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${g.size * (g.count === 1 ? 1 : f.s)}vw`,
              height: "auto",
              overflow: "visible",
              transformOrigin: "50% 50%",
              transform: "translate3d(-50vw, 0, 0)", // parked off screen until the first frame places it
              willChange: "transform",
            }}
          >
            <path d={fish.body} />
            <path
              ref={(el) => {
                tailRefs.current[gi * LAYOUT.length + i] = el;
              }}
              d={fish.tail}
            />
          </svg>
        ))}
      </div>
    );
  });
}

// Sea-fish silhouettes behind the About bubbles; the layer fades in with the bubble.
export default function FishBackdrop({ visible }: { visible: number }) {
  if (visible <= 0) return null;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 14, pointerEvents: "none", overflow: "hidden", opacity: visible }}>
      <Schools />
    </div>
  );
}
