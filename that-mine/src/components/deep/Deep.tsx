"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { ContactLink } from "./AnglerContact";

const AnglerContact = dynamic(() => import("./AnglerContact"), { ssr: false });

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};

// Skill groups, one glowing jellyfish each. Drafted from the About text - edit the names and skills.
// hue = the jellyfish's glow color.
const SKILL_GROUPS = [
  { title: "Building", skills: ["Full-stack web apps", "REST APIs", "SQL & databases"], hue: 188 },
  { title: "Quality", skills: ["Automated tests", "Code review"], hue: 262 },
  { title: "This site", skills: ["Next.js", "React", "TypeScript", "Three.js"], hue: 158 },
  { title: "Learning now", skills: ["DevOps", "CI/CD", "Containers"], hue: 318 },
];

// Contact links that come out of the anglerfish's mouth - placeholders, put the real ones here.
const EMAIL = "you@example.com";
const CONTACT_LINKS: ContactLink[] = [
  { label: "Email", detail: EMAIL, href: `mailto:${EMAIL}` },
  { label: "GitHub", href: "https://github.com/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/" },
];

// Phone-width layout.
const NARROW = "(max-width: 640px)";
const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useNarrow = () => useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);

// Glowing specks drifting in the dark water: left/top in %, size in px, rise = how far they climb (vh) over the zone.
const PLANKTON = Array.from({ length: 34 }, (_, i) => ({
  left: (i * 37 + 11) % 64, // the open water, left of the cliff
  top: (i * 53 + 7) % 100,
  size: 2 + ((i * 7) % 4),
  rise: 20 + ((i * 13) % 5) * 12,
  hue: [188, 262, 158, 318][i % 4],
  pulse: 2.4 + ((i * 11) % 7) * 0.4,
}));

// A jellyfish: glowing bell with frilled tentacles, lit 0..1 brightens it.
function Jelly({ hue, lit, size }: { hue: number; lit: number; size: number }) {
  const glow = `hsla(${hue}, 100%, 70%, ${0.15 + 0.6 * lit})`;
  return (
    <div style={{ position: "relative", width: size, height: size * 1.5, flexShrink: 0, animation: "jelly-bob 4.2s ease-in-out infinite" }}>
      <div
        style={{
          position: "absolute",
          left: "-40%",
          top: "-30%",
          width: "180%",
          height: "120%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glow} 0%, transparent 65%)`,
          opacity: lit,
        }}
      />
      <svg viewBox="0 0 60 90" width={size} height={size * 1.5} style={{ position: "relative", overflow: "visible" }}>
        <defs>
          <radialGradient id={`bell${hue}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor={`hsla(${hue}, 100%, 92%, ${0.5 + 0.5 * lit})`} />
            <stop offset="70%" stopColor={`hsla(${hue}, 90%, 62%, ${0.25 + 0.55 * lit})`} />
            <stop offset="100%" stopColor={`hsla(${hue}, 90%, 50%, ${0.1 + 0.3 * lit})`} />
          </radialGradient>
        </defs>
        {[14, 24, 36, 46].map((x, k) => (
          <path
            key={x}
            d={`M${x} 30 q ${k % 2 ? 6 : -6} 14 0 28 t 0 28`}
            fill="none"
            stroke={`hsla(${hue}, 100%, 78%, ${0.15 + 0.55 * lit})`}
            strokeWidth={k % 3 ? 1.2 : 2}
            strokeLinecap="round"
            style={{ transformOrigin: `${x}px 30px`, animation: `jelly-sway ${3 + k * 0.4}s ease-in-out infinite` }}
          />
        ))}
        <path d="M4 32 C4 8 56 8 56 32 C50 28 46 34 40 30 C34 34 26 34 20 30 C14 34 10 28 4 32 Z" fill={`url(#bell${hue})`} />
        <ellipse cx="22" cy="16" rx="7" ry="3.5" fill="white" opacity={0.25 + 0.35 * lit} transform="rotate(-20 22 16)" />
      </svg>
    </div>
  );
}

// The deep zone after the cliff descent, over the dark water beside the cliff (which is on the right).
// skills 0 -> 1: the jellyfish light up one by one. contact 0 -> 1: they drift up and away, and the
// anglerfish swims up, opens its mouth and the contact links come out of it.
export default function Deep({ skills, contact }: { skills: number; contact: number }) {
  const narrow = useNarrow();
  if (skills <= 0) return null;

  const n = SKILL_GROUPS.length;
  const enter = smooth(skills / 0.12);
  const leave = smooth(contact / 0.25); // gone before the anglerfish comes close

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 15, pointerEvents: "none", color: "white", overflow: "hidden" }}>
      {/* Darkens the open water a little more, so the glow reads */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(1,6,14,0.65), rgba(1,6,14,0.25) 60%, transparent)",
          opacity: enter,
        }}
      />

      {PLANKTON.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: `hsl(${p.hue}, 100%, 75%)`,
            boxShadow: `0 0 ${p.size * 3}px hsl(${p.hue}, 100%, 65%)`,
            opacity: enter * 0.8,
            transform: `translateY(${-(skills + contact) * p.rise}vh)`, // you sink past them, so they rise
            animation: `glow-pulse ${p.pulse}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* Skills */}
      <section
        style={{
          position: "absolute",
          left: "max(5vw, 20px)",
          top: 0,
          bottom: 0,
          width: "min(60vw, 760px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: enter * (1 - leave),
          transform: `translateY(${(1 - enter) * 40 - leave * 30}vh)`,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(150,220,255,0.8)" }}>
          The deep
        </p>
        <h2 style={{ margin: "8px 0 0", fontSize: "clamp(2rem, 6vh, 3.4rem)", fontWeight: 700 }}>Skills</h2>
        <p style={{ margin: "8px 0 0", fontSize: "clamp(0.95rem, 2.2vh, 1.15rem)", opacity: 0.75 }}>What I work with down here</p>

        <div
          style={{
            marginTop: "4vh",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "3.5vh 3vw",
          }}
        >
          {SKILL_GROUPS.map((g, i) => {
            const lit = smooth(skills * (n + 0.8) - 0.4 - i); // one after another as you sink
            return (
              <div
                key={g.title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  opacity: 0.25 + 0.75 * lit,
                  transform: `translateY(${(1 - lit) * 24}px)`,
                }}
              >
                <Jelly hue={g.hue} lit={lit} size={52} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "clamp(1.05rem, 2.6vh, 1.35rem)", color: `hsl(${g.hue}, 100%, 82%)` }}>{g.title}</h3>
                  <ul style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 0", padding: 0, listStyle: "none" }}>
                    {g.skills.map((s) => (
                      <li
                        key={s}
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 13,
                          border: `1px solid hsla(${g.hue}, 100%, 75%, ${0.25 + 0.4 * lit})`,
                          background: `hsla(${g.hue}, 100%, 60%, ${0.06 + 0.12 * lit})`,
                          boxShadow: `0 0 ${12 * lit}px hsla(${g.hue}, 100%, 65%, 0.35)`,
                        }}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact: mounted near the end of Skills so the model is loaded before it swims up */}
      {skills > 0.7 && <AnglerContact progress={contact} links={CONTACT_LINKS} narrow={narrow} />}
    </div>
  );
}
