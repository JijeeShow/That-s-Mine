"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CHASM_S, CLEARINGS, LIP_S, PATH_POINTS, floorAt, pathS } from "./canyonLayout";
import { clamp01, smooth } from "../../lib/math";

// Individual rock pieces from the canyon kit. Each is long along local Z (the direction of travel),
// with its inner face toward local +X, so a left-wall piece faces the path as is and a right-wall
// piece is turned 180 degrees.
const PIECES = {
  mid: "/models/canyon/canyon_pillar_mid.glb",
  tall1: "/models/canyon/canyon_pillar_tall_1.glb",
  tall2: "/models/canyon/canyon_pillar_tall_2.glb",
  thin: "/models/canyon/canyon_pillar_thin.glb",
  wide: "/models/canyon/canyon_wall_wide.glb",
  rocksLow: "/models/canyon/canyon_rocks_low.glb",
  rocksSmall: "/models/canyon/canyon_rocks_small.glb",
} as const;
type Piece = keyof typeof PIECES;
const PIECE_KEYS = Object.keys(PIECES) as Piece[];
const WALL_PIECES: Piece[] = ["mid", "tall1", "wide", "tall2", "thin", "tall1", "mid", "wide"];
const PIECE_H = 9.9; // tallest kit piece, as modelled

const WATER = "#3c93de"; // sampled from the water at the horizon, so the fogged floor meets it with no seam
const ROCK_TINT = "#6a7f93"; // slate blue-grey; the models' grey vertex colors add the shading
const PANEL_TINT = "#1c2733"; // near-black blue for the project walls, so white text reads on them
const SAND = "#e4cd98"; // close to the front dune of the 2D sand
const EYE_Y = 2.6; // camera height above the canyon floor
const HORIZON = 0.74; // fraction of the screen height where the floor meets the horizon

// The winding path through the canyon (see canyonLayout), on the floor (x, z). Facing -z, screen left is -x.
const PATH = new THREE.CatmullRomCurve3(
  PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false,
  "centripetal",
);
const PATH_LENGTH = PATH.getLength();

const WALL_OFFSET = 5.9; // path center to a front-row wall piece
const BACK_OFFSET = 2.1; // extra distance for the back row, which fills gaps behind the front row
const PIECE_SPACING = 4.2; // along the path

// 0..1: how far into a project wall this point is (1 in its middle), on that side of the path.
const panelAmount = (s: number, side: number) =>
  CLEARINGS.reduce((d, c) => (c.side === side ? Math.max(d, Math.exp(-(((s - c.at) / c.width) ** 2))) : d), 0);
const PANEL_STEP_IN = 1.4; // how much closer to the path a project wall stands
const PANEL_GROW = 0.7; // extra height for a project wall (0.7 = 70% taller)

// Path frame at arc distance s: point, unit forward (tangent) and unit left.
function frameAt(s: number) {
  const u = THREE.MathUtils.clamp(s / PATH_LENGTH, 0, 1);
  const point = PATH.getPointAt(u);
  const forward = PATH.getTangentAt(u).setY(0).normalize();
  const left = new THREE.Vector3(forward.z, 0, -forward.x);
  return { point, forward, left };
}

// The way down after the last project (heights in canyonLayout): a trench whose floor slopes a little way
// down between cliffs, coming out at the top of a sheer cliff with open deep water beyond.
const CHASM_HALF = 4.6; // half width of the trench; a little wider than the gap between the rock walls, so they overhang it
const FLARE = 6; // how far each trench cliff leans back by FLARE_DEPTH below the rim
const FLARE_DEPTH = 35;
const CLIFF_DEPTH = 200;
const CLIFF_HALF = 150; // half width of the cliff face (and of the canyon floor), out past the fog
const LIP_Y = floorAt(LIP_S); // the trench floor's height at the edge
const CHASM_STEP = 1.5; // spacing of the trench geometry along the path

// The cliff edge: point where the path crosses it, forward = out over the water, left along the cliff.
const EDGE = (() => {
  const { point } = frameAt(LIP_S);
  const forward = frameAt(LIP_S + 10).point.sub(point).setY(0).normalize();
  return { point, forward, left: new THREE.Vector3(forward.z, 0, -forward.x) };
})();
// World point `across` along the cliff (+ = left), `out` from the edge over the water, at height y.
const edgePoint = (across: number, out: number, y: number) =>
  EDGE.point.clone().addScaledVector(EDGE.left, across).addScaledVector(EDGE.forward, out).setY(y);

// Path distances from..to about CHASM_STEP apart, including both ends.
const steps = (from: number, to: number) => {
  const n = Math.ceil((to - from) / CHASM_STEP);
  return Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
};
const TRENCH = steps(CHASM_S, LIP_S);

const span = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
// How far the trench cliffs have leaned back at height y (0 at the rim).
const flare = (y: number) => FLARE * smooth(clamp01(-y / FLARE_DEPTH));
// How far a rock face juts out at (a along it, height y): upright ribs, smooth both ways.
const relief = (a: number, y: number, seed: number) =>
  Math.max(
    0,
    0.6 +
      0.45 * Math.sin(a * 1.1 + seed + Math.sin(y * 0.15) * 0.8) +
      0.25 * Math.sin(a * 0.37 - y * 0.06 + seed * 3) +
      0.15 * Math.sin(a * 2.7 + y * 0.5 + seed),
  ) * 1.9;
// Grey for a rock face at height y: light fades fast below the rim.
const rockShade = (a: number, y: number, seed: number) =>
  (0.9 + 0.1 * Math.sin(a * 0.8 + y * 0.3 + seed)) * (0.22 + 0.78 * (1 - Math.min(1, -y / 30)) ** 1.5);
// How far the cliff face stands out over the water at (across, y): broad buttresses plus upright ribs, leaning out a
// little below the edge so the drop shows when looking down from it.
const cliffJut = (a: number, y: number) =>
  relief(a, y, 5) * 0.9 + 1.6 * Math.sin(a * 0.13 + Math.sin(y * 0.02) * 1.5) - 1.6 + 3 * smooth(clamp01(-y / 40));

// Pseudo-random in 0..1, fixed per index, so the layout is the same on every visit.
const rand = (i: number, k: number) => {
  const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// stretch scales height only (1 = as modelled); dark 0..1 blends the rock toward the project-wall tint.
// at = arc distance along the path it belongs to, for drawing only what is near the camera.
type Placement = { piece: Piece; at: number; position: [number, number, number]; yaw: number; scale: number; stretch?: number; dark?: number };

// Lay rock pieces along both edges of the path up to the cliff edge (front row + back row), plus loose rocks at
// the wall bases. Along the slope the rows sink with its floor.
function layoutCanyon(): Placement[] {
  const out: Placement[] = [];
  let i = 0;
  for (let s = 0; s < LIP_S - 1; s += PIECE_SPACING, i++) {
    const { point, forward, left } = frameAt(s);
    const yaw = Math.atan2(-forward.x, -forward.z); // turns local -z to the path direction
    for (const side of [-1, 1]) {
      const out1 = side === -1 ? left : left.clone().negate(); // away from the path, on this side
      const panel = panelAmount(s, side);
      const base = WALL_OFFSET - PANEL_STEP_IN * panel;
      const turn = side === -1 ? yaw : yaw + Math.PI;
      const jitter = (rand(i * 2 + side, 1) - 0.5) * 0.8;
      const front = point.clone().addScaledVector(out1, base + jitter);
      out.push({
        piece: panel > 0.4 ? (i % 2 ? "wide" : "tall1") : WALL_PIECES[(i * 3 + (side === 1 ? 5 : 0)) % WALL_PIECES.length],
        at: s,
        position: [front.x, floorAt(s) - 0.15, front.z], // along the slope the walls step down with the floor
        yaw: turn + (rand(i, side + 3) - 0.5) * 0.18 * (1 - panel), // project walls stand flatter
        scale: 0.9 + rand(i, side + 5) * 0.25 + 0.15 * panel,
        stretch: 1 + PANEL_GROW * panel,
        dark: panel,
      });
      const back = point.clone().addScaledVector(out1, base + BACK_OFFSET + rand(i, side + 7));
      out.push({
        piece: WALL_PIECES[(i * 5 + 2) % WALL_PIECES.length],
        at: s,
        position: [back.x, floorAt(s) - 0.3, back.z],
        yaw: turn + (rand(i, side + 9) - 0.5) * 0.25,
        scale: 1.12 + rand(i, side + 11) * 0.2,
        stretch: 1 + PANEL_GROW * panel,
        dark: panel,
      });
      if (panel < 0.3 && s < CHASM_S - 3 && rand(i, side + 13) < 0.45) {
        const rock = point.clone().addScaledVector(out1, base - 2.4 - rand(i, side + 15) * 0.8);
        out.push({
          piece: rand(i, side + 17) < 0.5 ? "rocksLow" : "rocksSmall",
          at: s,
          position: [rock.x, -0.1, rock.z],
          yaw: rand(i, side + 19) * Math.PI * 2,
          scale: 0.8 + rand(i, side + 21) * 0.4,
        });
      }
    }
  }
  return out;
}

// Rock in the trench (columns at the foot of each cliff, loose rocks on the slope), and broken rocks along the
// cliff edge on both sides of it.
function layoutTrench(): Placement[] {
  const out: Placement[] = [];
  let i = 0;
  for (let s = CHASM_S + 2; s < LIP_S - 2; s += PIECE_SPACING, i++) {
    const { point, forward, left } = frameAt(s);
    const yaw = Math.atan2(-forward.x, -forward.z);
    const depth = -floorAt(s);
    const foot = Math.min(floorAt(s - 4), -depth, floorAt(s + 4)) - 0.3; // lowest floor under the piece, so it never floats on the slope
    for (const side of [-1, 1]) {
      const outward = side === -1 ? left : left.clone().negate();
      const turn = side === -1 ? yaw : yaw + Math.PI;
      if (depth > 1.5) {
        const p = point.clone().addScaledVector(outward, CHASM_HALF + flare(foot) + 1.3 + rand(i, side + 80) * 0.8);
        out.push({
          piece: WALL_PIECES[(i * 3 + (side === 1 ? 4 : 1)) % WALL_PIECES.length],
          at: s,
          position: [p.x, foot, p.z],
          yaw: turn + (rand(i, side + 81) - 0.5) * 0.3,
          scale: 0.9 + rand(i, side + 82) * 0.35,
          stretch: 1 + rand(i, side + 83) * 0.6,
        });
      }
      if (rand(i, side + 90) < 0.5) {
        const p = point.clone().addScaledVector(outward, CHASM_HALF + flare(-depth) - 1.4 - rand(i, side + 91) * 1.2);
        out.push({
          piece: rand(i, side + 92) < 0.5 ? "rocksLow" : "rocksSmall",
          at: s,
          position: [p.x, -depth - 0.1, p.z],
          yaw: rand(i, side + 93) * Math.PI * 2,
          scale: 0.8 + rand(i, side + 94) * 0.5,
        });
      }
    }
  }

  for (let k = 0; k < 4; k++) {
    const p = edgePoint((k - 1.5) * 2.3 + (rand(k, 60) - 0.5), -0.8, LIP_Y - 0.1);
    out.push({
      piece: k % 2 ? "rocksSmall" : "rocksLow",
      at: LIP_S,
      position: [p.x, p.y, p.z],
      yaw: rand(k, 62) * Math.PI * 2,
      scale: 0.7 + rand(k, 63) * 0.5,
    });
  }
  for (let k = 0; k < 16; k++) {
    const a = (k % 2 ? 1 : -1) * (CHASM_HALF + 4 + Math.floor(k / 2) * 4.5 + rand(k, 66) * 2);
    const p = edgePoint(a, -1 - rand(k, 67) * 1.5, -0.1);
    out.push({
      piece: rand(k, 68) < 0.5 ? "rocksLow" : "rocksSmall",
      at: LIP_S,
      position: [p.x, p.y, p.z],
      yaw: rand(k, 69) * Math.PI * 2,
      scale: 0.8 + rand(k, 70) * 0.6,
    });
  }
  return out;
}

// Rock columns standing out of the cliff face all the way down, so the descent streams past rock. Placed by
// their top, which stays below the edge. Deeper rock is darker.
function layoutCliff(): Placement[] {
  const out: Placement[] = [];
  const yaw = Math.atan2(-EDGE.forward.z, EDGE.forward.x); // inner face (local +X) out over the water
  let i = 0;
  for (let top = -3; top > -CLIFF_DEPTH + 12; top -= 6, i++) {
    let k = 0;
    for (let a = -40 + rand(i, 100) * 4; a < 40; a += 4 + rand(i, k + 101) * 4, k++) {
      if (top > LIP_Y - 2 && Math.abs(a) < CHASM_HALF + 2) continue; // keep the trench mouth clear
      if (rand(i * 31 + k, 102) < 0.35) continue;
      const scale = 0.8 + rand(i * 31 + k, 103) * 0.5;
      const stretch = 0.8 + rand(i * 31 + k, 104) * 0.9;
      const p = edgePoint(a, cliffJut(a, top - 5) - 1.4, top - rand(i * 31 + k, 105) * 2 - PIECE_H * scale * stretch);
      out.push({
        piece: WALL_PIECES[(i * 3 + k) % WALL_PIECES.length],
        at: LIP_S,
        position: [p.x, p.y, p.z],
        yaw: yaw + (rand(i * 31 + k, 106) - 0.5) * 0.3,
        scale,
        stretch,
        dark: Math.min(1, -top / 45),
      });
    }
  }
  return out;
}

// One trench cliff (side -1 = left, 1 = right) along the path distances `along`, from the rim (y 0) down to
// just under the floor, jutting out toward the path.
function makeTrenchCliff(side: number, along: number[]) {
  const seed = side === -1 ? 1 : 2;
  const rows = 8;
  const pos = new Float32Array(along.length * (rows + 1) * 3);
  const colors = new Float32Array(along.length * (rows + 1) * 3);
  along.forEach((s, i) => {
    const { point, left } = frameAt(s);
    const outward = side === -1 ? left : left.clone().negate();
    for (let j = 0; j <= rows; j++) {
      const y = ((floorAt(s) - 1.5) * j) / rows;
      const off = CHASM_HALF + flare(y) - relief(s, y, seed) * Math.min(1, -y / 2); // flush with the rim at the top
      const k = (i * (rows + 1) + j) * 3;
      pos.set([point.x + outward.x * off, y, point.z + outward.z * off], k);
      colors.fill(rockShade(s, y, seed), k, k + 3);
    }
  });
  const index: number[] = [];
  for (let i = 0; i < along.length - 1; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j;
      const b = a + rows + 1; // next along the path
      // wound so the face points into the trench
      if (side === -1) index.push(a, a + 1, b, b, a + 1, b + 1);
      else index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

// The cliff face: from the edge (canyon floor height, or the trench floor where the trench comes out) straight
// down, facing out over the water, darker the deeper it is.
function makeCliffFace() {
  const cols: { a: number; top: number }[] = [];
  for (let a = -CLIFF_HALF; a < -CHASM_HALF; a += 2.5) cols.push({ a, top: 0 });
  cols.push({ a: -CHASM_HALF, top: 0 }, { a: -CHASM_HALF, top: LIP_Y });
  for (let a = -CHASM_HALF + 1.5; a < CHASM_HALF; a += 1.5) cols.push({ a, top: LIP_Y });
  cols.push({ a: CHASM_HALF, top: LIP_Y }, { a: CHASM_HALF, top: 0 });
  for (let a = CHASM_HALF + 2.5; a <= CLIFF_HALF; a += 2.5) cols.push({ a, top: 0 });

  const rows = 125;
  const pos = new Float32Array(cols.length * (rows + 1) * 3);
  const colors = new Float32Array(cols.length * (rows + 1) * 3);
  cols.forEach(({ a, top }, i) => {
    for (let j = 0; j <= rows; j++) {
      const y = top + ((-CLIFF_DEPTH - top) * j) / rows;
      const p = edgePoint(a, cliffJut(a, y) * Math.min(1, (top - y) / 2), y); // flush with the floor at the edge
      const k = (i * (rows + 1) + j) * 3;
      pos.set([p.x, p.y, p.z], k);
      colors.fill(rockShade(a, y, 5), k, k + 3);
    }
  });
  const index: number[] = [];
  for (let i = 0; i < cols.length - 1; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j;
      const b = a + rows + 1; // next along the cliff
      index.push(a, a + 1, b, b, a + 1, b + 1); // facing out over the water
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

// The trench floor: a strip of sand along the slope at floorAt height, reaching under both trench cliffs.
function makeTrenchFloor() {
  const ACROSS = 6;
  const cols = TRENCH.length;
  const pos = new Float32Array(cols * (ACROSS + 1) * 3);
  const uv = new Float32Array(cols * (ACROSS + 1) * 2);
  TRENCH.forEach((s, i) => {
    const { point, left } = frameAt(s);
    const h = floorAt(s);
    const half = CHASM_HALF + flare(h) + 1.5;
    for (let k = 0; k <= ACROSS; k++) {
      const off = -half + (2 * half * k) / ACROSS;
      const x = point.x + left.x * off;
      const z = point.z + left.z * off;
      const n = i * (ACROSS + 1) + k;
      const lump = k === 0 || k === ACROSS || i === cols - 1 ? 0 : (rand(n, 30) - 0.5) * 0.3; // the edge stays flush with the cliff
      pos.set([x, h + lump, z], n * 3);
      uv.set([x, -z], n * 2); // world units, like the canyon floor
    }
  });
  const index: number[] = [];
  for (let i = 0; i < cols - 1; i++) {
    for (let k = 0; k < ACROSS; k++) {
      const a = i * (ACROSS + 1) + k;
      const b = a + ACROSS + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1); // facing up
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

// The trench (floor and cliffs) and the cliff face. lit 0..1 dims the sand's glow.
function Cliff({ lit }: { lit: number }) {
  const { floor, walls, rock, map } = useMemo(
    () => ({
      floor: makeTrenchFloor(),
      walls: [makeTrenchCliff(-1, TRENCH), makeTrenchCliff(1, TRENCH), makeCliffFace()],
      // both sides, so the trench mouth has no see-through gaps from out over the water
      rock: new THREE.MeshStandardMaterial({ color: ROCK_TINT, roughness: 0.95, vertexColors: true, side: THREE.DoubleSide }),
      map: sandTexture(),
    }),
    [],
  );

  return (
    <>
      <mesh geometry={floor} receiveShadow>
        <meshStandardMaterial map={map} color={SAND} emissive={SAND} emissiveIntensity={0.28 * lit} roughness={1} />
      </mesh>
      {walls.map((g, i) => (
        <mesh key={i} geometry={g} material={rock} receiveShadow />
      ))}
    </>
  );
}

// Specks hanging over the trench floor and in the open water in front of the cliff; the camera drifts and
// sinks past them.
function DriftSnow() {
  const { geometry, material } = useMemo(() => {
    const TRENCH_N = 500;
    const n = TRENCH_N + 1400;
    const pts = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      if (i < TRENCH_N) {
        const s = CHASM_S + rand(i, 70) * (LIP_S - CHASM_S);
        const { point, left } = frameAt(s);
        const h = floorAt(s);
        let off = (rand(i, 71) * 2 - 1) * (CHASM_HALF - 0.6);
        if (Math.abs(off) < 0.8) off += Math.sign(off || 1) * 0.8; // keep clear of the camera's line
        pts.set([point.x + left.x * off, h + 0.3 + rand(i, 72) ** 2 * (4 - h), point.z + left.z * off], i * 3);
        continue;
      }
      const p = edgePoint((rand(i, 73) * 2 - 1) * 24, 3 + rand(i, 74) * 26, 4 - rand(i, 75) * (CLIFF_DEPTH - 10));
      pts.set([p.x, p.y, p.z], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pts, 3));

    const dot = document.createElement("canvas");
    dot.width = dot.height = 32;
    const g = dot.getContext("2d")!;
    const glow = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, 32, 32);
    const material = new THREE.PointsMaterial({
      size: 0.1,
      map: new THREE.CanvasTexture(dot),
      color: "#cfe8ff",
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    return { geometry, material };
  }, []);

  return <points geometry={geometry} material={material} />;
}

// Tileable sand: ripple lines plus grain, so the floor visibly streams past as the camera moves.
// Every wave has a whole number of cycles across the tile and rows divide its height, so it repeats without seams.
function makeSandTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, size, size);

  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const rows = 16;
  for (let r = 0; r < rows; r++) {
    const y0 = (r + 0.5) * (size / rows);
    const cycles = 2 + (r % 3);
    const phase = rnd() * Math.PI * 2;
    const amp = 4 + rnd() * 4;
    const line = (dy: number) => {
      g.beginPath();
      for (let x = 0; x <= size; x += 4) {
        const y = y0 + dy + Math.sin((x / size) * Math.PI * 2 * cycles + phase) * amp;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    };
    g.lineWidth = 6;
    g.strokeStyle = "rgba(150, 118, 66, 0.22)";
    line(6);
    g.lineWidth = 3;
    g.strokeStyle = "rgba(255, 250, 232, 0.75)";
    line(0);
  }
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rnd() < 0.5 ? "rgba(140,110,60,0.18)" : "rgba(255,252,240,0.35)";
    g.fillRect(rnd() * size, rnd() * size, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(55 / 400, 55 / 400); // UVs are in world units; one tile every ~7 units
  tex.anisotropy = 8;
  return tex;
}

// One sand texture shared by the canyon floor and the trench floor.
let sand: THREE.CanvasTexture | null = null;
const sandTexture = () => (sand ??= makeSandTexture());

// Rippled sand floor the canyon stands on: it ends at the cliff edge, with the trench cut into it. lit 0..1 dims its glow.
function Ground({ lit }: { lit: number }) {
  const { geometry, map } = useMemo(() => {
    // Drawn in (x, -z), then laid flat; UVs are in world units.
    const flat = (p: THREE.Vector3) => new THREE.Vector2(p.x, -p.z);
    const rim = (side: number) =>
      TRENCH.map((s) => {
        const { point, left } = frameAt(s);
        return flat(point.addScaledVector(left, -side * CHASM_HALF));
      });
    const BACK = -340; // well behind the canyon entrance
    const floor = new THREE.Shape([
      flat(edgePoint(CLIFF_HALF, BACK, 0)),
      flat(edgePoint(CLIFF_HALF, 0, 0)),
      ...rim(-1).reverse(),
      ...rim(1),
      flat(edgePoint(-CLIFF_HALF, 0, 0)),
      flat(edgePoint(-CLIFF_HALF, BACK, 0)),
    ]);
    return { geometry: new THREE.ShapeGeometry(floor), map: sandTexture() };
  }, []);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial map={map} color={SAND} emissive={SAND} emissiveIntensity={0.28 * lit} roughness={1} />
    </mesh>
  );
}

const DRAW_BEHIND = 15; // path units behind the camera still drawn (its sides can be in view)
const DRAW_AHEAD = 85; // beyond this the fog has all but hidden the rock
const CLIFF_DRAW_BELOW = 45; // cliff rock drawn this far below the camera
const CLIFF_DRAW_ABOVE = 14;

// Only the rock near the camera is drawn: by path distance (from DRAW_BEHIND behind to `ahead` in front, less
// in thicker fog) and, on the cliff, by height. Both step in chunks so the list doesn't change every frame.
function Rocks({ s, y, ahead }: { s: number; y: number; ahead: number }) {
  const gltfs = useGLTF(PIECE_KEYS.map((k) => PIECES[k]));
  const invalidate = useThree((s) => s.invalidate);

  // One geometry per piece, and a few materials from the normal rock tint to the dark project-wall tint;
  // every placement reuses them.
  const { geometries, materials } = useMemo(() => {
    const materials = Array.from({ length: 6 }, (_, k) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(ROCK_TINT).lerp(new THREE.Color(PANEL_TINT), k / 5),
        roughness: 0.95,
        vertexColors: true,
      }),
    );
    const geometries = {} as Record<Piece, THREE.BufferGeometry>;
    PIECE_KEYS.forEach((k, i) => {
      gltfs[i].scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && !geometries[k]) geometries[k] = mesh.geometry;
      });
    });
    return { geometries, materials };
  }, [gltfs]);

  const top = useMemo(() => [...layoutCanyon(), ...layoutTrench()], []);
  const cliff = useMemo(layoutCliff, []);
  const near = Math.floor(s / 8) * 8;
  const reach = Math.ceil(ahead / 8) * 8;
  const level = Math.floor(y / 8) * 8;
  const onTop = y > -22; // well down the cliff the rock up top is out of sight
  const nearEdge = near + reach + 8 > LIP_S;
  const visible = useMemo(
    () => [
      ...(onTop ? top : [])
        .map((p, i) => ({ p, key: `c${i}` }))
        .filter(({ p }) => p.at > near - DRAW_BEHIND && p.at < near + reach + 8),
      ...(nearEdge ? cliff : [])
        .map((p, i) => ({ p, key: `f${i}` }))
        .filter(({ p }) => p.position[1] > level - CLIFF_DRAW_BELOW && p.position[1] < level + CLIFF_DRAW_ABOVE + 8),
    ],
    [top, cliff, near, reach, level, onTop, nearEdge],
  );
  useEffect(() => invalidate(), [invalidate]);

  return (
    <>
      {visible.map(({ p, key }) => (
        <mesh
          key={key}
          geometry={geometries[p.piece]}
          material={materials[Math.round((p.dark ?? 0) * 5)]}
          position={p.position}
          rotation={[0, p.yaw, 0]}
          scale={[p.scale, p.scale * (p.stretch ?? 1), p.scale]}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

const LOOK_AHEAD = 7; // how far along the path the camera looks, so it turns into bends smoothly
const SLOPE_LOOK_DOWN = 1.6; // extra drop on the slope, over 9 units ahead (about 10 degrees)
const OUT = 8; // how far past the edge the camera swims out before sinking
const DRIFT = 3; // how much further out it drifts while sinking
const FALL_TO = -150; // camera height at the bottom of the descent
const SINK_MORE = 30; // how much further it sinks through the deep zones
const EDGE_LOOK = THREE.MathUtils.degToRad(-38); // looking down as it walks up to the edge, so the floor is seen ending
const TURN = THREE.MathUtils.degToRad(-110); // turns right at the edge, so the cliff is on the right of the screen
const SINK_PITCH = THREE.MathUtils.degToRad(-28); // looking down along the cliff while sinking
const ABYSS_BLUE = "#0d3f78"; // water color looking out over the deep
const ABYSS_DARK = "#020a16"; // water color at the bottom of the descent
const UP = new THREE.Vector3(0, 1, 0);

// Blend two #rrggbb colors as the screen shows them, so the CSS backdrop and the fog match.
const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
};

// Floor height under the camera; out over the water it keeps the edge's height.
const groundAt = (s: number) => floorAt(Math.min(s, LIP_S));

// Where the camera is and looks: walking the canyon path (travel), then (descent) down the slope to the cliff
// edge, swimming out over the water and diving a little way down, then turning toward the cliff as it dives on
// down beside it. blue 0..1 = how far the water has turned deep blue, depth 0..1 = how far it has sunk.
function cameraPose(travel: number, descent: number) {
  const walk = clamp01(descent / 0.35);
  const stop = (walk - Math.max(0, walk - 0.8) ** 2 / 0.4) / 0.9; // even pace, easing to a stop at the edge
  const peer = smooth(span(descent, 0.18, 0.34));
  const out = smooth(span(descent, 0.33, 0.5));
  const fall = smooth(span(descent, 0.36, 1));
  const turn = smooth(span(descent, 0.45, 0.72)); // starts once it has dived a little
  const s = pathS(travel) + (LIP_S - 1 - pathS(1)) * stop;
  const here = frameAt(s).point;
  const ahead = frameAt(s + LOOK_AHEAD).point;
  const heading = new THREE.Vector3(ahead.x - here.x, 0, ahead.z - here.z).normalize().applyAxisAngle(UP, TURN * turn);
  here.addScaledVector(EDGE.forward, OUT * out + DRIFT * fall);
  // Walking, it pitches with the floor a stretch ahead (and down a little on the slope); at the edge it looks down.
  const g = groundAt(s);
  const lookFloor = (groundAt(s + 5) + groundAt(s + 9) + groundAt(s + 13)) / 3;
  const down = SLOPE_LOOK_DOWN * smooth(clamp01((s - CHASM_S + 12) / 16));
  const walking = Math.atan2(lookFloor - g - down, 9) * (1 - peer) + EDGE_LOOK * peer;
  const pitch = walking * (1 - turn) + SINK_PITCH * turn;
  const eye = g + EYE_Y;
  return {
    s,
    position: new THREE.Vector3(here.x, eye + (FALL_TO - eye) * fall, here.z),
    dir: heading.multiplyScalar(Math.cos(pitch)).setY(Math.sin(pitch)),
    horizon: HORIZON + (0.5 - HORIZON) * peer, // lens shift fades out once looking down
    blue: Math.max(0.35 * clamp01(-g / 6), peer * 0.5, out),
    depth: fall,
  };
}

// Places the camera. A lens shift (setViewOffset) moves the horizon down to HORIZON without tilting the
// camera, so the rock stands upright while walking. The sun follows so shadows stay in range; past the edge it
// swings out over the water to light the cliff face.
function Rig({ pose, light }: { pose: ReturnType<typeof cameraPose>; light: React.RefObject<THREE.DirectionalLight | null> }) {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const { position, dir } = pose;
    const look = position.clone().addScaledVector(dir, LOOK_AHEAD);
    cam.setViewOffset(size.width, size.height * 2 * pose.horizon, 0, 0, size.width, size.height);
    cam.position.copy(position);
    cam.lookAt(look);
    cam.updateProjectionMatrix();

    const sun = light.current;
    if (sun) {
      const behind = 18 - 40 * pose.blue; // + = from the canyon side, - = from out over the water
      sun.position.set(position.x + 10, position.y + 26 - EYE_Y, position.z).addScaledVector(EDGE.forward, -behind);
      sun.target.position.set(look.x, look.y - EYE_Y, look.z);
      sun.target.updateMatrixWorld();
    }
    invalidate();
  }, [camera, size, pose, light, invalidate]);

  return null;
}

// Shown at the canyon entrance once the silt has covered the screen (it is mounted hidden beforehand
// so its setup is done). travel 0 -> 1 walks the winding path; descent 0 -> 1 goes down the slope after it,
// out past the cliff edge and down along the cliff.
// sink 0 -> 1: keeps sinking slowly beside the cliff through the deep zones after it.
export default function Canyon({ visible, travel, descent = 0, sink = 0 }: { visible: boolean; travel: number; descent?: number; sink?: number }) {
  const pose = cameraPose(travel, descent);
  pose.position.y -= SINK_MORE * sink;
  const sun = useRef<THREE.DirectionalLight>(null);

  // The water turns deep blue as the camera looks out over the deep and dark as it sinks; the fog closes in with it.
  const water = mixHex(mixHex(WATER, ABYSS_BLUE, pose.blue), ABYSS_DARK, pose.depth);
  const fogFar = 110 - 40 * pose.blue - 30 * pose.depth;
  const lit = 1 - 0.7 * pose.depth;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 4, // over the water, under the bubbles and section text
        visibility: visible ? "visible" : "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Backdrop the color of the fog, so the open water matches the rock fading into it. */}
      <div style={{ position: "absolute", inset: 0, background: water, opacity: smooth(clamp01(pose.blue / 0.15)) }} />
      <Canvas
        shadows="percentage" // PCF; three no longer has the soft variant r3f uses by default
        flat // no tone mapping, so the fog color comes out exactly as WATER and matches the water behind
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
        frameloop="demand" // only redraws when the camera moves
        camera={{ fov: 62, near: 0.3, far: 220 }}
        style={{ background: "transparent" }}
      >
        <fog attach="fog" args={[WATER, 14, 110]} color={water} near={14 - 8 * pose.blue - 4 * pose.depth} far={fogFar} />
        <hemisphereLight args={["#d6ecff", "#d8bf8a", 0.9]} intensity={0.9 * lit} />
        <ambientLight intensity={0.25 * lit} color="#a8d0f0" />
        <directionalLight
          ref={sun}
          intensity={1.9 * lit}
          color="#f2f8ff"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-35}
          shadow-camera-right={35}
          shadow-camera-top={35}
          shadow-camera-bottom={-35}
          shadow-camera-near={1}
          shadow-camera-far={110}
          shadow-bias={-0.0005}
          shadow-normalBias={0.03}
        />
        <Ground lit={lit} />
        <Cliff lit={lit} />
        <DriftSnow />
        <Suspense fallback={null}>
          <Rocks s={pose.s} y={pose.position.y} ahead={Math.min(DRAW_AHEAD, fogFar)} />
        </Suspense>
        <Rig pose={pose} light={sun} />
      </Canvas>
    </div>
  );
}

Object.values(PIECES).forEach((url) => useGLTF.preload(url));
