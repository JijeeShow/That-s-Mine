// Scene change between About and Projects: the sand kicks up into a murky silt cloud, then settles.
// Scroll-driven, progress 0 -> 1:
//  0 -> 0.45  plumes of silt billow up from the floor while murky water rises behind them and covers the screen
//  0.45-0.55  fully clouded; the caller swaps scenes in this window
//  0.55 -> 1  the silt settles: the water clears from the top down and the grains sink, revealing the new scene

export const WIPE_COVER_FROM = 0.45;
export const WIPE_COVER_TO = 0.55;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};

// Pseudo-random in 0..1, different per item (i) and per property (k).
const rand = (i: number, k: number) => {
  const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// Billowing plumes: soft round clouds that rise and swell. Lower ones are sandier, higher ones take on
// the water's blue-grey, as silt does when it spreads.
const PUFFS = Array.from({ length: 42 }, (_, i) => {
  const lift = rand(i, 3); // 0 = stays low, 1 = rides high in the plume
  return {
    x: rand(i, 1) * 120 - 10, // % across (center)
    lift,
    size: 28 + rand(i, 2) * 40, // vw at full swell
    hue: 40 - lift * 4,
    sat: 38 - lift * 18,
    light: 72 - lift * 8,
  };
});

// Sand grains swirling up with the cloud, then sinking as it settles.
const GRAINS = Array.from({ length: 130 }, (_, i) => ({
  x: rand(i, 11) * 100,
  y: 60 + rand(i, 12) * 60, // vh where it starts (mostly low)
  size: 1.5 + rand(i, 13) * 3,
  speed: 0.6 + rand(i, 14) * 0.8,
  sway: 6 + rand(i, 15) * 18,
  light: rand(i, 16) < 0.35,
}));

export default function SiltWipe({ progress: p }: { progress: number }) {
  if (p <= 0 || p >= 1) return null;

  const rise = smoothstep(p / WIPE_COVER_FROM); // cloud kicking up
  const settle = smoothstep((p - WIPE_COVER_TO) / (0.97 - WIPE_COVER_TO)); // cloud settling

  // Murky water behind the plumes: climbs from the bottom while kicking up...
  const hazeTop = -30 + smoothstep((p - 0.08) / (WIPE_COVER_FROM - 0.08)) * 170; // % from the bottom
  const hazeMask = `linear-gradient(to top, #000 ${hazeTop - 35}%, transparent ${hazeTop}%)`;
  // ...and while settling, everything clears from the top down, as the silt sinks.
  const clearLine = -40 + settle * 175; // % from the top
  const settleMask = settle > 0 ? `linear-gradient(to bottom, transparent ${clearLine - 40}%, #000 ${clearLine}%)` : undefined;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, maskImage: settleMask, WebkitMaskImage: settleMask }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            maskImage: rise < 1 ? hazeMask : undefined,
            WebkitMaskImage: rise < 1 ? hazeMask : undefined,
            background: "linear-gradient(180deg, #8eaab6 0%, #a8ad9a 45%, #c6b48a 100%)",
          }}
        />
        {PUFFS.map((c, i) => {
          // Rises from below the screen to its place in the plume, swelling as it goes; sinks a little while settling.
          const y = 115 - rise * (55 + c.lift * 75) + settle * 25; // vh of the center
          const size = c.size * (0.35 + 0.65 * rise);
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${c.x}%`,
                top: `${y}vh`,
                width: `${size}vw`,
                height: `${size * 0.8}vw`,
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                opacity: Math.min(1, rise * 1.6),
                background: `radial-gradient(closest-side, hsla(${c.hue}, ${c.sat}%, ${c.light}%, 0.95) 0%, hsla(${c.hue}, ${c.sat}%, ${c.light}%, 0.6) 45%, hsla(${c.hue}, ${c.sat}%, ${c.light}%, 0) 100%)`,
              }}
            />
          );
        })}
      </div>

      {GRAINS.map((g, i) => {
        // Swirl up with the cloud, then sink while it settles.
        const y = g.y - rise * 70 * g.speed + settle * 85 * g.speed; // vh
        if (y < -5 || y > 105) return null;
        const x = Math.sin(p * 10 * g.speed + i) * g.sway;
        return (
          <span
            key={`g${i}`}
            style={{
              position: "absolute",
              left: `${g.x}%`,
              top: `${y}vh`,
              width: g.size,
              height: g.size,
              borderRadius: "50%",
              background: g.light ? "rgba(255,248,225,0.85)" : "rgba(150,122,72,0.75)",
              opacity: Math.min(1, rise * 2) * (1 - settle * 0.9),
              transform: `translateX(${x}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
