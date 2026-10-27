// Shared canyon layout numbers, kept free of three.js so the page can use them without loading the 3D scene.

import { smooth } from "../../lib/math";

// The winding path as a program of straight runs and turns (turn in degrees, + = left), walked from the
// entrance heading into the screen (-z). Bends alternate, and each marked one carries a project on the
// wall on its outside: a left bend puts it on the right of the screen, a right bend on the left.
const PROGRAM = [
  { len: 18, turn: 0 },
  { len: 24, turn: 55, project: true },
  { len: 10, turn: 0 },
  { len: 28, turn: -110, project: true },
  { len: 10, turn: 0 },
  { len: 28, turn: 110, project: true },
  { len: 10, turn: 0 },
  { len: 28, turn: -110, project: true },
  { len: 10, turn: 0 },
  { len: 22, turn: 55 }, // back to heading straight in
  { len: 14, turn: 0 }, // to the top of the slope down
  { len: 16, turn: 20 }, // the slope, winding a little
  { len: 16, turn: -20 },
  { len: 52, turn: 0 }, // out over the open water past the cliff edge
];
const START = { x: 0, z: 26 };
const STEP = 2; // spacing of the generated path points

// Path points on the floor (x, z), about STEP apart, so arc length matches the program's lengths.
export const PATH_POINTS: [number, number][] = (() => {
  const pts: [number, number][] = [[START.x, START.z]];
  let { x, z } = START;
  let heading = 0; // radians, + = turned left; 0 faces -z
  for (const { len, turn } of PROGRAM) {
    const n = Math.max(1, Math.ceil(len / STEP));
    const dA = ((turn * Math.PI) / 180) / n;
    for (let k = 0; k < n; k++) {
      const mid = heading + dA / 2;
      x -= Math.sin(mid) * (len / n);
      z -= Math.cos(mid) * (len / n);
      heading += dA;
      pts.push([x, z]);
    }
  }
  return pts;
})();

// Project walls: on the outside of a bend the rock wall closes in, grows tall and turns dark, so it fills
// that side of the screen as a dark band the project is shown on. at = arc distance along the path (the
// end of the bend, where that wall is straight ahead), side 1 = right, -1 = left, width = how long the
// stretch of dark wall is. One per project, in order.
export const CLEARINGS = (() => {
  const out: { at: number; side: number; width: number }[] = [];
  let s = 0;
  for (const seg of PROGRAM) {
    s += seg.len;
    if (seg.project) out.push({ at: s - 2, side: seg.turn > 0 ? 1 : -1, width: 13 });
  }
  return out;
})();

const START_S = 3; // standing in the entrance
const END_S = CLEARINGS[CLEARINGS.length - 1].at + 18; // a little past the last project
export const pathS = (travel: number) => START_S + (END_S - START_S) * travel;

// Smoothstep of x across min..max.
const smoothstep = (x: number, min: number, max: number) => smooth((x - min) / (max - min));

// How much project wall i is in view at path position s: rises as the bend brings it across the screen,
// holds while you round it, falls once it's behind you.
export function clearingFocus(i: number, s: number) {
  const ahead = CLEARINGS[i].at - s;
  return Math.min(1 - smoothstep(ahead, 12, 20), smoothstep(ahead, -4, 2));
}

// After the projects the floor slopes a little way down from CHASM_S, then ends at the edge (LIP_S) of a sheer
// cliff with open deep water beyond.
export const CHASM_S = 202;
const SLOPE_END_S = 232;
const SLOPE_DROP = 6; // how far below the canyon floor (y 0) the slope goes
export const LIP_S = 238;

// Floor height at path distance s along the slope; it stays at the bottom height on to the edge.
export const floorAt = (s: number) => -SLOPE_DROP * smoothstep(s, CHASM_S, SLOPE_END_S);
