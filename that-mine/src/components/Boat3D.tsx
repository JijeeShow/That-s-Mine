"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Bounds } from "@react-three/drei";

const SHIP_URL = "/models/Ship_Large.gltf";

// Note: this renders a single static mesh with no scroll dependency at all
// - unlike OceanScene's old SharkyScrollScene, it doesn't touch drei's
// <ScrollControls>/useScroll (see CLAUDE.md for why those are banned here).
// <Bounds fit clip> auto-frames the model regardless of its raw scale, so
// we don't need to know the ship's real-world dimensions up front.
function ShipModel() {
  const { scene } = useGLTF(SHIP_URL);
  return <primitive object={scene} />;
}

export default function Boat3D() {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
      camera={{ position: [3, 2.5, 4], fov: 32 }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.3}>
          <ShipModel />
        </Bounds>
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(SHIP_URL);
