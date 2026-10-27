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
function useWaveCoverThreshold() {
  const vh = useViewportHeight();
  return vh > 0 ? (vh + WAVE_FRONT_TOP_OFFSET_PX) / WAVE_RISE_SPEED : Infinity;
}

// Scroll px past the cover point, clamped at 0 (0 until the screen is covered).
export function usePxPastCover() {
  const px = useScrollPx();
  return Math.max(0, px - useWaveCoverThreshold());
}

// Eases values toward their targets, so jumpy input (wheel steps) turns into smooth motion.
// ease = fraction of the remaining gap covered per 60fps frame; snaps once within `epsilon`.
// Time-based: a slow frame covers proportionally more, so the scene never falls further behind when the
// frame rate drops. Values passed together share one loop and one state update - one render per frame.
// How quickly scroll-driven motion catches up with the wheel: share of the gap closed per 60fps frame.
// Higher = snappier, lower = floatier. 0.25 settles in about 0.17s; 0.1 took about half a second.
export const SCROLL_EASE = 0.25;

export function useSmoothValues(targets: number[], ease: number[], epsilon: number[]) {
  const current = useRef(targets);
  const [values, setValues] = useState(targets);
  // Keyed by content, so a re-render with the same numbers doesn't restart the loop.
  const targetKey = targets.join(",");
  const easeKey = ease.join(",");
  const epsilonKey = epsilon.join(",");

  useEffect(() => {
    const goal = targetKey.split(",").map(Number);
    const rate = easeKey.split(",").map(Number);
    const snap = epsilonKey.split(",").map(Number);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const frames = Math.min(4, Math.max(0, (now - last) / (1000 / 60))); // 60fps frames elapsed; capped after a stall
      last = now;
      let settled = true;
      current.current = current.current.map((v, i) => {
        const next = v + (goal[i] - v) * (1 - Math.pow(1 - rate[i], frames));
        if (Math.abs(goal[i] - next) < snap[i]) return goal[i];
        settled = false;
        return next;
      });
      setValues(current.current);
      if (!settled) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetKey, easeKey, epsilonKey]);

  return values;
}

export function useSmoothValue(target: number, ease = 0.1, epsilon = 0.001) {
  return useSmoothValues([target], [ease], [epsilon])[0];
}
