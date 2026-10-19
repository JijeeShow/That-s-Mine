"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Bounds } from "@react-three/drei";

function RockModel({ url, onLoaded }: { url: string; onLoaded: () => void }) {
  const { scene } = useGLTF(url);
  useEffect(() => {
    onLoaded();
  }, [onLoaded]);
  return <primitive object={scene} />;
}

// Static rock - no scroll-tied progress/dolly like Boat3D needs, just load and sit there.
export default function Rock3D({ url }: { url: string }) {
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
        camera={{ position: [1.5, 1.2, 1.5], fov: 35 }}
        dpr={[1, 2]}
        frameloop="demand" // static model - redraw only on demand
      >
        <ambientLight intensity={1} />
        <directionalLight position={[3, 5, 2]} intensity={1.3} />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} />
        <Suspense fallback={null}>
          <Bounds fit clip margin={1.1} maxDuration={0.001}>
            <RockModel url={url} onLoaded={handleLoaded} />
          </Bounds>
        </Suspense>
      </Canvas>
    </div>
  );
}
