"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Light in the canyon: shafts of light from above, and ripple light (caustics) on the sand. Nothing runs on a
// timer, so the canvas still only redraws when you scroll.

type Frame = (s: number) => { point: THREE.Vector3; forward: THREE.Vector3; left: THREE.Vector3 };

// Pseudo-random in 0..1, fixed per index.
const rand = (i: number, k: number) => {
  const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// Vertical strip that is bright at the top and fades out toward the bottom and both edges.
function makeShaftTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  const down = g.createLinearGradient(0, 0, 0, 256);
  down.addColorStop(0, "rgba(255,255,255,0.9)");
  down.addColorStop(0.6, "rgba(255,255,255,0.35)");
  down.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = down;
  g.fillRect(0, 0, 64, 256);
  g.globalCompositeOperation = "destination-in";
  const across = g.createLinearGradient(0, 0, 64, 0);
  across.addColorStop(0, "rgba(0,0,0,0)");
  across.addColorStop(0.5, "rgba(0,0,0,1)");
  across.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = across;
  g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

const SHAFT_SPACING = 9; // along the path
const SHAFT_TOP = 26;
const SHAFT_LEAN = 0.32; // radians the light leans (from the sun's side)

// Soft shafts of light falling into the canyon from above, two crossed planes each so they read from any angle.
// They fade in the fog like everything else, and dim with lit.
export function LightShafts({ until, frame, lit }: { until: number; frame: Frame; lit: number }) {
  const { geometry, map, matrices } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.translate(0, -0.5, 0); // hangs down from its top edge
    const matrices: THREE.Matrix4[] = [];
    let i = 0;
    for (let s = 6; s < until; s += SHAFT_SPACING, i++) {
      const { point, left } = frame(s + rand(i, 31) * 4);
      const width = 1.6 + rand(i, 32) * 2.2;
      const length = SHAFT_TOP + 4;
      const top = point.clone().addScaledVector(left, (rand(i, 33) - 0.5) * 6);
      top.y = SHAFT_TOP;
      for (const turn of [0, Math.PI / 2]) {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand(i, 34) * Math.PI + turn, SHAFT_LEAN, "YXZ"));
        matrices.push(new THREE.Matrix4().compose(top, q, new THREE.Vector3(width, length, 1)));
      }
    }
    return { geometry, map: makeShaftTexture(), matrices };
  }, [until, frame]);

  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const im = mesh.current;
    if (!im) return;
    matrices.forEach((mat, i) => im.setMatrixAt(i, mat));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }, [matrices]);

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, matrices.length]} renderOrder={2}>
      <meshBasicMaterial map={map} color="#e6f6ff" transparent opacity={0.3 * lit} depthWrite={false} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

// Tileable caustic pattern: bright thin lines where water cells meet (distance to the nearest two of a set of
// wrapping points), as white with the brightness in alpha.
export function makeCausticTexture() {
  const size = 256;
  const pts = Array.from({ length: 22 }, (_, i) => [rand(i, 40) * size, rand(i, 41) * size]);
  const img = new ImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // warp the lookup a little, so the cell edges wave instead of running straight (whole cycles, so it still tiles)
      const wx = x + 6 * Math.sin((y / size) * Math.PI * 4);
      const wy = y + 6 * Math.sin((x / size) * Math.PI * 6);
      let d1 = Infinity;
      let d2 = Infinity;
      for (const [px, py] of pts) {
        for (let ox = -size; ox <= size; ox += size) {
          for (let oy = -size; oy <= size; oy += size) {
            const d = Math.hypot(wx - px - ox, wy - py - oy);
            if (d < d1) [d1, d2] = [d, d1];
            else if (d < d2) d2 = d;
          }
        }
      }
      const edge = Math.max(0, 1 - (d2 - d1) / 9);
      const k = (y * size + x) * 4;
      img.data.set([255, 255, 255, Math.round(255 * edge ** 2.2)], k);
    }
  }
  const c = document.createElement("canvas");
  c.width = c.height = size;
  c.getContext("2d")!.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 9, 1 / 9); // UVs are in world units; one cell pattern every 9 units
  tex.anisotropy = 4;
  return tex;
}
