"use client";

import { memo, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Bounds } from "@react-three/drei";

const SHIP_URL = "/models/Ship_Large.gltf";

const DOLLY_FACTOR = 2; // camera ends this many times farther away at progress=1

function ShipModel({ onLoaded }: { onLoaded: () => void }) {
  const { scene } = useGLTF(SHIP_URL);
  useEffect(() => {
    onLoaded();
  }, [onLoaded]);
  return <primitive object={scene} />;
}

// Pulls the camera back as progress goes 0 -> 1, so the ship shrinks while sailing away.
function DollyCamera({ progress, ready }: { progress: number; ready: boolean }) {
  const { camera, invalidate } = useThree();
  const baseDistance = useRef<number | null>(null);

  useEffect(() => {
    if (ready) invalidate();
  }, [ready, progress, invalidate]);

  useFrame(() => {
    if (!ready) return;
    if (baseDistance.current === null) {
      baseDistance.current = camera.position.length();
    }
    camera.position.setLength(
      baseDistance.current * (1 + progress * (DOLLY_FACTOR - 1)),
    );
  });

  return null;
}

function Boat3D({ progress = 0 }: { progress?: number }) {
  // Hide the canvas until Bounds has actually fit, to skip the one-frame flash.
  const [ready, setReady] = useState(false);
  const handleLoaded = useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        opacity: ready ? 1 : 0,
        transition: "opacity 0.15s ease",
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        camera={{ position: [1.5, 5, -1], fov: 32 }}
        dpr={[1, 2]}
        frameloop="demand" // static scene - redraw only on demand
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 2]} intensity={1.4} />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} />
        <Suspense fallback={null}>
          {/* maxDuration near-0: snap the fit instantly instead of drei's default 1s fly-in */}
          <Bounds fit clip margin={1} maxDuration={0.001}>
            <ShipModel onLoaded={handleLoaded} />
          </Bounds>
        </Suspense>
        <DollyCamera progress={progress} ready={ready} />
      </Canvas>
    </div>
  );
}

export default memo(Boat3D); // skip re-render when progress is unchanged

useGLTF.preload(SHIP_URL);
