// Small shared helpers for the scroll-driven animation maths.

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Smoothstep on 0..1 (input clamped first): eases in and out, flat at both ends.
export const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
