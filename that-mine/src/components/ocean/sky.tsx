"use client";

import dynamic from "next/dynamic";
import { SEA_LEVEL_PERCENT } from "../../lib/const/constants";
import { useScrollPx } from "../scrollBridge";
import { useSmoothValue, useViewportHeight } from "../../lib/hooks";
import SkyDecor from "./skydecor";

const Boat3D = dynamic(() => import("../Boat3D"), { ssr: false });

const BOAT_TOP_PERCENT = SEA_LEVEL_PERCENT - 4; // top of the boat's box; the hull meets the water well below the horizon
const BOAT_RISE_VH = 4; // how far it drifts toward the horizon while sailing away (stays below it)

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Sky + surface water + sailing boat. Slides up and fades away as you scroll, then unmounts.
export default function SkyOverlay() {
  const px = useScrollPx();
  const vh = useViewportHeight();
  const progress = vh > 0 ? Math.min(1, px / (vh * 1.1)) : 0; // 1.1 screens to slide away
  // 500px of scroll to finish sailing; eased per frame so wheel steps glide instead of jumping.
  const boatProgress = useSmoothValue(easeOutCubic(Math.min(1, px / 500)), 0.12, 0.0005);
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
      <SkyDecor px={px} />
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
      {/* The boat rocks inside its own 3D scene; this box only carries it across the water. */}
      <div
        style={{
          position: "absolute",
          left: "2%",
          top: `${BOAT_TOP_PERCENT}%`,
          width: 480,
          height: 290,
          pointerEvents: "none",
          transform: `translate(${boatProgress * 12}vw, -${boatProgress * BOAT_RISE_VH}vh)`, // drifts right and a little toward the horizon
        }}
      >
        <Boat3D progress={boatProgress} />
      </div>
    </div>
  );
}
