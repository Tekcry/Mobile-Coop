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
  // (LR16-P F3) the 8 fetches s0..s7 (k = x + 2y + 4z); va = vec4(s0.g .. s3.g), vb = vec4(s4.g .. s7.g); ea / eb the
  // wall bits, int(b * 255.0 + 0.5) + int(a * 255.0 + 0.5) * 256 per lane
  const s: number[][] = [];
  for (let k = 0; k < 8; k++) {
    const x = k & 1 ? i1[0]! : i0[0]!;
    const y = k & 2 ? i1[1]! : i0[1]!;
    const z = k & 4 ? i1[2]! : i0[2]!;
    const t = (x + n[0]! * (y + n[1]! * z)) * 4;
    s.push([rgba[t]! / 255, rgba[t + 1]! / 255, rgba[t + 2]! / 255, rgba[t + 3]! / 255]);
  }
  const va = [0, 1, 2, 3].map((k) => s[k]![1]!);
  const vb = [4, 5, 6, 7].map((k) => s[k]![1]!);
  // if (va + vb == vec4(0.0)) return vec2(amb, 0.0);
  if (va.every((x, k) => x + vb[k]! === 0)) return [amb, 0];
  const bits = (k: number): number => Math.trunc(s[k]![2]! * 255 + 0.5) + Math.trunc(s[k]![3]! * 255 + 0.5) * 256;
  const ea = [0, 1, 2, 3].map(bits);
  const eb = [4, 5, 6, 7].map(bits);
  // ivec3 hb = ivec3(step(vec3(0.5), f)); h; eh from ea / eb by hb.z and hb.x + 2 hb.y; d = abs(f - vec3(hb)); the codes
  const hb = f.map((x) => (x >= 0.5 ? 1 : 0));
  let h = hb[0]! + hb[1]! * 2 + hb[2]! * 4;
  const eq = hb[2] === 1 ? eb : ea;
  const hq = hb[0]! + hb[1]! * 2;
  const eh = eq[hq]!;
  const d = f.map((x, k) => Math.abs(x - hb[k]!));
  const tx = (eh >> (hb[0] === 1 ? BOUNCE_T_SHIFT[1] : BOUNCE_T_SHIFT[0])) & 3;
  const ty = (eh >> (hb[1] === 1 ? BOUNCE_T_SHIFT[3] : BOUNCE_T_SHIFT[2])) & 3;
  const tz = (eh >> (hb[2] === 1 ? BOUNCE_T_SHIFT[5] : BOUNCE_T_SHIFT[4])) & 3;
  if (tx > 0 && d[0]! >= tx * BOUNCE_T_STEP) h ^= 1;
  if (ty > 0 && d[1]! >= ty * BOUNCE_T_STEP) h ^= 2;
  if (tz > 0 && d[2]! >= tz * BOUNCE_T_STEP) h ^= 4;
  // the reach set as an 8-bit mask: all 8 when no corner knows a wall, else grown from h along the open edges
  const wo = ea.map((x, k) => x | eb[k]!);
  let c = ((wo[0]! | wo[1]! | wo[2]! | wo[3]!) & 7) === 0 ? 255 : 1 << h;
  if (c !== 255) {
    const open = (e: number[], bit: number): number[] => e.map((x) => ((x & bit) === 0 ? 1 : 0));
    const xa = open(ea, 1);
    const xb = open(eb, 1);
    const ya = open(ea, 2);
    const yb = open(eb, 2);
    const za = open(ea, 4);
    const mx = xa[0]! | (xa[2]! << 2) | (xb[0]! << 4) | (xb[2]! << 6);
    const my = ya[0]! | (ya[1]! << 1) | (yb[0]! << 4) | (yb[1]! << 5);
    const mz = za[0]! | (za[1]! << 1) | (za[2]! << 2) | (za[3]! << 3);
    for (let r = 0; r < 7; r++) {
      const g = c | ((c & mx) << 1) | ((c >> 1) & mx) | ((c & my) << 2) | ((c >> 2) & my) | ((c & mz) << 4) | ((c >> 4) & mz);
      if (g === c) break;
      c = g;
    }
  }
  // the weights of all 8 corners, the unreached ones x 0; the sums in corner order
  const wx = [1 - f[0]!, f[0]!];
  const wq = [wx[0]! * (1 - f[1]!), wx[1]! * (1 - f[1]!), wx[0]! * f[1]!, wx[1]! * f[1]!];
  const wa = wq.map((w, k) => w * (1 - f[2]!) * ((c & (1 << k)) !== 0 ? 1 : 0));
  const wb = wq.map((w, k) => w * f[2]! * ((c & (16 << k)) !== 0 ? 1 : 0));
  const sw = wa[0]! + wa[1]! + wa[2]! + wa[3]! + wb[0]! + wb[1]! + wb[2]! + wb[3]!;
  const sv = wa[0]! * va[0]! + wa[1]! * va[1]! + wa[2]! * va[2]! + wa[3]! * va[3]! + wb[0]! * vb[0]! + wb[1]! * vb[1]! + wb[2]! * vb[2]! + wb[3]! * vb[3]!;
  const vq = h >= 4 ? vb : va;
  const vh = vq[h & 3]!;
  return [amb, sw > 0 ? sv / sw : vh];
}
