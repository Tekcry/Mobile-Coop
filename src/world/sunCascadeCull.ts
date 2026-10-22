import type { AbstractMesh } from '../core/babylon';
import { hyp3 } from '../core/mathx';

/** (guard-render S6) Guards (and their guns) are in the moon's cascades only within this distance of the camera (m). */
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

/** In the list below `reach`; once in, stays until `reach + SUN_REACH_HYST`. `d2` is the squared distance. */
export function keepNearCamera(wasIn: boolean, d2: number, reach: number): boolean {
  if (reach === Infinity) return true;
  if (d2 <= reach * reach) return true;
  if (wasIn) {
    const o = reach + SUN_REACH_HYST;
    return d2 <= o * o;
  }
  return false;
}

/** One reusable list per cascade (4: the most any preset uses); nothing allocated after the arrays grow once. */
export class SunCascadeLists {
  readonly lists: AbstractMesh[][] = [[], [], [], []];

  /** The casters of `src` over cascade `layer`'s square, in order; null (draw the default list) when `t` is null or the layer is out of range. */
  fill(layer: number, src: readonly AbstractMesh[], t: ArrayLike<number> | null): AbstractMesh[] | null {
    if (!t || layer < 0 || layer > 3) return null;
    const out = this.lists[layer]!;
    out.length = 0;
    for (let i = 0; i < src.length; i++) {
      const m = src[i]!;
      const s = m.getBoundingInfo().boundingSphere;
      const c = s.centerWorld;
      if (inCascadeXY(t, c.x, c.y, c.z, s.radiusWorld)) out.push(m);
    }
    return out;
  }
}
