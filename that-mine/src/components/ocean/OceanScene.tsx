"use client";

import { useRef } from "react";
import { DEEP_EDGE_COLOR } from "../../lib/const/constants";
import Intro from "./intro";
import SeaFloor from "./sand";
import { MomentumScroll, ScrollDriver } from "./scroll";
import SkyOverlay from "./sky";
import { SeaDepthTint, SeaFloorBubbles } from "./underwater";
import DeepWaveSeam from "./waves";

// locked in view before the section releases into whatever comes next.
const TRACK_VH = 1000;

// Track is a normal-flow block; the single sticky inner div pins to the
// viewport for the whole dwell. Layers stack by z-index, then DOM order.
export default function OceanScene() {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={trackRef} style={{ position: "relative", height: `${TRACK_VH}vh` }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          background: DEEP_EDGE_COLOR, // fills the gap once the wave crest has risen past the viewport
        }}
      >
        <SkyOverlay />
        <DeepWaveSeam />
        <SeaDepthTint />
        <SeaFloorBubbles />
        <SeaFloor />
        <Intro />
      </div>

      <ScrollDriver trackRef={trackRef} />
      <MomentumScroll />
    </div>
  );
}
