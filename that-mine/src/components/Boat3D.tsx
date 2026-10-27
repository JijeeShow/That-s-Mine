"use client";

import { memo, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const SHIP_URL = "/models/Ship.glb";

// World y = 0 is the sea surface. The model is lowered by WATERLINE so its hull sits that deep,
// and everything below y = 0 is clipped away - the hull looks submerged instead of floating on top.
const WATERLINE = 0.6; // model-space height (the hull starts at -0.27, portholes are at ~1.35)
const SEA_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// The bow points along -Z. Seen from this side the ship heads to the right and slightly toward the viewer.
const CAMERA_DIR = new THREE.Vector3(0.83, 0.3, 0.67).normalize();
const LOOK_AT = new THREE.Vector3(0, 1.4, -0.2);
const START_DISTANCE = 22;
const DOLLY_FACTOR = 1.8; // camera ends this many times farther away at progress=1
const FPS = 30; // the rocking is slow - 30fps looks the same as 60 at half the GPU work

// Renders at a fixed FPS instead of every display frame (the Canvas runs frameloop="demand").
function FrameLimiter() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = setInterval(() => invalidate(), 1000 / FPS);
    return () => clearInterval(id);
  }, [invalidate]);
  return null;
}

function ShipModel({ onLoaded }: { onLoaded: () => void }) {
  const { scene } = useGLTF(SHIP_URL);
  const rock = useRef<THREE.Group>(null);

  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        m.clippingPlanes = [SEA_PLANE];
      }
    });
    onLoaded();
  }, [scene, onLoaded]);

  // Gentle roll, pitch and heave on separate periods so it never looks like a loop.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = rock.current;
    if (!g) return;
    g.rotation.z = Math.sin(t * 0.9) * 0.035;
    g.rotation.x = Math.sin(t * 0.63 + 1) * 0.02;
    g.position.y = Math.sin(t * 1.1) * 0.06;
  });

  return (
    <group ref={rock}>
      <primitive object={scene} position={[0, -WATERLINE, 0]} />
    </group>
  );
}

// Fades a strip from opaque at v=0 to clear at v=1 (texture is shared by the wake strips).
function useFadeTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
}

// Foam hugging the hull at the waterline plus a V-shaped wake trailing behind the stern (+Z).
function Foam() {
  const fade = useFadeTexture();
  const strip = (x: number, angle: number, width: number, length: number, opacity: number) => (
    <mesh
      position={[x + Math.sin(angle) * length * 0.5, 0.01, 5.2 + Math.cos(angle) * length * 0.5]}
      rotation={[-Math.PI / 2, 0, angle]}
    >
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial map={fade} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );

  return (
    <group>
      {/* Darker water where the hull goes under, so it reads as submerged */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[2.1, 5.6, 1]} position={[0, 0.005, -0.2]}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color="#1f6f8b" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {/* Foam ring at the waterline, thicker at bow and stern */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[2.3, 6, 1]} position={[0, 0.01, -0.2]}>
        <ringGeometry args={[0.93, 1.07, 64]} />
        <meshBasicMaterial color="white" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[2.9, 6.8, 1]} position={[0, 0.01, -0.2]}>
        <ringGeometry args={[0.96, 1.04, 64]} />
        <meshBasicMaterial color="white" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {/* Wake: two diverging lines and a churned center behind the stern, fading with distance */}
      {strip(-1.2, -0.32, 0.5, 5, 0.5)}
      {strip(1.2, 0.32, 0.5, 5, 0.5)}
      {strip(0, 0, 1.6, 4, 0.35)}
    </group>
  );
}

// Places the camera along CAMERA_DIR and pulls it back smoothly as progress goes 0 -> 1, so the
// ship shrinks while sailing away. Eased per frame, so coarse scroll steps never show as jumps.
function DollyCamera({ progress }: { progress: number }) {
  const { camera } = useThree();
  const target = useRef(progress);
  const shown = useRef(progress);
  useEffect(() => {
    target.current = progress;
  }, [progress]);

  useFrame((_, dt) => {
    shown.current += (target.current - shown.current) * (1 - Math.exp(-dt / 0.12));
    const distance = START_DISTANCE * (1 + shown.current * (DOLLY_FACTOR - 1));
    camera.position.copy(LOOK_AT).addScaledVector(CAMERA_DIR, distance);
    camera.lookAt(LOOK_AT);
  });

  return null;
}

function Boat3D({ progress = 0 }: { progress?: number }) {
  // Hide the canvas until the model has loaded, to skip the one-frame flash.
  const [ready, setReady] = useState(false);
  const handleLoaded = useMemo(() => () => requestAnimationFrame(() => setReady(true)), []);

  return (
    <div style={{ width: "100%", height: "100%", opacity: ready ? 1 : 0, transition: "opacity 0.3s ease" }}>
      <Canvas
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true; // needed for the waterline clip
        }}
        style={{ background: "transparent" }}
        camera={{ fov: 30, near: 0.5, far: 200 }}
        dpr={[1, 1.5]} // 2x is ~1.8x the pixels for little visible gain on a boat this small
        frameloop="demand" // FrameLimiter drives redraws
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[6, 9, -4]} intensity={2} />
        <directionalLight position={[-5, 3, 6]} intensity={0.5} />
        <Suspense fallback={null}>
          <ShipModel onLoaded={handleLoaded} />
          <Foam />
        </Suspense>
        <DollyCamera progress={progress} />
        <FrameLimiter />
      </Canvas>
    </div>
  );
}

export default memo(Boat3D);

useGLTF.preload(SHIP_URL);
