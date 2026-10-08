"use client";

import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, ContactShadows } from "@react-three/drei";
import {
  getScrollOffset,
  setScrollOffset,
  subscribeScrollOffset,
} from "./scrollBridge";

const MODEL_URL = "/models/Characters_Sharky.gltf";

type ScrollSection = {
  animation: string;
  title: string;
  body: string;
};

// Each section maps 1:1 to a "page" of scroll distance. As the user scrolls
// through a section, the matching animation clip is scrubbed from start to
// end based purely on scroll position (not elapsed time).
const SECTIONS: ScrollSection[] = [
  {
    animation: "Idle",
    title: "Sharky",
    body: "เลื่อนลงเพื่อปลุก Sharky ให้ขยับตาม scroll ของคุณ",
  },
  {
    animation: "Walk",
    title: "Walk",
    body: "ทุกเฟรมของอนิเมชันถูกคำนวณจากตำแหน่ง scroll ไม่ใช่เวลาจริง",
  },
  {
    animation: "Run",
    title: "Run",
    body: "เลื่อนเร็วหรือช้าก็ได้ อนิเมชันจะตามตำแหน่งการเลื่อนเสมอ",
  },
  {
    animation: "Jump",
    title: "Jump",
    body: "ใกล้ถึงท้ายหน้าแล้ว Sharky กำลังกระโดด",
  },
  {
    animation: "Wave",
    title: "Hello!",
    body: "ตัวอย่าง scroll-driven 3D model ด้วย React Three Fiber + drei",
  },
];

function getSectionIndex(offset: number) {
  const segmentLength = 1 / SECTIONS.length;
  return Math.min(SECTIONS.length - 1, Math.floor(offset / segmentLength));
}

function SharkyModel() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions, mixer } = useAnimations(animations, group);
  const activeName = useRef<string | null>(null);

  useFrame((state) => {
    if (!group.current) return;

    // Read straight from our own scroll bridge (see ScrollLayer below and
    // scrollBridge.ts) instead of drei's useScroll/<ScrollControls>. drei's
    // version depends on react-three-fiber's async pointer-event
    // "connect" wiring to attach its internal scroll listener, which in
    // practice never fired here (verified: even manually setting
    // el.scrollTop and dispatching a real 'scroll' event did nothing).
    // Reading a plain window-backed value every frame has no such
    // dependency.
    const offset = getScrollOffset();

    const segmentLength = 1 / SECTIONS.length;
    const segmentIndex = getSectionIndex(offset);
    const localT = THREE.MathUtils.clamp(
      (offset - segmentIndex * segmentLength) / segmentLength,
      0,
      1
    );
    const name = SECTIONS[segmentIndex].animation;

    // Switch the active clip when we cross into a new section.
    if (activeName.current !== name) {
      if (activeName.current) actions[activeName.current]?.stop();
      const next = actions[name];
      if (next) {
        next.reset();
        next.enabled = true;
        next.weight = 1;
        // timeScale 0 freezes automatic time advance - we scrub .time by hand
        // to tie the pose directly to scroll position instead of wall clock.
        next.timeScale = 0;
        next.play();
      }
      activeName.current = name;
    }

    const action = actions[name];
    if (action) {
      const duration = action.getClip().duration;

      action.time = THREE.MathUtils.clamp(
        localT * duration,
        0,
        Math.max(duration - 0.001, 0)
      );
      mixer.update(0);
    }

    // Keep the camera pointed at the character.
    state.camera.lookAt(0, 0.6, 0);
  });

  return <primitive ref={group} object={scene} />;
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#0b0b10"]} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a22" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 2]} intensity={1.8} castShadow />
      <Suspense fallback={null}>
        <SharkyModel />
      </Suspense>
      <ContactShadows
        position={[0, -1.01, 0]}
        opacity={0.5}
        scale={8}
        blur={2.5}
        far={4}
      />
    </>
  );
}

// Plain DOM overlay, kept outside the Canvas entirely. It subscribes to the
// scroll offset forwarded from ScrollLayer and just swaps text.
function SectionOverlay() {
  const offset = useSyncExternalStore(
    subscribeScrollOffset,
    getScrollOffset,
    () => 0
  );
  const section = SECTIONS[getSectionIndex(offset)];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        boxSizing: "border-box",
        padding: "0 8vw",
        pointerEvents: "none",
      }}
    >
      <div style={{ maxWidth: 420, color: "white" }}>
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            margin: 0,
            marginBottom: "0.75rem",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          {section.title}
        </h2>
        <p
          style={{
            fontSize: "1.1rem",
            lineHeight: 1.6,
            margin: 0,
            opacity: 0.85,
            textShadow: "0 1px 8px rgba(0,0,0,0.6)",
          }}
        >
          {section.body}
        </p>
      </div>
    </div>
  );
}

// A plain, fully React-owned scrollable container. It sits above the
// Canvas (so it receives wheel/touch input) and below Navbar, is visually
// transparent, and just reports scroll progress (0-1) into scrollBridge.
// No drei <ScrollControls> involved - that one's internal scroll listener
// depends on r3f's async event "connect" plumbing, which didn't fire
// reliably. A plain native 'scroll' listener on a div we render ourselves
// has no such dependency and is standard, well-understood browser behavior.
function ScrollLayer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const offset = max > 0 ? THREE.MathUtils.clamp(el.scrollTop / max, 0, 1) : 0;
      setScrollOffset(offset);
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10,
        overflowY: "auto",
      }}
    >
      <div style={{ height: `${SECTIONS.length * 100}vh` }} />
    </div>
  );
}

export default function SharkyScrollScene() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas camera={{ position: [0, 1.3, 4.4], fov: 42 }} shadows>
        <Scene />
      </Canvas>
      <SectionOverlay />
      <ScrollLayer />
    </div>
  );
}

useGLTF.preload(MODEL_URL);
