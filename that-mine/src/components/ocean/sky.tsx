"use client";

import dynamic from "next/dynamic";
import { SEA_LEVEL_PERCENT } from "../../lib/const/constants";
import { useScrollPx } from "../scrollBridge";
import { useViewportHeight } from "../../lib/hooks";

const Boat3D = dynamic(() => import("../Boat3D"), { ssr: false });

const BOAT_TOP_PERCENT = SEA_LEVEL_PERCENT + 5; // starts 5% below sea level

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Sky + surface water + sailing boat. Slides up and fades away as you scroll, then unmounts.
export default function SkyOverlay() {
  const px = useScrollPx();
  const vh = useViewportHeight();
  const progress = vh > 0 ? Math.min(1, px / (vh * 1.1)) : 0; // 1.1 screens to slide away
  const boatProgress = easeOutCubic(Math.min(1, px / 500)); // 500px of scroll to finish sailing
  const boat3DProgress = Math.round(boatProgress * 20) / 20; // nearest 5% - coarser, cuts WebGL redraws
  const translateVh = -progress * 100;
  const opacity = 1 - Math.max(0, (progress - 0.85) / 0.15); // only fade right at the end

  if (progress >= 1) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2, // lowest layer
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
          height: `${SEA_LEVEL_PERCENT}%`,
          background:
            "linear-gradient(to bottom, var(--sky-top) 0%, var(--sky-mid) 55%, var(--sky-bottom) 100%)",
        }}
      />
      {/* Water - darkens toward the bottom so it reads as a crossed boundary */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: `${SEA_LEVEL_PERCENT}%`,
          background: `linear-gradient(to bottom, var(--sea-shallow) 0%, var(--sea-light) 65%, var(--sea-mid) 100%)`,
        }}
      />
      {/* Waterline shimmer */}
      <div
        style={{
          position: "absolute",
          top: `calc(${SEA_LEVEL_PERCENT}% - 3px)`,
          left: 0,
          right: 0,
          height: 6,
          background: "linear-gradient(to right, transparent, rgba(255,255,255,0.9), transparent)",
          filter: "blur(1px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "10%",
          top: `${BOAT_TOP_PERCENT}%`,
          transform: `translateX(${boatProgress * 10}vw) translateY(-${
            boatProgress * (BOAT_TOP_PERCENT - 45)
          }vh)`, // drifts 10vw right, rises toward 45% of viewport height
          pointerEvents: "none",
          width: 260, // box the <Bounds>-fitted ship sits in
          height: 220,
        }}
      >
        <div style={{ width: "100%", height: "100%", animation: "boat-bob 4s ease-in-out infinite" }}>
          <Boat3D progress={boat3DProgress} />
        </div>
      </div>
    </div>
  );
}
