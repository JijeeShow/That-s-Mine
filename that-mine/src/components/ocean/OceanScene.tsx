"use client";

import { useRef } from "react";
import { DEEP_EDGE_COLOR } from "../../lib/const/constants";
import { useViewportHeight } from "../../lib/hooks";
import Intro, { DiveHint } from "./intro";
import SeaFloor, { PX_PER_LAYER, useSandFlow } from "./sand";
import { MomentumScroll, ScrollDriver } from "./scroll";
import SkyOverlay from "./sky";
import { SeaDepthTint, SeaFloorBubbles, SeaLightRays, SeaSnow } from "./underwater";
import DeepWaveSeam from "./waves";
import Aboutme, { ABOUT_CHUNK_COUNT } from "../aboutme/Aboutme";

// locked in view before the section releases into whatever comes next.
const TRACK_VH = 1000;
const BUBBLE_STAND_PX = 200; // scroll px a bubble rests still in the middle
const BUBBLE_MOVE_PX = 360; // scroll px for it to give way to the next one

// Track is a normal-flow block; the single sticky inner div pins to the
// viewport for the whole dwell. Layers stack by z-index, then DOM order.
export default function OceanScene() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { offset, t } = useSandFlow();
  const vh = useViewportHeight();
  // 0 until the sand is within 40% of a screen from its resting spot, then 1 once it arrives.
  const aboutProgress = vh > 0 ? Math.min(1, Math.max(0, 1 - offset / (vh * 0.4))) : 0;

  // Position along the About bubbles: each one rests still for BUBBLE_STAND_PX, then the next takes BUBBLE_MOVE_PX to arrive.
  const flowPx = t * PX_PER_LAYER;
  const period = BUBBLE_STAND_PX + BUBBLE_MOVE_PX;
  const aboutScroll = Math.min(
    ABOUT_CHUNK_COUNT - 1,
    Math.floor(flowPx / period) + Math.min(1, Math.max(0, ((flowPx % period) - BUBBLE_STAND_PX) / BUBBLE_MOVE_PX)),
  );

  return (
    <div
      ref={trackRef}
      style={{ position: "relative", height: `${TRACK_VH}vh` }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10, // above the track but below the layers
          height: "100vh",
          overflow: "hidden",
          background: DEEP_EDGE_COLOR, // fills the gap once the wave crest has risen past the viewport
        }}
      >
        <SkyOverlay />
        <DeepWaveSeam />
        <SeaDepthTint />
        <SeaLightRays />
        <SeaSnow />
        <SeaFloorBubbles />
        <SeaFloor offset={offset} t={t} />
        <Intro />
        <Aboutme progress={aboutProgress} scroll={aboutScroll} />
        <DiveHint visible={aboutProgress * (1 - Math.min(1, t * 3))} />
      </div>

      <ScrollDriver trackRef={trackRef} />
      <MomentumScroll />
    </div>
  );
}
