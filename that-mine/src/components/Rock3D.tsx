"use client";

import { Suspense, useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const VIEW_DIR = new THREE.Vector3(1.5, 1.2, 1.5).normalize(); // camera looks at the rock from this side
const MARGIN = 1.1;

// Own copy of the model per canvas: the same rock can be on screen in two sand layers at once, and a
// three.js object can only live in one scene - sharing it made the older copy vanish (the flicker).
// The camera is fitted to the model before the first frame is drawn (same maths as drei's <Bounds fit>,
// so framing is unchanged), and only then is the canvas shown.
function RockModel({ url, onReady }: { url: string; onReady: () => void }) {
  const { scene } = useGLTF(url);
  const rock = useMemo(() => scene.clone(true), [scene]);
  const { camera, size, invalidate } = useThree();

  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(rock);
    const center = box.getCenter(new THREE.Vector3());
    const dims = box.getSize(new THREE.Vector3());
    const cam = camera as THREE.PerspectiveCamera;
    const maxSize = Math.max(dims.x, dims.y, dims.z);
    const fitHeight = maxSize / (2 * Math.atan((Math.PI * cam.fov) / 360));
    const fitWidth = fitHeight / (size.width / size.height);
    const distance = MARGIN * Math.max(fitHeight, fitWidth);

    cam.position.copy(center).addScaledVector(VIEW_DIR, distance);
    cam.near = distance / 100;
    cam.far = distance * 100;
    cam.lookAt(center);
    cam.updateProjectionMatrix();
    invalidate();
    requestAnimationFrame(() => requestAnimationFrame(onReady)); // after the fitted frame has been drawn
  }, [rock, camera, size, invalidate, onReady]);

  return <primitive object={rock} />;
}

// Starts downloading and parsing a rock model before any canvas needs it.
export const preloadRock = (url: string) => useGLTF.preload(url);

// Static rock - no scroll-tied progress/dolly like Boat3D needs, just load and sit there.
export default function Rock3D({ url }: { url: string }) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        opacity: ready ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        camera={{ fov: 35 }}
        dpr={[1, 2]}
        frameloop="demand" // static model - redraw only on demand
      >
        <ambientLight intensity={1} />
        <directionalLight position={[3, 5, 2]} intensity={1.3} />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} />
        <Suspense fallback={null}>
          <RockModel url={url} onReady={handleReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
