"use client";

import { useEffect } from "react";
import { setScrollPx } from "../scrollBridge";

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
      setScrollPx(max > 0 ? Math.min(max, Math.max(0, -track.getBoundingClientRect().top)) : 0);
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
