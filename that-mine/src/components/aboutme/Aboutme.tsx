import { useId } from "react";
import FishBackdrop from "./FishBackdrop";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (v: number) => 1 - Math.pow(1 - v, 3); // fast start, soft landing
const easeIn = (v: number) => v * v * v; // slow start, fast finish
const easeOutBack = (v: number) =>
  1 + 2.70158 * Math.pow(v - 1, 3) + 1.70158 * Math.pow(v - 1, 2); // overshoots 1, then settles

// Point on a circle of radius r around the bubble's center (viewBox 0..100), angle in degrees (0 = right, 90 = down).
const onCircle = (r: number, deg: number) =>
  `${(50 + r * Math.cos((deg * Math.PI) / 180)).toFixed(2)},${(50 + r * Math.sin((deg * Math.PI) / 180)).toFixed(2)}`;

// Crescent hugging the inside of the rim: zero width at both ends, `thick` at the middle.
function crescent(r: number, from: number, to: number, thick: number) {
  const steps = 40;
  const outer: string[] = [];
  const inner: string[] = [];
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const deg = from + (to - from) * u;
    outer.push(onCircle(r, deg));
    inner.push(onCircle(r - thick * Math.sin(Math.PI * u), deg));
  }
  return `M${outer.join(" L")} L${inner.reverse().join(" L")} Z`;
}

// One reflection: a crescent filled with a gradient that runs end to end along it, brightest in the middle.
function Reflection({ r, from, to, thick, peak }: { r: number; from: number; to: number; thick: number; peak: number }) {
  const id = `refl${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [x1, y1] = onCircle(r, from).split(",");
  const [x2, y2] = onCircle(r, to).split(",");
  return (
    <>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity={peak} />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={crescent(r, from, to, thick)} fill={`url(#${id})`} />
    </>
  );
}

// Glass bubble look, filling its round parent: a lightly frosted clear body shaded darker underneath,
// an iridescent soap-film rim that slowly turns, and curved window reflections along the edge.
function BubbleSkin({ spin }: { spin: number }) {
  return (
    <>
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 36%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 55%, rgba(170,225,255,0.22) 82%, rgba(255,255,255,0.5) 100%)",
          boxShadow:
            "inset 0 -12px 30px rgba(20,90,160,0.28), inset 0 8px 22px rgba(255,255,255,0.22), 0 12px 40px rgba(10,60,120,0.18)",
          backdropFilter: "blur(1px) saturate(1.15)", // light frost, so the fish behind stay crisp
          WebkitBackdropFilter: "blur(1px) saturate(1.15)",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, rgba(255,130,210,0.9), rgba(120,225,255,0.9), rgba(255,240,150,0.85), rgba(175,135,255,0.9), rgba(255,130,210,0.9))",
          maskImage: "radial-gradient(closest-side, transparent 84%, #000 96%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(closest-side, transparent 84%, #000 96%, transparent 100%)",
          mixBlendMode: "screen",
          opacity: 0.5,
          animation: `bubble-spin ${spin}s linear infinite`,
        }}
      />
      <svg
        viewBox="0 0 100 100"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
      >
        {/* Window reflection on the upper left: plump in the middle, tapering and fading toward both tips */}
        {/* <Reflection r={45} from={185} to={285} thick={6} peak={0.95} /> */}
        <ellipse cx="31" cy="21" rx="6.3" ry="3" fill="rgba(255,255,255,0.85)" transform="rotate(-38 31 21)" />
        {/* Softer bounce light on the lower right */}
        <Reflection r={45} from={20} to={80} thick={3} peak={0.45} />
      </svg>
    </>
  );
}

// The About content, split into bubbles that take turns as you scroll.
// The last one ("Off the clock") has a placeholder line - edit it along with HOBBIES.
const CHUNKS = [
  {
    title: "About me",
    body: "I build things end to end: finance and accounting platforms, online e-services and data portals that people rely on every day.",
  },
  {
    title: "How I work",
    body: "I like owning a feature from the database all the way to the screen, and I can write automated tests to make sure it works.",
  },
  {
    title: "Learning now",
    body: "Right now I'm learning DevOps, because I want to understand not just how to build software, but how to ship it and keep it running.",
  },
  {
    title: "Off the clock",
    body: "When I'm not coding, you'll usually find me with one of these.",
  },
];
const LAST_CHUNK = CHUNKS.length - 1;
export const ABOUT_CHUNK_COUNT = CHUNKS.length;

// Placeholder hobbies around the last bubble - edit the labels. left/top place each one around the big
// bubble; size is in vh; delay staggers when it floats in; bob is its idle bob period in seconds;
// side is which edge it drifts in from (-1 left, 1 right).
const HOBBIES = [
  {
    label: "Gaming",
    left: "calc(50% - 35vh - 19vh)",
    top: "22vh",
    size: 15,
    delay: 0,
    bob: 3.1,
    side: -1,
  },
  {
    label: "Music",
    left: "calc(50% + 35vh + 3vh)",
    top: "14vh",
    size: 13,
    delay: 0.1,
    bob: 3.8,
    side: 1,
  },
  {
    label: "Travel",
    left: "calc(50% - 35vh - 14vh)",
    top: "52vh",
    size: 12,
    delay: 0.2,
    bob: 2.7,
    side: -1,
  },
  {
    label: "Photography",
    left: "calc(50% + 35vh + 7vh)",
    top: "46vh",
    size: 16,
    delay: 0.3,
    bob: 3.4,
    side: 1,
  },
];

const ENTER_X_VW = 55; // how far sideways a bubble starts, in vw
const EXIT_X_VW = 50; // how far sideways it ends up when it has gone

// Words fade in one after another and sharpen from a blur, driven by `reveal` (0 -> 1).
function Words({ text, reveal }: { text: string; reveal: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, k) => {
        const w = clamp01(reveal * 1.7 - (k / words.length) * 0.7);
        return (
          <span
            key={k}
            style={{
              display: "inline-block",
              marginRight: "0.28em",
              opacity: w,
              transform: `translateY(${(1 - w) * 0.6}em)`,
              filter: w < 1 ? `blur(${(1 - w) * 5}px)` : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </>
  );
}

// progress 0 -> 1 floats the first bubble in from below. scroll (0 .. last chunk) is the position along
// the sequence: at 1 the second bubble is centered, at 2 the third. A bubble springs in from below
// (overshoots, wobbles like jelly, settles), rests in the middle, then swells and pops as the next arrives.
export default function Aboutme({
  progress,
  scroll,
}: {
  progress: number;
  scroll: number;
}) {
  if (progress <= 0) return null;

  const sway = Math.sin(progress * 7) * (1 - progress) * 40; // side-to-side drift that settles as the first bubble arrives
  const toLast = LAST_CHUNK - scroll; // 1 -> 0 as the last bubble comes to the middle

  return (
    <>
      <FishBackdrop visible={clamp01(progress * 1.5)} />
      {CHUNKS.map((chunk, i) => {
        const d = i - scroll; // <0 already passed (above), >0 still to come (below)
        if (Math.abs(d) >= 1) return null;
        const first = i === 0;
        const inT = first ? progress : d > 0 ? 1 - d : 1; // 0 -> 1 while arriving
        const outT = d < 0 ? -d : 0; // 0 -> 1 while leaving
        // Bubbles swing in and out on curved diagonals, alternating sides: even ones arrive from the lower left and
        // leave toward the upper right, odd ones the other way. x decays slower than y, which bows the path into an arc.
        const dir = i % 2 === 0 ? -1 : 1;
        const x =
          dir * ENTER_X_VW * Math.pow(1 - inT, 1.7) -
          dir * EXIT_X_VW * Math.pow(outT, 2.2); // vw
        const y = (1 - easeOut(inT)) * 80 - easeIn(outT) * 70; // vh; lingers in the middle, then accelerates up
        const grow =
          (0.55 + 0.45 * easeOutBack(inT)) * (1 + 0.22 * easeIn(outT));
        const jelly = 0.05 * Math.sin(inT * 11) * (1 - inT); // damped squash and stretch while arriving
        const opacity =
          clamp01(inT * (first ? 2 : 1.6)) *
          (1 - clamp01((outT - 0.45) / 0.45));
        const reveal =
          clamp01(1 - Math.abs(d) * 2.2) *
          (first ? clamp01((progress - 0.6) / 0.4) : 1);

        return (
          <div
            key={chunk.title}
            style={{
              zIndex: 15,
              position: "absolute",
              left: "calc(50% - 35vh)",
              top: 40,
              width: "70vh",
              height: "70vh",
              pointerEvents: "none",
              opacity,
              transform: `translate(${sway}px, 0) translate(${x}vw, ${y}vh) scale(${grow * (1 + jelly)}, ${grow * (1 - jelly)})`,
            }}
          >
            {/* Idle bob; separate element so it never fights the scroll-driven transform. */}
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                animation: "wave-bob 2.5s ease-in-out infinite alternate",
              }}
            >
              <BubbleSkin spin={18} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "0 17%",
                  color: "white",
                  textShadow: "0 2px 12px rgba(0,40,90,0.45)",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "clamp(1.75rem, 6vh, 3.25rem)",
                    fontWeight: 700,
                    lineHeight: 1.1,
                    opacity: clamp01(reveal * 2.2),
                    transform: `translateY(${(1 - clamp01(reveal * 2.2)) * 16}px)`,
                    letterSpacing: `${(1 - clamp01(reveal * 2.2)) * 0.15}em`,
                  }}
                >
                  {chunk.title}
                </h2>
                <p
                  style={{
                    margin: "1.2vh 0 0",
                    fontSize: "clamp(0.9rem, 2.3vh, 1.2rem)",
                    lineHeight: 1.6,
                    maxWidth: "34ch",
                  }}
                >
                  <Words text={chunk.body} reveal={reveal} />
                </p>
              </div>

            </span>
          </div>
        );
      })}

      {/* Hobby bubbles spring in as the last big bubble comes to the middle */}
      {HOBBIES.map((h) => {
        const local = clamp01((1 - toLast - 0.2 - h.delay) / 0.5); // each floats in a little after the last, all done when centered
        if (local <= 0) return null;
        const jelly = 0.07 * Math.sin(local * 11) * (1 - local);
        const s = 0.5 + 0.5 * easeOutBack(local);
        return (
          <div
            key={h.label}
            style={{
              zIndex: 15,
              position: "absolute",
              left: h.left,
              top: h.top,
              width: `${h.size}vh`,
              height: `${h.size}vh`,
              pointerEvents: "none",
              opacity: clamp01(local * 1.5),
              transform: `translate(${h.side * Math.pow(1 - local, 1.7) * 32}vw, ${(1 - easeOut(local)) * 45}vh) scale(${s * (1 + jelly)}, ${s * (1 - jelly)})`,
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: `wave-bob ${h.bob}s ease-in-out ${-h.bob / 2}s infinite alternate`,
              }}
            >
              <BubbleSkin spin={10 + h.bob * 2} />
              <span
                style={{
                  position: "relative", // paint above the absolutely positioned skin layers
                  color: "white",
                  fontSize: "clamp(0.72rem, 1.9vh, 1rem)",
                  textShadow: "0 1px 8px rgba(0,40,90,0.5)",
                  opacity: clamp01((local - 0.4) / 0.4),
                }}
              >
                {h.label}
              </span>
            </span>
          </div>
        );
      })}
    </>
  );
}
