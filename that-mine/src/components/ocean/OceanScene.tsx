"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { DEEP_EDGE_COLOR } from "../../lib/const/constants";
import { useViewportHeight } from "../../lib/hooks";
import Intro, { DiveHint } from "./intro";
import SeaFloor, { PX_PER_LAYER, sandFlowStartPx, useSandFlow } from "./sand";
import { ScrollDriver } from "./scroll";
import { setSectionTargets } from "../scrollBridge";
import SkyOverlay from "./sky";
import {
  SeaDepthTint,
  SeaFloorBubbles,
  SeaLightRays,
  SeaSnow,
} from "./underwater";
import DeepWaveSeam from "./waves";
import Aboutme, { ABOUT_CHUNK_COUNT } from "../aboutme/Aboutme";
import Projects from "../projects/Projects";
import SiltWipe, { WIPE_COVER_FROM, WIPE_COVER_TO } from "./siltWipe";
import Deep from "../deep/Deep";

const Canyon = dynamic(() => import("./canyon"), { ssr: false });
import { CLEARINGS, clearingFocus, pathS } from "./canyonLayout";
import { clamp01 } from "../../lib/math";

// Fallback track height before the screen height is known; the real height is computed from the timeline below.
const TRACK_VH = 1500;
const BUBBLE_STAND_PX = 300; // scroll px a bubble rests still in the middle
const BUBBLE_MOVE_PX = 360; // scroll px for it to give way to the next one
const WIPE_PX = 1000; // scroll px of the bubble rush that changes scene from About to the canyon entrance
const TRAVEL_PX = 5600; // scroll px of walking the winding canyon path past all the projects
const DESCENT_PX = 4600; // scroll px of walking down the short slope after the canyon, out past the cliff edge and down along the cliff
const SKILLS_PX = 2400; // scroll px of the deep zone where the skill groups fade in one by one
const CONTACT_PX = 1400; // scroll px of the anglerfish lighting the contact card
const END_REST_PX = 300; // scroll px that stay pinned at the end before the section releases

// Track is a normal-flow block; the single sticky inner div pins to the
// viewport for the whole dwell. Layers stack by z-index, then DOM order.
export default function OceanScene() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { offset, t } = useSandFlow();
  const vh = useViewportHeight();
  // 0 until the sand is within 40% of a screen from its resting spot, then 1 once it arrives.
  const aboutProgress =
    vh > 0 ? clamp01(1 - offset / (vh * 0.4)) : 0;

  // Position along the About bubbles: each one rests still for BUBBLE_STAND_PX, then the next takes BUBBLE_MOVE_PX to arrive.
  const flowPx = t * PX_PER_LAYER;
  const period = BUBBLE_STAND_PX + BUBBLE_MOVE_PX;
  const aboutScroll = Math.min(
    ABOUT_CHUNK_COUNT - 1,
    Math.floor(flowPx / period) +
      Math.min(
        1,
        Math.max(0, ((flowPx % period) - BUBBLE_STAND_PX) / BUBBLE_MOVE_PX),
      ),
  );

  // After the last bubble has rested, a rush of bubbles fills the screen and the scene changes
  // underneath it: About (sand) before, the canyon entrance (Projects) after.
  const wipeStart = (ABOUT_CHUNK_COUNT - 1) * period + BUBBLE_STAND_PX;
  const wipe = clamp01((flowPx - wipeStart) / WIPE_PX);
  const inCanyon = wipe >= (WIPE_COVER_FROM + WIPE_COVER_TO) / 2;
  const travel = Math.min(
    1,
    Math.max(0, (flowPx - wipeStart - WIPE_PX) / TRAVEL_PX),
  );
  const descent = clamp01((flowPx - wipeStart - WIPE_PX - TRAVEL_PX) / DESCENT_PX);
  const deepStart = wipeStart + WIPE_PX + TRAVEL_PX + DESCENT_PX;
  const skills = clamp01((flowPx - deepStart) / SKILLS_PX);
  const contact = clamp01((flowPx - deepStart - SKILLS_PX) / CONTACT_PX);
  // Where the navbar's sections sit on this timeline, as window scrollY: the sand's flow starts sandFlowStartPx
  // into the track, and everything after is counted in flow px from there.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || vh === 0) return;
    const flowStart = track.getBoundingClientRect().top + window.scrollY + sandFlowStartPx(vh);
    setSectionTargets({
      home: 0,
      about: flowStart, // the first About bubble resting
      projects: flowStart + wipeStart + WIPE_PX, // canyon entrance, once the silt has cleared
      contact: flowStart + deepStart + SKILLS_PX + CONTACT_PX, // the anglerfish open with the contact card
    });
  }, [vh, wipeStart, deepStart]);

  // Mount the canyon (hidden) while the last bubble is still arriving, so its WebGL setup is done in advance.
  const canyonReady = aboutScroll > ABOUT_CHUNK_COUNT - 1.5;

  // Track height from the scroll timeline (which mixes fixed px with screen-height-dependent parts), so every
  // screen size gets exactly enough scroll to walk the whole canyon.
  const trackHeight =
    vh > 0
      ? `${sandFlowStartPx(vh) + wipeStart + WIPE_PX + TRAVEL_PX + DESCENT_PX + SKILLS_PX + CONTACT_PX + END_REST_PX + vh}px`
      : `${TRACK_VH}vh`;

  return (
    <div ref={trackRef} style={{ position: "relative", height: trackHeight }}>
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
        <SeaSnow scrollBoost={1 - aboutProgress} />
        {!inCanyon && <SeaFloorBubbles scrollBoost={1 - aboutProgress} />}
        {canyonReady && <Canyon visible={inCanyon} travel={travel} descent={descent} sink={(skills + contact) / 2} />}
        {!inCanyon && <SeaFloor offset={offset} t={t} />}
        <Intro />
        {inCanyon && (
          <Projects
            arrive={wipe}
            leave={travel}
            focus={CLEARINGS.map((_, i) => clearingFocus(i, pathS(travel)))}
          />
        )}
        {!inCanyon && <Aboutme progress={aboutProgress} scroll={aboutScroll} />}
        <DiveHint visible={aboutProgress * (1 - Math.min(1, t * 3))} />
        <Deep skills={skills} contact={contact} />
        <SiltWipe progress={wipe} />
      </div>

      <ScrollDriver trackRef={trackRef} />
    </div>
  );
}
