/**
 * (LR16-1 fix round) The shader's `nsGrid2` (`src/world/bakedLamps.ts` `NS_GRID2_GLSL`) written out in JS, statement for
 * statement, over the RGBA fill texture's bytes as WebGL2 hands them to it: R through one LINEAR / CLAMP_TO_EDGE tap (1
 * outside the grid), G / B / A through `texelFetch` (normalised bytes). The tests hold the light field's
 * `BounceGrid.sampleInto` against it, so the meter, the guards and the picture read one bounce.
 */
import { BOUNCE_T_SHIFT, BOUNCE_T_STEP } from '../../src/voxel/lampBounce';

/** `nsGrid2(t, p, o, n)`: [ambient, bounce]. `rgba`: the texels (x fastest), `o`: origin + cell, `n`: counts. */
export function nsGrid2(rgba: Uint8Array, p: readonly number[], o: readonly number[], n: readonly number[]): [number, number] {
  const cell = o[3]!;
  // vec3 q = (p - o.xyz) / (o.w * n.xyz); float amb = outside ? 1.0 : texture(t, clamp(q, 0.0, 1.0)).r;
  const q = [0, 1, 2].map((k) => (p[k]! - o[k]!) / (cell * n[k]!));
  let amb: number;
  if (q.some((v) => v < 0 || v > 1)) amb = 1;
  else {
    // GL LINEAR + CLAMP_TO_EDGE at the clamped coordinate: u = q x n - 0.5, the edge texels repeated
    const u = q.map((v, k) => Math.min(1, Math.max(0, v)) * n[k]! - 0.5);
    const lo = u.map((v) => Math.floor(v));
    const fr = u.map((v, k) => v - lo[k]!);
    let s = 0;
    for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = [dx, dy, dz].map((d, k) => Math.min(n[k]! - 1, Math.max(0, lo[k]! + d)));
      const w = (dx ? fr[0]! : 1 - fr[0]!) * (dy ? fr[1]! : 1 - fr[1]!) * (dz ? fr[2]! : 1 - fr[2]!);
      s += w * rgba[(i[0]! + n[0]! * (i[1]! + n[1]! * i[2]!)) * 4]!;
    }
    amb = s / 255;
  }
  // vec3 u = clamp((p - o.xyz) / o.w - 0.5, vec3(0.0), n.xyz - 1.0); b = floor(u); f = u - b; i0, i1
  const u = [0, 1, 2].map((k) => Math.min(n[k]! - 1, Math.max(0, (p[k]! - o[k]!) / cell - 0.5)));
  const b = u.map((v) => Math.floor(v));
  const f = u.map((v, k) => v - b[k]!);
  const i0 = b;
  const i1 = b.map((v, k) => Math.min(v + 1, n[k]! - 1));
  const v: number[] = [];
  const e: number[] = [];
  const c: boolean[] = [];
  let lit = 0;
  let walls = 0;
  for (let k = 0; k < 8; k++) {
    const x = k & 1 ? i1[0]! : i0[0]!;
    const y = k & 2 ? i1[1]! : i0[1]!;
    const z = k & 4 ? i1[2]! : i0[2]!;
    const t = (x + n[0]! * (y + n[1]! * z)) * 4;
    v[k] = rgba[t + 1]! / 255;
    e[k] = Math.floor((rgba[t + 2]! / 255) * 255 + 0.5) + Math.floor((rgba[t + 3]! / 255) * 255 + 0.5) * 256;
    lit += v[k]!;
    walls |= e[k]!;
  }
  if (lit <= 0) return [amb, 0];
  // ivec3 hb = ivec3(step(vec3(0.5), f)); h; eh; d = abs(f - vec3(hb)); the codes; the crossings
  const hb = f.map((x) => (x >= 0.5 ? 1 : 0));
  let h = hb[0]! + hb[1]! * 2 + hb[2]! * 4;
  const eh = e[h]!;
  const d = f.map((x, k) => Math.abs(x - hb[k]!));
  const tx = (eh >> (hb[0] === 1 ? BOUNCE_T_SHIFT[1] : BOUNCE_T_SHIFT[0])) & 3;
  const ty = (eh >> (hb[1] === 1 ? BOUNCE_T_SHIFT[3] : BOUNCE_T_SHIFT[2])) & 3;
  const tz = (eh >> (hb[2] === 1 ? BOUNCE_T_SHIFT[5] : BOUNCE_T_SHIFT[4])) & 3;
  if (tx > 0 && d[0]! >= tx * BOUNCE_T_STEP) h ^= 1;
  if (ty > 0 && d[1]! >= ty * BOUNCE_T_STEP) h ^= 2;
  if (tz > 0 && d[2]! >= tz * BOUNCE_T_STEP) h ^= 4;
  const open = (walls & 7) === 0;
  for (let k = 0; k < 8; k++) c[k] = k === h || open;
  if (!open) {
    for (let r = 0; r < 7; r++) {
      for (let k = 0; k < 8; k++) {
        if ((k & 1) === 0 && (e[k]! & 1) === 0 && c[k] !== c[k + 1]) c[k] = c[k + 1] = true;
        if ((k & 2) === 0 && (e[k]! & 2) === 0 && c[k] !== c[k + 2]) c[k] = c[k + 2] = true;
        if ((k & 4) === 0 && (e[k]! & 4) === 0 && c[k] !== c[k + 4]) c[k] = c[k + 4] = true;
      }
    }
  }
  let sw = 0;
  let sv = 0;
  for (let k = 0; k < 8; k++) {
    if (!c[k]) continue;
    const w = (k & 1 ? f[0]! : 1 - f[0]!) * (k & 2 ? f[1]! : 1 - f[1]!) * (k & 4 ? f[2]! : 1 - f[2]!);
    sw += w;
    sv += w * v[k]!;
  }
  return [amb, sw > 0 ? sv / sw : v[h]!];
}
