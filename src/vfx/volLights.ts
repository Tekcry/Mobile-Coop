/**
 * The volumetric pass's per-light values (Babylon-free; `PostStack.frame`). Rendering only: the fog never feeds
 * gameplay (the meter and the guards read `LightField`).
 *
 * Only a torch (`kind: 'flashlight'`) draws a long beam: marched to its reach (stopped by geometry), its own cone, gain
 * 1.6. Every fixed light - a lamp, and a fixed spot (an LED strip or bulkhead with a beam optic, a flood) - scatters
 * under its shade: a short march, at most 3.2 m and half the radius, along its beam direction (straight down without a
 * cone), no wider than the lamp cone (cos 0.88), gain 1. (vol-cone-fix: before, any light with a cone took the
 * torch treatment, so the Sector Ops strips drew full ceiling-to-floor white cones, ~35x the scatter of a lamp.)
 */
import type { LightDef } from '../world/lights';

/** A fixed light's widest scatter cone (cos of the half angle, ~28 deg). */
export const VOL_LAMP_COS = 0.88;
/** A fixed light's longest march (m). */
export const VOL_LAMP_MAX = 3.2;
/** A torch's longest march (m). */
export const VOL_BEAM_MAX = 14;
/** A torch's in-scatter gain. */
export const VOL_BEAM_GAIN = 1.6;

/** Whether a light draws a long volumetric beam (only torches). */
export function volBeam(l: Pick<LightDef, 'kind'>): boolean {
  return l.kind === 'flashlight';
}

/** Write light `l` into slot `k` of the pass's uniforms: pos (xyz, march radius), dir (xyz, cosOuter), colour (rgb x
 *  gain, 1). Allocation-free. */
export function writeVolLight(l: LightDef, k: number, pos: Float32Array, dir: Float32Array, col: Float32Array): void {
  const beam = volBeam(l);
  const o = k * 4;
  pos[o] = l.x;
  pos[o + 1] = l.y;
  pos[o + 2] = l.z;
  pos[o + 3] = beam ? Math.min(l.reach ?? l.radius, VOL_BEAM_MAX) : Math.min(VOL_LAMP_MAX, l.radius * 0.5, Math.max(0.8, l.y));
  const c = l.cone;
  if (c) {
    dir[o] = c.dx;
    dir[o + 1] = c.dy;
    dir[o + 2] = c.dz;
    dir[o + 3] = beam ? c.cosOuter : Math.max(c.cosOuter, VOL_LAMP_COS);
  } else {
    dir[o] = 0;
    dir[o + 1] = -1;
    dir[o + 2] = 0;
    dir[o + 3] = VOL_LAMP_COS;
  }
  const g = l.intensity * (beam ? VOL_BEAM_GAIN : 1);
  col[o] = l.color[0] * g;
  col[o + 1] = l.color[1] * g;
  col[o + 2] = l.color[2] * g;
  col[o + 3] = 1;
}
