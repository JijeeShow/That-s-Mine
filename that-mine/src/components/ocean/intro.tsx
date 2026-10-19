"use client";

import { useEffect } from "react";
import { useScrollPx } from "../scrollBridge";

// Title text on top of everything; fades out within the first ~12% of the scroll.
export default function Intro() {
  const offset = useScrollPx();
  const x = 400;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2, // topmost layer
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 8vw",
        color: "white",
        pointerEvents: "none",
        opacity: offset < x ? 1 : 0, // fade out over the first ~12% of the scroll
        transform: `translateY(${offset < x ? offset / 12 : 100}px)`, // move down over the first ~12% of the scroll
        transition: "opacity 0.2s, transform 0.2s",
        textShadow: "0 2px 12px rgba(0,0,0,0.5)",
      }}
    >
      <p
        style={{
          fontSize: "0.95rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          opacity: 0.8,
          margin: 0,
          marginBottom: "0.5rem",
        }}
      >
        Hi there! I&apos;m
      </p>
      <h1
        style={{
          fontSize: "clamp(2.25rem, 7vw, 4rem)",
          fontWeight: 700,
          margin: 0,
        }}
      >
        Kittipat Chofa
      </h1>
      <p
        style={{
          fontSize: "1.15rem",
          opacity: 0.85,
          marginTop: "0.75rem",
          maxWidth: 480,
        }}
      >
        Call me Jijee
      </p>

      {/* Scroll hint */}
      <div
        style={{
          position: "absolute",
          bottom: "6vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.4rem",
          animation: "bounce-down 1.8s ease-in-out infinite",
        }}
      >
        <span
          style={{ fontSize: "0.8rem", letterSpacing: "0.1em", opacity: 0.8 }}
        >
          เลื่อนลง
        </span>
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
          <path
            d="M1 1L10 10L19 1"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
