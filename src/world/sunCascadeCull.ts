import type { AbstractMesh } from '../core/babylon';
import { hyp3 } from '../core/mathx';

/** (guard-render S6) Guards (and their guns) are in the moon's cascades only within this distance of the player (m). */
export const GUARD_SUN_REACH = 40;
/** Hysteresis (m): in below the reach, out above reach + this. */
export const SUN_REACH_HYST = 3;
/** Pad (m) on a caster's bounding sphere (raised hands reach up to 0.3 m outside the rest box). */
export const CASCADE_PAD = 0.5;
/** Pad (NDC): the cascade blend band samples the next layer near its edge. */
export const CASCADE_NDC_PAD = 0.05;

/**
 * Does a sphere (centre cx, cy, cz; radius r) overlap a cascade's light-space x / y square? `t` is the cascade's view x
 * projection matrix (Babylon `Matrix.m` layout, row vectors). No depth test: `depthClamp` keeps casters in front of the
 * near plane. A caster outside the square writes nothing into that layer.
 */
export function inCascadeXY(t: ArrayLike<number>, cx: number, cy: number, cz: number, r: number): boolean {
  let x = cx * t[0]! + cy * t[4]! + cz * t[8]! + t[12]!;
  let y = cx * t[1]! + cy * t[5]! + cz * t[9]! + t[13]!;
  const w = cx * t[3]! + cy * t[7]! + cz * t[11]! + t[15]!;
  if (w !== 0) {
    x /= w;
    y /= w;
  }
  const rr = r + CASCADE_PAD;
  const rx = rr * hyp3(t[0]!, t[4]!, t[8]!);
  const ry = rr * hyp3(t[1]!, t[5]!, t[9]!);
  const lim = 1 + CASCADE_NDC_PAD;
  return Math.abs(x) <= lim + rx && Math.abs(y) <= lim + ry;
}

/** In the list below `reach` (measured from the player); once in, stays until `reach + SUN_REACH_HYST`. `d2` is the squared distance. */
export function keepNearCamera(wasIn: boolean, d2: number, reach: number): boolean {
  if (reach === Infinity) return true;
  if (d2 <= reach * reach) return true;
  if (wasIn) {
    const o = reach + SUN_REACH_HYST;
    return d2 <= o * o;
  }
  return false;
}

/**
 * (guard-render S9) The moon shadow's length along the light (m): the drop `SHADOW_DROP` (a guard's height plus a step or
 * a low ledge) over the light's steepness, capped. `ly` is the normalised light direction's y. A steep moon -> short.
 */
export const SHADOW_DROP = 4;
/** (S9) Cap (m) on the moon shadow's length (a low moon). */
export const SHADOW_LEN_CAP = 12;
export function moonShadowLen(ly: number): number {
  const a = Math.abs(ly);
  return a * SHADOW_LEN_CAP <= SHADOW_DROP ? SHADOW_LEN_CAP : SHADOW_DROP / a;
}

/**
 * (S9) The near end (camera view depth, m) of the receivers that sample cascade `k`: the previous split less its blend
 * band (Babylon blends layer k-1 into k over the last `blend` of k-1's length). Layer 0: everything in front.
 * `splitZ[i]` is layer i's far split (Babylon `_viewSpaceFrustumsZ`), `len[i]` its depth length (`_frustumLengths`).
 */
export function cascadeNear(splitZ: ArrayLike<number>, len: ArrayLike<number>, blend: number, k: number): number {
  return k <= 0 ? -Infinity : splitZ[k - 1]! - blend * len[k - 1]!;
}

/** (S9) The far end of cascade `k`'s receivers: its split plus its own blend band (a margin); the last layer: no end. */
export function cascadeFar(splitZ: ArrayLike<number>, len: ArrayLike<number>, blend: number, k: number, n: number): number {
  return k >= n - 1 ? Infinity : splitZ[k]! + blend * len[k]!;
}

/**
 * (S9) Can the shadow of a sphere at view depth `z` (radius `r`) land on a receiver in [lo, hi]? The shadow runs from
 * the caster along the light for `reach` = shadow length x (light . view forward), signed: it moves the far end away
 * from the camera when positive, the near end towards it when negative.
 */
export function shadowInDepth(z: number, r: number, reach: number, lo: number, hi: number): boolean {
  const zMin = z - r + (reach < 0 ? reach : 0);
  const zMax = z + r + (reach > 0 ? reach : 0);
  return zMax >= lo && zMin <= hi;
}

/** One reusable list per cascade (4: the most any preset uses); nothing allocated after the arrays grow once. */
export class SunCascadeLists {
  readonly lists: AbstractMesh[][] = [[], [], [], []];
  /** (S9) Depth inputs for the next `fill` (`setDepth`); null view = the x / y test only. */
  private view: ArrayLike<number> | null = null;
  private splitZ: ArrayLike<number> | null = null;
  private splitLen: ArrayLike<number> | null = null;
  private blend = 0;
  private lx = 0;
  private ly = -1;
  private lz = 0;

  /**
   * (S9) The camera's view matrix (Babylon `Matrix.m`, left-handed: view z = depth), the cascades' splits and lengths,
   * the blend fraction and the light's direction (normalised here). Any null -> no depth test. Stores references only.
   */
  setDepth(view: ArrayLike<number> | null, splitZ: ArrayLike<number> | null, splitLen: ArrayLike<number> | null, blend: number, lx: number, ly: number, lz: number): void {
    this.view = view;
    this.splitZ = splitZ;
    this.splitLen = splitLen;
    this.blend = blend;
    const l = hyp3(lx, ly, lz);
    const k = l > 0 ? 1 / l : 0;
    this.lx = lx * k;
    this.ly = ly * k;
    this.lz = lz * k;
  }

  /**
   * The casters of `src` over cascade `layer`'s square and (S9) whose shadow can reach that layer's depth range, in
   * order; null (draw the default list) when `t` is null or the layer is out of range.
   */
  fill(layer: number, src: readonly AbstractMesh[], t: ArrayLike<number> | null): AbstractMesh[] | null {
    if (!t || layer < 0 || layer > 3) return null;
    const out = this.lists[layer]!;
    out.length = 0;
    const v = this.view;
    const sz = this.splitZ;
    const sl = this.splitLen;
    const n = sz ? sz.length : 0;
    const depth = v !== null && sz !== null && sl !== null && layer < n;
    let lo = -Infinity;
    let hi = Infinity;
    let reach = 0;
    let fx = 0, fy = 0, fz = 0, fw = 0;
    if (depth) {
      lo = cascadeNear(sz, sl, this.blend, layer);
      hi = cascadeFar(sz, sl, this.blend, layer, n);
      fx = v[2]!;
      fy = v[6]!;
      fz = v[10]!;
      fw = v[14]!;
      reach = moonShadowLen(this.ly) * (this.lx * fx + this.ly * fy + this.lz * fz);
    }
    for (let i = 0; i < src.length; i++) {
      const m = src[i]!;
      const s = m.getBoundingInfo().boundingSphere;
      const c = s.centerWorld;
      const r = s.radiusWorld;
      if (!inCascadeXY(t, c.x, c.y, c.z, r)) continue;
      if (depth && !shadowInDepth(c.x * fx + c.y * fy + c.z * fz + fw, r + CASCADE_PAD, reach, lo, hi)) continue;
      out.push(m);
    }
    return out;
  }
}

/**
 * (S9) The CSM's split depths and lengths live in private fields (Babylon 9.29 `_viewSpaceFrustumsZ`,
 * `_frustumLengths`, the shader's `viewFrustumZ` / `frustumLengths`); `tests/sunCascadeCull.test.ts` fails if they go.
 * Null when absent (the depth test then stays off).
 */
export function csmSplitZ(g: object): ArrayLike<number> | null {
  return (g as { _viewSpaceFrustumsZ?: ArrayLike<number> })._viewSpaceFrustumsZ ?? null;
}
export function csmSplitLen(g: object): ArrayLike<number> | null {
  return (g as { _frustumLengths?: ArrayLike<number> })._frustumLengths ?? null;
}

/**
 * Babylon re-prepares a custom render list for every cascade layer (the default list is prepared once a frame), so the
 * per-cascade lists pay only where the list is all moving casters: under the baked moon the level is not a sun caster.
 * Otherwise the level sits in the list and would be prepared up to 4 times per refresh.
 */
export function useCascadeLists(guardSun: boolean, bakedMoon: boolean): boolean {
  return guardSun && bakedMoon;
}
