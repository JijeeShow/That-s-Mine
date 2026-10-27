// Scene change between About and Projects: a dense mass of sea-blue bubbles rises up over the screen,
// covers it completely (bubbles only, no backdrop), and rises away again. Scroll-driven, progress 0 -> 1.

// Fully covered in this window of progress; the caller swaps scenes inside it.
export const WIPE_COVER_FROM = 0.4;
export const WIPE_COVER_TO = 0.6;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Pseudo-random in 0..1, different per bubble (i) and per property (k).
const rand = (i: number, k: number) => {
  const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// The covering mass: a jittered grid whose bubbles overlap their neighbours, so there are no gaps.
// It moves as one block (one transform), which keeps hundreds of bubbles cheap to animate.
const BAND_VH = 180; // height of the mass
const COLS = 18;
const ROWS = 21;
const MASS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  const y = ((row + 0.5) / ROWS) * BAND_VH + (rand(i, 1) - 0.5) * 6; // vh within the band
  const edge = Math.min(y, BAND_VH - y); // distance to the top/bottom edge of the band
  return {
    x: ((col + (row % 2) * 0.5 + (rand(i, 2) - 0.5) * 0.6) / COLS) * 108 - 4, // % across, offset rows
    y,
    size: (8 + rand(i, 3) * 6) * (0.45 + 0.55 * clamp01(edge / 28)), // vw; smaller toward the edges, so they're foamy
    tone: rand(i, 4),
  };
});

// A few loose bubbles in front that move faster than the mass, and soft out-of-focus ones nearer still.
const FRONT = Array.from({ length: 36 }, (_, i) => ({
  x: rand(i, 5) * 110 - 5,
  offset: (rand(i, 6) - 0.5) * 150,
  size: i < 8 ? 18 + rand(i, 7) * 14 : 3 + rand(i, 7) * 7, // vw; the first 8 are big blurred ones
  blur: i < 8 ? 6 : 0,
  speed: i < 8 ? 1.8 : 1.35,
  tone: rand(i, 8),
}));

// Glossy sea-blue bubble: bright glint, deep body, lighter rim. tone 0..1 shifts it lighter or deeper.
function bubbleBg(tone: number) {
  const body = `hsla(${204 + tone * 10}, ${68 + tone * 10}%, ${46 + tone * 14}%, 0.92)`;
  const mid = `hsla(205, 72%, ${58 + tone * 10}%, 0.9)`;
  return [
    "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0 6%, rgba(255,255,255,0) 10%)",
    "radial-gradient(circle at 66% 74%, rgba(190,235,255,0.55) 0 8%, rgba(190,235,255,0) 26%)",
    `radial-gradient(circle, ${body} 0%, ${mid} 62%, rgba(185,230,252,0.95) 88%, rgba(235,250,255,0.9) 97%, rgba(235,250,255,0) 100%)`,
  ].join(", ");
}

export default function BubbleWipe({ progress: p }: { progress: number }) {
  if (p <= 0 || p >= 1) return null;

  const bandTop = 100 - p * (100 + BAND_VH); // vh: just below the screen at 0, just above it at 1

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: `${BAND_VH}vh`,
          transform: `translateY(${bandTop}vh)`,
        }}
      >
        {MASS.map((b, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${b.x}%`,
              top: `${b.y}vh`,
              width: `${b.size}vw`,
              height: `${b.size}vw`,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: bubbleBg(b.tone),
              boxShadow: "inset -4px -6px 14px rgba(10,60,120,0.35)",
            }}
          />
        ))}
      </div>

      {FRONT.map((b, i) => {
        const y = 50 + b.offset + (0.5 - p) * 280 * b.speed; // vh
        if (y > 130 || y < -60) return null;
        return (
          <span
            key={`f${i}`}
            style={{
              position: "absolute",
              left: `${b.x}%`,
              top: `${y}vh`,
              width: `${b.size}vw`,
              height: `${b.size}vw`,
              borderRadius: "50%",
              background: bubbleBg(b.tone),
              opacity: b.blur ? 0.55 : 0.95,
              filter: b.blur ? `blur(${b.blur}px)` : undefined,
              transform: `translateX(${Math.sin(p * 9 + i) * 8}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
