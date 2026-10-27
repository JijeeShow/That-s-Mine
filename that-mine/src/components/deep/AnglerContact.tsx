"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { smooth } from "../../lib/math";

const MODEL = "/models/anglerfish/anglerfish.glb";
const MOUTH_OPEN = 0.78; // jaw angle (radians) wide open, as in the model's MouthOpen pose
const LURE_TIP = new THREE.Vector3(0, 0.59, 1.05); // the glowing bulb, in the Lure node's space
const LURE_COLOR = "#8DF8FF";
const CAMERA_Z = 6.5;
const FOV = 38;
const MOUTH_HALF = 0.55; // half the mouth's width, in model units
const MOUTH_FILL = 0.78; // how much of the screen width the open mouth spans up close
const MOUTH_FILL_NARROW = 1.15; // on a phone it comes closer, past the screen edges, so the text stays readable
const FAR_Z = -14; // where it starts, small in the dark
const TEXT_W = 560; // px width the mouth text is laid out at, before scaling to the mouth

export type ContactLink = { label: string; detail?: string; href: string };

// Soft round glow for the lure, drawn as an additive sprite.
function makeGlow() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(220,255,245,1)");
  r.addColorStop(0.25, "rgba(143,255,224,0.55)");
  r.addColorStop(1, "rgba(143,255,224,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// The anglerfish. near 0..1 swims it from far off straight at the camera until its mouth fills the screen,
// open 0..1 opens its jaw. Fins, tail and lure play the model's idle loops. Every frame it pins `mouth` (a DOM
// element over the canvas) to its mouth on screen, scaled to the mouth's size there.
function Fish({ near, open, mouth }: { near: number; open: number; mouth: React.RefObject<HTMLDivElement | null> }) {
  const gltf = useGLTF(MODEL);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const parts = useMemo(
    () => ({
      jaw: scene.getObjectByName("Jaw")!,
      lure: scene.getObjectByName("Lure")!,
      anchor: scene.getObjectByName("ContactAnchor")!,
    }),
    [scene],
  );
  const glowMap = useMemo(makeGlow, []);
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const glow = useRef<THREE.Sprite>(null);
  const live = useRef({ near, open });
  useEffect(() => {
    live.current = { near, open };
  });

  useEffect(() => {
    for (const name of ["Idle_FinL", "Idle_FinR", "Idle_Tail", "Idle_Lure"]) {
      const clip = THREE.AnimationClip.findByName(gltf.animations, name);
      if (clip) mixer.clipAction(clip).play();
    }
    return () => {
      mixer.stopAllAction();
    };
  }, [gltf, mixer]);

  const tip = useMemo(() => new THREE.Vector3(), []);
  const at = useMemo(() => new THREE.Vector3(), []);
  const edge = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const { near, open } = live.current;
    mixer.update(dt);
    parts.jaw.rotation.x = open * MOUTH_OPEN; // driven by scroll, not by its clip

    // Up close the mouth is MOUTH_FILL of the screen width (or height, whichever is smaller).
    const aspect = state.size.width / state.size.height;
    const perUnit = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * Math.min(1, aspect);
    const fill = aspect < 0.8 ? MOUTH_FILL_NARROW : MOUTH_FILL;
    const closeZ = CAMERA_Z - (2 * MOUTH_HALF) / (fill * perUnit) - 0.6;
    const t = state.clock.elapsedTime;
    const g = group.current!;
    const settle = 1 - near; // drifts in from the left and below, turned side-on, and straightens as it comes
    g.position.set(-2.5 * settle + Math.sin(t * 0.7) * 0.04 * near, -0.6 * settle + Math.sin(t * 0.9) * 0.05, FAR_Z + (closeZ - FAR_Z) * near);
    g.rotation.set(-0.12 * near, 0.9 * settle + Math.sin(t * 0.5) * 0.03, 0);

    parts.lure.localToWorld(tip.copy(LURE_TIP));
    light.current!.position.copy(tip);
    light.current!.intensity = 2 + 5 * near;
    glow.current!.position.copy(tip);

    const el = mouth.current;
    if (el) {
      parts.anchor.getWorldPosition(at);
      edge.set(MOUTH_HALF, 0, 0);
      parts.anchor.localToWorld(edge).project(state.camera);
      at.project(state.camera);
      const halfPx = ((edge.x - at.x) / 2) * state.size.width;
      const x = ((at.x + 1) / 2) * state.size.width;
      const y = ((1 - at.y) / 2) * state.size.height;
      el.style.transform = `translate(${x}px, ${y}px) scale(${(2 * halfPx * 0.8) / TEXT_W})`;
    }
  });

  return (
    <>
      <group ref={group}>
        <primitive object={scene} />
      </group>
      <pointLight ref={light} color={LURE_COLOR} distance={8} decay={1.4} />
      <sprite ref={glow} scale={[0.9, 0.9, 0.9]}>
        <spriteMaterial map={glowMap} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  );
}

// Contact zone: the anglerfish swims up out of the dark straight at you until it fills the screen, opens its
// mouth, and the contact details show inside it. progress 0 -> 1 is the contact zone's scroll.
export default function AnglerContact({ progress, links }: { progress: number; links: ContactLink[] }) {
  const near = smooth((progress - 0.12) / 0.43); // after the skills have drifted away
  const open = smooth((progress - 0.45) / 0.23);
  const text = smooth((progress - 0.62) / 0.23);
  const mouth = useRef<HTMLDivElement>(null);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <Canvas
        frameloop={progress > 0 ? "always" : "demand"} // the idle loops only run while it is on screen
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, CAMERA_Z], fov: FOV, near: 0.1 }}
        style={{ background: "transparent" }}
      >
        <fog attach="fog" args={["#020a16", 6, 20]} />
        <ambientLight intensity={0.12} color="#4a6a90" />
        <directionalLight position={[2, 5, 3]} intensity={0.35} color="#5b8cc0" />
        <Suspense fallback={null}>
          <Fish near={near} open={open} mouth={mouth} />
        </Suspense>
      </Canvas>

      {/* Pinned to the mouth and scaled with it: the contact details, laid out TEXT_W wide */}
      <div ref={mouth} style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transformOrigin: "0 0" }}>
        <section
          id="contact"
          style={{
            position: "absolute",
            left: -TEXT_W / 2,
            top: 0,
            width: TEXT_W,
            transform: `translateY(-38%) scale(${0.85 + 0.15 * text})`, // a little low, clear of the upper teeth
            opacity: text,
            pointerEvents: text > 0.8 ? "auto" : "none",
            textAlign: "center",
            color: "white",
            textShadow: "0 0 18px rgba(143,255,224,0.35)",
          }}
        >
          <p style={{ margin: 0, fontSize: 18, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(143,255,224,0.85)" }}>
            The bottom of the sea
          </p>
          <h2 style={{ margin: "6px 0 0", fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>Let&apos;s talk</h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 26 }}>
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "12px 22px",
                  borderRadius: 18,
                  color: "white",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  background: "rgba(143,255,224,0.1)",
                  border: "1px solid rgba(143,255,224,0.45)",
                  boxShadow: "0 0 24px rgba(143,255,224,0.2)",
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 600 }}>{l.label}</span>
                {l.detail && <span style={{ fontSize: 15, opacity: 0.75, marginTop: 2 }}>{l.detail}</span>}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

useGLTF.preload(MODEL);
