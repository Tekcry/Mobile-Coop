/**
 * (char-shadow-meter S1, J16) The character-occluder contract: one sim capsule per character (players, guards, dogs,
 * bodies) in fixed typed arrays, read by the light meter (`LightField` with a contract), the picture's round shadows
 * and Guard AI's shadow cues. Pure: no Babylon, no graphics state, no allocation after construction (G352, bible P1:
 * the meter reads the character shadows the picture shows).
 *
 * One formula, two languages: `capsuleTransmit` is the shaders' `lampCapsule` ported line for line, and
 * `LAMP_CAPSULE_GLSL` (which `bakedLamps.ts` puts in its lamp loop) is built here from the same `CAPSULE` numbers.
 * `tests/charOccluders.test.ts` compares the two on random cases.
 */
import { hyp3 } from '../core/mathx';

/** Capsules in a contract and floats per capsule: ax ay az bx by bz r kind. */
export const OCC = { max: 64, stride: 8 } as const;
/** A capsule's character kind (the 8th float, and the high half of its owner key). */
export const OCC_KIND = { player: 1, guard: 2, dog: 3, body: 4 } as const;
/** The soft capsule (the GLSL `lampCapsule`): umbra floor, own-surface radius (x r), soft edge (r x penR + metres behind
 *  x penBehind), and the holder reach (m past r) inside which a light is never shadowed by that character (BRIEF A5). */
export const CAPSULE = { floor: 0.15, self: 1.6, penR: 0.35, penBehind: 0.12, holder: 0.6 } as const;
/** The gameplay lamp set (BRIEF A1): a baked lamp gets the character term where it gives at least `minLevel`; at most
 *  `maxLamps` lamps per point (the strongest); the moon is a source `moonFar` metres along its direction. The picture's
 *  slot reach (`CHAR_SHADOW.minLevel`, charShadowSet.ts) is set from `minLevel`, never the reverse. */
export const CHAR_LIGHT = { minLevel: 0.04, maxLamps: Infinity, moonFar: 60 } as const;

/** A capsule's owner key: kind << 16 | index (never -1, the "skip nothing" key). */
export function occKey(kind: number, index: number): number {
  return (kind << 16) | (index & 0xffff);
}

/** A double result slot (a number field is updated in place; a returned double from a call V8 does not inline is
 *  boxed, 16 B: the `LightField.res` pattern). */
class Out {
  v = 1;
}
const OUT = new Out();

export class CharOccluders {
  readonly cap = new Float32Array(OCC.max * OCC.stride);
  readonly owner = new Int32Array(OCC.max);
  n = 0;
  /** Bumped by each `clear` (one per fill). */
  version = 0;
  /** `transmitInto`'s result. */
  t = 1;

  clear(): void {
    this.n = 0;
    this.version++;
  }

  /** One capsule, foot (a) to head (b), radius r; its slot, or -1 when the contract is full. */
  add(kind: number, index: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number): number {
    if (this.n >= OCC.max) return -1;
    const i = this.n++;
    const o = i * OCC.stride;
    const c = this.cap;
    c[o] = ax;
    c[o + 1] = ay;
    c[o + 2] = az;
    c[o + 3] = bx;
    c[o + 4] = by;
    c[o + 5] = bz;
    c[o + 6] = r;
    c[o + 7] = kind;
    this.owner[i] = occKey(kind, index);
    return i;
  }

  /**
   * Product of `capsuleTransmit` over the capsules between (px,py,pz) and the source (sx,sy,sz), into `t` (1: none).
   * Skipped: the capsule whose owner is `skip` (no self shadow, A4), and one holding the source (its axis within r +
   * `CAPSULE.holder` of the source, A5). Broad phase: a capsule is tested only when its box, grown by the widest soft
   * edge (r + r x penR + penBehind x the segment's length), meets the segment's box; one outside it would give exactly
   * 1, so the product is the brute-force product to the bit.
   */
  transmitInto(sx: number, sy: number, sz: number, px: number, py: number, pz: number, skip: number): void {
    let t = 1;
    const n = this.n;
    if (n > 0) {
      const C = this.cap;
      const sMinX = px < sx ? px : sx;
      const sMaxX = px < sx ? sx : px;
      const sMinY = py < sy ? py : sy;
      const sMaxY = py < sy ? sy : py;
      const sMinZ = pz < sz ? pz : sz;
      const sMaxZ = pz < sz ? sz : pz;
      const grow = CAPSULE.penBehind * hyp3(sx - px, sy - py, sz - pz) + 1e-3;
      for (let i = 0; i < n; i++) {
        if (this.owner[i] === skip) continue;
        const o = i * OCC.stride;
        const ax = C[o]!;
        const ay = C[o + 1]!;
        const az = C[o + 2]!;
        const bx = C[o + 3]!;
        const by = C[o + 4]!;
        const bz = C[o + 5]!;
        const r = C[o + 6]!;
        const g = r * (1 + CAPSULE.penR) + grow;
        if ((ax < bx ? ax : bx) - g > sMaxX || (ax < bx ? bx : ax) + g < sMinX) continue;
        if ((ay < by ? ay : by) - g > sMaxY || (ay < by ? by : ay) + g < sMinY) continue;
        if ((az < bz ? az : bz) - g > sMaxZ || (az < bz ? bz : az) + g < sMinZ) continue;
        if (holds(sx, sy, sz, ax, ay, az, bx, by, bz, r)) continue;
        capsuleInto(px, py, pz, sx, sy, sz, ax, ay, az, bx, by, bz, r);
        t *= OUT.v;
      }
    }
    this.t = t;
  }
}

/** A5: the source within r + `CAPSULE.holder` of the capsule's axis (the character holds it: a flashlight). */
export function holds(sx: number, sy: number, sz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const wx = sx - ax;
  const wy = sy - ay;
  const wz = sz - az;
  const c = dx * dx + dy * dy + dz * dz;
  let k = c > 1e-12 ? (wx * dx + wy * dy + wz * dz) / c : 0;
  k = k < 0 ? 0 : k > 1 ? 1 : k;
  const reach = r + CAPSULE.holder;
  const ex = wx - dx * k;
  const ey = wy - dy * k;
  const ez = wz - dz * k;
  return ex * ex + ey * ey + ez * ez < reach * reach;
}

/** How much of a light at (lx,ly,lz) reaches (px,py,pz) past one capsule a-b of radius r (CAPSULE.floor..1). */
export function capsuleTransmit(px: number, py: number, pz: number, lx: number, ly: number, lz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number): number {
  capsuleInto(px, py, pz, lx, ly, lz, ax, ay, az, bx, by, bz, r);
  return OUT.v;
}

/** The GLSL `lampCapsule` line for line (`LAMP_CAPSULE_GLSL`), into `OUT.v`. */
function capsuleInto(px: number, py: number, pz: number, lx: number, ly: number, lz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number): void {
  if (!(r > 0)) {
    OUT.v = 1;
    return;
  }
  // vec3 d2 = b - a; float c2 = max(dot(d2, d2), 1e-6); vec3 w0 = p - a;
  const d2x = bx - ax;
  const d2y = by - ay;
  const d2z = bz - az;
  let c2 = d2x * d2x + d2y * d2y + d2z * d2z;
  if (c2 < 1e-6) c2 = 1e-6;
  const w0x = px - ax;
  const w0y = py - ay;
  const w0z = pz - az;
  // the character's own surface: no self shadow
  const e2 = d2x * w0x + d2y * w0y + d2z * w0z;
  let k = e2 / c2;
  k = k < 0 ? 0 : k > 1 ? 1 : k;
  if (hyp3(w0x - d2x * k, w0y - d2y * k, w0z - d2z * k) < r * CAPSULE.self) {
    OUT.v = 1;
    return;
  }
  // vec3 d1 = l - p; float c1 = max(dot(d1, d1), 1e-6); c12, e1, e2 (above), den
  const d1x = lx - px;
  const d1y = ly - py;
  const d1z = lz - pz;
  let c1 = d1x * d1x + d1y * d1y + d1z * d1z;
  if (c1 < 1e-6) c1 = 1e-6;
  const c12 = d1x * d2x + d1y * d2y + d1z * d2z;
  const e1 = d1x * w0x + d1y * w0y + d1z * w0z;
  const den = c1 * c2 - c12 * c12;
  let s = 0;
  if (den > 1e-6) {
    s = (c12 * e2 - c2 * e1) / den;
    s = s < 0 ? 0 : s > 1 ? 1 : s;
  }
  let t = (c12 * s + e2) / c2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  s = (c12 * t - e1) / c1;
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  // float dist = length(p + d1 * s - a - d2 * t); float behind = s * sqrt(c1);
  const dist = hyp3(w0x + d1x * s - d2x * t, w0y + d1y * s - d2y * t, w0z + d1z * s - d2z * t);
  const behind = s * Math.sqrt(c1);
  const pen = r * CAPSULE.penR + behind * CAPSULE.penBehind;
  // mix(floor, 1.0, smoothstep(r - pen, r + pen, dist)), as GLSL defines both
  const lo = r - pen;
  let h = (dist - lo) / (r + pen - lo);
  h = h < 0 ? 0 : h > 1 ? 1 : h;
  h = h * h * (3 - 2 * h);
  OUT.v = CAPSULE.floor * (1 - h) + h;
}

/** A GLSL float literal (always with a decimal point). */
function glf(v: number): string {
  return Number.isInteger(v) ? v.toFixed(1) : String(v);
}

/** The GLSL `lampCapsule`, built from `CAPSULE` (the lamp loop and the light volume in `bakedLamps.ts` call it). */
export const LAMP_CAPSULE_GLSL = `// a character's capsule between the shaded point and the lamp: a soft shadow widening with the distance behind it
float lampCapsule(vec3 p, vec3 l, vec3 a, vec3 b, float r) {
  vec3 d2 = b - a;
  float c2 = max(dot(d2, d2), 1e-6);
  vec3 w0 = p - a;
  // the character's own surface: no self shadow
  if (length(w0 - d2 * clamp(dot(w0, d2) / c2, 0.0, 1.0)) < r * ${glf(CAPSULE.self)}) return 1.0;
  vec3 d1 = l - p;
  float c1 = max(dot(d1, d1), 1e-6);
  float c12 = dot(d1, d2);
  float e1 = dot(d1, w0);
  float e2 = dot(d2, w0);
  float den = c1 * c2 - c12 * c12;
  float s = den > 1e-6 ? clamp((c12 * e2 - c2 * e1) / den, 0.0, 1.0) : 0.0;
  float t = clamp((c12 * s + e2) / c2, 0.0, 1.0);
  s = clamp((c12 * t - e1) / c1, 0.0, 1.0);
  float dist = length(p + d1 * s - a - d2 * t);
  float behind = s * sqrt(c1);
  float pen = r * ${glf(CAPSULE.penR)} + behind * ${glf(CAPSULE.penBehind)};
  return mix(${glf(CAPSULE.floor)}, 1.0, smoothstep(r - pen, r + pen, dist));
}`;
