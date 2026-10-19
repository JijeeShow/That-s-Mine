"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollPx } from "../components/scrollBridge";

export function useViewportHeight() {
  const [vh, setVh] = useState(0);
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return vh;
}

// Shared by waves.tsx and the cover threshold below so they can't drift apart.
export const WAVE_RISE_SPEED = 1.7; // px risen per px scrolled
export const WAVE_FRONT_TOP_OFFSET_PX = 100; // wave front's resting offset below the viewport

// Scroll px at which the front crest has risen past the top of the viewport
// ("fully underwater"). The bubbles, depth tint and sand all switch on from here.
export function useWaveCoverThreshold() {
  const vh = useViewportHeight();
  return vh > 0 ? (vh + WAVE_FRONT_TOP_OFFSET_PX) / WAVE_RISE_SPEED : Infinity;
}

// Scroll px past the cover point, clamped at 0 (0 until the screen is covered).
export function usePxPastCover() {
  const px = useScrollPx();
  return Math.max(0, px - useWaveCoverThreshold());
}

// Eases toward `target` a little each frame, so jumpy input (wheel steps) turns into smooth motion.
// ease = fraction of the remaining gap covered per frame; snaps once within `epsilon`.
export function useSmoothValue(target: number, ease = 0.1, epsilon = 0.001) {
  const current = useRef(target);
  const [value, setValue] = useState(target);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      current.current += (target - current.current) * ease;
      if (Math.abs(target - current.current) < epsilon) current.current = target;
      setValue(current.current);
      if (current.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ease, epsilon]);

  return value;
}
