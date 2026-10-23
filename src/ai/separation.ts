/**
 * (guard-ai S20, Michael's walk of 4.72 G4: "guards seem to walk through eachother and sometimes doors.") Guard-guard
 * separation (pure: no Babylon / DOM), unit-tested (`tests/guardSpacing.test.ts`). `Enemy.move` calls it every step.
 *
 * Cause: the old steering was one soft push (3 x (1.1 - d) m/s inside about 1.05 m) added to the wanted velocity, then
 * smoothed by the motion driver; nothing held the step itself. A walk (1 m/s) stalled face to face about 0.77 m apart,
 * a jog (S19, 2.4 m/s) beat the push at about 0.3 m and a run (3.2 m/s) went straight through.
 *
 * Now, against every solid guard (alive, not held in a takedown: `SepBody.solid`) on his storey (`dy`):
 * - `steerFrom`: the soft push as before (`reach`, `gain`), plus a sidestep round a guard ahead on his line (`ahead`,
 *   `lane`, `side`): he passes him on the side away from him (dead ahead: his own right-hand rule, so two guards
 *   head on step apart instead of stalling);
 * - `stepApart`: the step itself never ends nearer than `min` between centres (it is cut at that circle, so he slides
 *   round); a guard already nearer (spawned so, let go from a hold) may not get any nearer, only apart. A step that
 *   cannot be cut clear of every guard is not taken.
 * A guard held in a takedown and a downed guard (dead, knocked out) are not solid: the operator's hostage, a carried
 * body and a body on the floor push nobody. Allocation-free: the caller's `out`, no closures, `hyp2`.
 */
import { hyp2 } from '../core/mathx';

export const SEPARATION = {
  /** The soft push starts inside this between centres (m; the old steering's 1.1 m^2 test). */
  reach: 1.05,
  /** The soft push: this x (reach - d) m/s, as before. */
  gain: 3,
  /** A walker sidesteps a guard ahead of him on his line within this (m). */
  ahead: 2.2,
  /** ... whose centre is within this of his line (m): further off he passes clear. */
  lane: 0.9,
  /** The sidestep at contact, x his speed (fading to 0 at `ahead` and at `lane`). */
  side: 0.9,
  /** Never nearer than this between centres (m): two body capsules (about 0.28 m each) and a gap. A talking pair (S10)
   *  stands at its meet points, further apart; this only stops a step into the other man. */
  min: 0.65,
  /** Only guards within this height of his feet (m): a guard on the floor above is not in his way. */
  dy: 1.5,
  /** (guard-ai S20 check) Held by the hard spacing this long (s) with somewhere to go, at under a quarter of his pace (two
   *  guards face to face in a doorway or a narrow corridor, where neither can step round the other; a man standing in
   *  his way): he squeezes past ... */
  stall: 1,
  /** ... for this long (s): the hard spacing is off for him (the soft push and the sidestep only, as before S20), so
   *  nobody waits forever. */
  squeeze: 2,
} as const;

/** A guard as the separation sees him (`Enemy`: `pos`, `solid`). */
export interface SepBody {
  readonly pos: { readonly x: number; readonly y: number; readonly z: number };
  /** Alive and not held in a takedown. */
  readonly solid: boolean;
}

/** An (x, z) pair written by the functions here. */
export interface SepOut {
  x: number;
  z: number;
}

/**
 * The soft push and the sidestep off one guard at (ox, oz) for a walker at (x, z) heading (gx, gz) (unit; 0, 0 when
 * standing) at `speed` m/s, added into `out` (m/s).
 */
export function steerOff(x: number, z: number, gx: number, gz: number, speed: number, ox: number, oz: number, out: SepOut): void {
  const S = SEPARATION;
  const dx = x - ox;
  const dz = z - oz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= S.ahead * S.ahead || d2 < 1e-8) return;
  const d = Math.sqrt(d2);
  if (d < S.reach) {
    const k = ((S.reach - d) * S.gain) / d;
    out.x += dx * k;
    out.z += dz * k;
  }
  if (speed <= 0.05) return;
  // how far ahead on his line, and how far off it (+: to his right, (gz, -gx))
  const fwd = -(dx * gx + dz * gz);
  if (fwd <= 0) return;
  const lat = -dx * gz + dz * gx;
  const off = lat < 0 ? -lat : lat;
  if (off >= S.lane) return;
  const m = S.side * speed * (1 - d / S.ahead) * (1 - off / S.lane) * (fwd / d);
  // away from his side; dead ahead (lat 0): to the left of both, so a head-on pair parts
  const sgn = lat >= 0 ? -1 : 1;
  out.x += sgn * gz * m;
  out.z -= sgn * gx * m;
}

/** `steerOff` from every solid guard in `list` but `self` on his storey, added into `out`. */
export function steerFrom(self: SepBody, gx: number, gz: number, speed: number, list: readonly SepBody[], out: SepOut): void {
  const p = self.pos;
  for (let k = 0; k < list.length; k++) {
    const o = list[k]!;
    if (o === self || !o.solid) continue;
    const q = o.pos;
    if (Math.abs(q.y - p.y) > SEPARATION.dy) continue;
    steerOff(p.x, p.z, gx, gz, speed, q.x, q.z, out);
  }
}

/**
 * Cut the step (x0, z0) -> (x1, z1) so it ends no nearer to (ox, oz) than `min` (or than it started, when it started
 * nearer): the end is put back on that circle along the line from (ox, oz). Writes `out`; true when cut.
 */
export function keepApart(x0: number, z0: number, x1: number, z1: number, ox: number, oz: number, out: SepOut): boolean {
  out.x = x1;
  out.z = z1;
  const ex = x1 - ox;
  const ez = z1 - oz;
  const d1 = hyp2(ex, ez);
  const d0 = hyp2(x0 - ox, z0 - oz);
  const lim = d0 < SEPARATION.min ? d0 : SEPARATION.min;
  if (d1 >= lim) return false;
  if (d1 > 1e-6) {
    out.x = ox + (ex / d1) * lim;
    out.z = oz + (ez / d1) * lim;
  } else {
    out.x = x0;
    out.z = z0;
  }
  return true;
}

/** (x, z) would put `self` nearer than allowed to a solid guard in `list` (`keepApart`'s rule from his own position). */
export function tooClose(self: SepBody, x: number, z: number, list: readonly SepBody[]): boolean {
  const p = self.pos;
  for (let k = 0; k < list.length; k++) {
    const o = list[k]!;
    if (o === self || !o.solid) continue;
    const q = o.pos;
    if (Math.abs(q.y - p.y) > SEPARATION.dy) continue;
    const d0 = hyp2(p.x - q.x, p.z - q.z);
    const lim = d0 < SEPARATION.min ? d0 : SEPARATION.min;
    if (hyp2(x - q.x, z - q.z) < lim - 1e-6) return true;
  }
  return false;
}

/**
 * `self`'s step to (x1, z1) cut clear of every solid guard on his storey (two passes; still not clear: no step, `out`
 * his own position). Writes `out`; true when the step changed.
 */
export function stepApart(self: SepBody, x1: number, z1: number, list: readonly SepBody[], out: SepOut): boolean {
  const p = self.pos;
  let x = x1;
  let z = z1;
  let cut = false;
  for (let pass = 0; pass < 2; pass++) {
    for (let k = 0; k < list.length; k++) {
      const o = list[k]!;
      if (o === self || !o.solid) continue;
      const q = o.pos;
      if (Math.abs(q.y - p.y) > SEPARATION.dy) continue;
      if (keepApart(p.x, p.z, x, z, q.x, q.z, out)) {
        x = out.x;
        z = out.z;
        cut = true;
      }
    }
    if (!cut) break;
  }
  if (cut && tooClose(self, x, z, list)) {
    x = p.x;
    z = p.z;
  }
  out.x = x;
  out.z = z;
  return cut;
}
