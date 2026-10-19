"use client";

import { useEffect } from "react";
import { setScrollOffset } from "../scrollBridge";

// Feeds scrollBridge from real window scroll, measured relative to the
// track's own position in the page - not a custom overflow div, so
// scrolling continues naturally into whatever comes after the track once
// the sticky pin releases.
export function ScrollDriver({
  trackRef,
}: {
  trackRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let queued = false;
    const commit = () => {
      queued = false;
      const max = track.offsetHeight - window.innerHeight;
      const px =
        max > 0
          ? Math.min(max, Math.max(0, -track.getBoundingClientRect().top))
          : 0;
      setScrollOffset(max > 0 ? px / max : 0, px);
    };
    const handleScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(commit);
    };

    commit();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [trackRef]);

  return null;
}

// Adds a short decaying glide on top of native wheel scrolling so the page
// doesn't stop dead the instant the wheel does. Never preventDefaults.
export function MomentumScroll() {
  useEffect(() => {
    let velocity = 0;
    let rafId: number | null = null;

    const tick = () => {
      if (Math.abs(velocity) < 0.5) {
        velocity = 0;
        rafId = null;
        return;
      }
      window.scrollBy(0, velocity);
      velocity *= 0.8; // decay per frame - short, gentle tail
      rafId = requestAnimationFrame(tick);
    };

    const handleWheel = (e: WheelEvent) => {
      velocity += e.deltaY * 0.05;
      if (rafId === null) rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}
