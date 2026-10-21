import { SEA_LEVEL_PERCENT } from "../../lib/const/constants";

// Everything here is positioned inside SkyOverlay, so it slides away with the sky. px drives a gentle
// parallax: the farther a thing is, the less it moves.

const WATER = 100 - SEA_LEVEL_PERCENT; // height of the water band, % of the screen

// Ripple marks on the water: rows bunch up toward the horizon and spread out toward the viewer,
// and nearer marks are longer, thicker and drift faster. Derived from the index so it never changes.
const RIPPLES = Array.from({ length: 30 }, (_, k) => {
  const row = Math.floor(k / 3);
  const depth = (row + 1) / 10; // 0.1 far .. 1 near
  return {
    y: SEA_LEVEL_PERCENT + WATER * Math.pow(depth, 1.8) * 0.95,
    x: ((k * 37 + row * 17) % 100) - 4,
    length: 2 + depth * 6, // % of screen width
    rise: 0.15 + depth * 0.5, // hump height, % of screen height
    width: 0.8 + depth * 1.6, // stroke px
    alpha: 0.25 + depth * 0.45,
    speed: 0.02 + depth * 0.1,
  };
});

// Flat clouds: overlapping circles on a rounded base, with a cooler band along the bottom.
const CLOUDS = [
  { left: 6, top: 12, width: 20, speed: 0.08 },
  { left: 67, top: 9, width: 16, speed: 0.05 },
  { left: 40, top: 22, width: 10, speed: 0.03 },
];

function Cloud({ id }: { id: string }) {
  const shape = (
    <>
      <circle cx="30" cy="32" r="15" />
      <circle cx="52" cy="23" r="20" />
      <circle cx="76" cy="28" r="16" />
      <circle cx="94" cy="34" r="11" />
      <rect x="16" y="30" width="90" height="16" rx="8" />
    </>
  );
  return (
    <svg
      viewBox="0 0 120 50"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <defs>
        <clipPath id={id}>{shape}</clipPath>
      </defs>
      <g fill="white">{shape}</g>
      <rect
        x="0"
        y="37"
        width="120"
        height="13"
        fill="#d4ebf7"
        clipPath={`url(#${id})`}
      />
    </svg>
  );
}

function Lighthouse() {
  return (
    <svg
      viewBox="0 0 120 70"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        overflow: "visible",
        zIndex: 10,
      }}
    >
      <defs>
        {/* Fades into the pale horizon haze at the bottom, like the far island, so it meets the sea softly */}
        <linearGradient id="lighthouseIsland" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6f9db5" />
          <stop offset="100%" stopColor="#b7d6e1" />
        </linearGradient>
      </defs>
      {/* Faint reflection on the water below the horizon (y > 70) */}
      <rect x="54" y="70" width="10" height="9" fill="white" opacity="0.18" />
      {/* island */}
      <path
        d="M0,70 C20,62 34,50 56,48 C76,46 92,58 120,70 Z"
        fill="url(#lighthouseIsland)"
      />
      {/* tower: tapered, red bands, dark lamp room with a tiny roof */}
      <path d="M52,50 L55,20 L63,20 L66,50 Z" fill="#f6f2ea" />
      <path
        d="M53.6,38 L64.4,38 L65,44 L53,44 Z M54.6,27 L63.4,27 L63.9,32 L54.1,32 Z"
        fill="#d9534f"
      />
      <rect x="54" y="14" width="10" height="6" fill="#3b4b5a" />
      <rect x="55.5" y="15.2" width="7" height="3.6" fill="#ffe9a8" />
      <path d="M52.5,14 L59,8 L65.5,14 Z" fill="#d9534f" />
      {/* lamp glow, softly pulsing */}
      <circle
        cx="59"
        cy="17"
        r="12"
        fill="url(#lampGlow)"
        style={{ animation: "lamp-pulse 3s ease-in-out infinite" }}
      />
      <defs>
        <radialGradient id="lampGlow">
          <stop offset="0%" stopColor="rgba(255,240,180,0.95)" />
          <stop offset="100%" stopColor="rgba(255,240,180,0)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export default function SkyDecor({ px }: { px: number }) {
  return (
    <>
      {/* Distant island on the horizon, pale so it reads as far away */}
      <svg
        viewBox="0 0 400 80"
        style={{
          position: "absolute",
          left: "7%",
          top: `${SEA_LEVEL_PERCENT}%`,
          width: "26vw",
          height: "auto",
          transform: `translate(${-px * 0.02}px, -99%)`,
        }}
      >
        <defs>
          <linearGradient id="islandFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7fb2cb" />
            <stop offset="100%" stopColor="#b9d9e4" />
          </linearGradient>
        </defs>
        <path
          d="M0,80 C40,72 70,32 120,28 C150,26 170,50 200,44 C240,36 280,62 320,66 C350,68 380,76 400,80 Z"
          fill="url(#islandFill)"
          opacity="0.8"
        />
      </svg>

      {/* Lighthouse on a small island, the one detail on the right of the horizon */}
      <div
        style={{
          position: "absolute",
          left: "80%",
          top: `${SEA_LEVEL_PERCENT}%`,
          width: "13vw",
          transform: `translate(${-px * 0.025}px, -100%)`, // the island's base (y = 70) sits exactly on the horizon
        }}
      >
        <Lighthouse />
      </div>

      {/* Far-off sailboat on the horizon */}
      <svg
        viewBox="0 0 30 26"
        style={{
          position: "absolute",
          left: "70%",
          top: `${SEA_LEVEL_PERCENT}%`,
          width: "1.8vw",
          height: "auto",
          transform: `translate(${px * 0.04}px, -92%)`,
        }}
      >
        <path d="M15,1 L15,19 L4,19 Z" fill="#f8f6f0" />
        <path d="M16.5,4 L16.5,19 L25,19 Z" fill="#e6eef2" />
        <path d="M3,20 L27,20 L23,25 L7,25 Z" fill="#5b7c8f" />
      </svg>
    </>
  );
}
