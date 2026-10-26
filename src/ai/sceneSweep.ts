/**
 * (guard-ai piano GA6) The storm-mill scene's slow methodical sweep (pure: no Babylon / DOM), unit-tested
 * (`tests/sceneSweep.test.ts`, the walker in `tests/patrolSweep.test.ts`). Michael 2026-10-26: "The guards must move
 * slowly and methodically to find both players".
 *
 * A guard's route (or his post) becomes a fixed, timed lap at `SCENE_SWEEP.pace`: he walks stop to stop, passes corners
 * (wait 0), and at a pan stop (wait > 0) sweeps his torch left, across to the right, and holds right until the
 * schedule's `leave`. No randomness: every lap the same, two guards on one schedule abreast. Built once per guard at
 * placement (`sweepPlan`: load-time allocation only); everything the walker calls per step allocates nothing.
 *
 * Yaw: 0 = +z, grows towards +x (`atan2(dx, dz)`), so "left" is a negative offset.
 */
import { ENEMY_CALM_MOTION } from '../config/movement';
import { hyp2 } from '../core/mathx';
import type { PatrolRoute, Pt } from './patrol';

export const SCENE_SWEEP = {
  /** Walking pace on the scene (m/s; the caller caps it at the guard's `walkSpeed`). */
  pace: 0.7,
  /** A pan stop's wait when the route gives none (s; not `PATROL.wait`). */
  panTime: 3,
  /** The pan's half width (rad, about 40 deg): 0.7 over 3 s / 4 is 53 deg/s, under the 60 deg/s calm turn. */
  panYaw: 0.7,
  /** A plain post (no route): one pan of this long, round and round (s). */
  postPan: 8,
  /** Added to each walked leg into a pan stop (s): the start, the stop. */
  slack: 0.8,
  /** (N2) The pan cycle starts once the body is within this of its start yaw (rad); the hold still ends at `leave`. */
  panGate: 0.15,
  /** A leg shorter than this (m) is not walked: both stops are one spot (a post's face pan). */
  still: 0.01,
} as const;

/** A guard's sweep, built once (`sweepPlan`). Index i = the route's point i. */
export interface SweepPlan {
  /** The stops (the route's points, or the post). */
  readonly pts: readonly Pt[];
  /** Each stop's nominal wait = its pan cycle D (s); 0 = a corner: passed, never held. */
  readonly wait: Float64Array;
  /** A pan stop's centre (rad): `faces[i]`, else the heading of the leg into it. A face pan: the yaw it pans to. */
  readonly centre: Float64Array;
  /** A face pan's start yaw (rad; the previous stop's face), NaN for an ordinary pan or a corner. */
  readonly from: Float64Array;
  /** Loop time each stop is left (s, 0 = arriving at stop 0). */
  readonly leave: Float64Array;
  /** The lap (s). */
  readonly period: number;
  /** Loop time at the epoch (from the route's `start`; none: arriving at stop 0, N1). */
  readonly phase: number;
  /** The stop the walker heads for at the epoch (`start.idx`, else 0). */
  readonly startIdx: number;
}

/** a wrapped to [-pi, pi). */
export function wrapAng(a: number): number {
  const t = Math.PI * 2;
  let r = (a + Math.PI) % t;
  if (r < 0) r += t;
  return r - Math.PI;
}

/** t wrapped to [0, p). */
export function wrapTime(t: number, p: number): number {
  let r = t % p;
  if (r < 0) r += p;
  return r >= p ? r - p : r;
}

/**
 * (N2) Seconds to turn the body through `angle` rad at the calm rate (`ENEMY_CALM_MOTION`: 60 deg/s, eased by its
 * `turnAccel`, as the motion driver's `turnToward`): up to speed, across, down to stop.
 */
export function sweepTurnTime(angle: number): number {
  const w = ENEMY_CALM_MOTION.turnAim;
  const a = ENEMY_CALM_MOTION.turnAccel;
  const th = angle < 0 ? -angle : angle;
  if (th < 1e-9) return 0;
  return th >= (w * w) / a ? th / w + w / a : 2 * Math.sqrt(th / a);
}

/**
 * The yaw `t` s into an ordinary pan of cycle `D` round `centre`: 0 to D/4 from the centre out to `-side x panYaw`
 * (side +1: left first), D/4 to 3D/4 across to the other side, then hold there; past D the cycle repeats from 0.
 */
export function panYaw(centre: number, side: number, D: number, t: number): number {
  if (!(D > 0)) return centre;
  const e = wrapTime(t, D);
  const A = SCENE_SWEEP.panYaw * side;
  const q = D / 4;
  let off: number;
  if (e < q) off = -A * (e / q);
  else if (e < 3 * q) off = A * (-1 + (e - q) / q);
  else off = A;
  return wrapAng(centre + off);
}

/** The yaw `t` s into a face pan over `D` s: `from` to `to` on the shortest arc, then back over the next D, and so on. */
export function facePanYaw(from: number, to: number, D: number, t: number): number {
  if (!(D > 0)) return to;
  const e = wrapTime(t, 2 * D);
  const k = e < D ? e / D : 2 - e / D;
  return wrapAng(from + wrapAng(to - from) * k);
}

/**
 * A guard's sweep from his route (null: a plain post at (postX, postZ) facing `postYaw`). Leg time = straight length /
 * `pace`, plus (N2) the calm turn from his yaw at the stop he leaves (the end of its pan, the worse side; a corner: his
 * arrival heading) onto the leg, plus on a leg into a pan stop `slack` and the turn onto its centre. An authored `loop`
 * is not used (GA6-A3). Allocates: call at placement only.
 */
export function sweepPlan(route: PatrolRoute | null, postX: number, postZ: number, postYaw: number): SweepPlan {
  const S = SCENE_SWEEP;
  const rp = route && route.points.length > 0 ? route : null;
  const pts: readonly Pt[] = rp ? rp.points : [[postX, postZ]];
  const n = pts.length;
  const faces = rp?.faces;
  const wait = new Float64Array(n);
  const centre = new Float64Array(n);
  const from = new Float64Array(n);
  const leave = new Float64Array(n);
  const len = new Float64Array(n);
  const head = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    wait[i] = rp ? Math.max(0, rp.waits?.[i] ?? rp.wait ?? S.panTime) : S.postPan;
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    len[i] = hyp2(b[0] - a[0], b[1] - a[1]);
    head[i] = len[i]! >= S.still ? Math.atan2(b[0] - a[0], b[1] - a[1]) : Number.NaN;
  }
  // the heading he arrives at stop i on: the last walked leg into it (none: NaN)
  const arr = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    arr[i] = Number.NaN;
    for (let k = 1; k <= n; k++) {
      const h = head[(i - k + n * 2) % n]!;
      if (h === h) {
        arr[i] = h;
        break;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n;
    const f = faces?.[i];
    const fp = faces?.[prev];
    const a = arr[i]!;
    centre[i] = f ?? (rp && a === a ? a : postYaw);
    from[i] = n > 1 && wait[i]! > 0 && !(len[prev]! >= S.still) && f !== undefined && fp !== undefined ? fp : Number.NaN;
  }
  // leg times
  const leg = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const h = head[i]!;
    if (!(h === h)) continue;
    const j = (i + 1) % n;
    let t = len[i]! / S.pace;
    if (wait[i]! > 0) {
      const fr = from[i]!;
      if (fr === fr) t += sweepTurnTime(wrapAng(h - centre[i]!));
      else {
        const l = sweepTurnTime(wrapAng(h - (centre[i]! - S.panYaw)));
        const r = sweepTurnTime(wrapAng(h - (centre[i]! + S.panYaw)));
        t += l > r ? l : r;
      }
    } else {
      const ah = arr[i]!;
      if (ah === ah) t += sweepTurnTime(wrapAng(h - ah));
    }
    if (wait[j]! > 0) t += S.slack + sweepTurnTime(wrapAng(centre[j]! - h));
    leg[i] = t;
  }
  let at = 0;
  for (let i = 0; i < n; i++) {
    leave[i] = at + wait[i]!;
    at = leave[i]! + leg[i]!;
  }
  const period = Math.max(1e-3, at);
  const st = rp?.start;
  const startIdx = st ? Math.min(n - 1, Math.max(0, st.idx)) : 0;
  const phase = wrapTime(leave[startIdx]! - (st ? st.wait : wait[startIdx]!), period);
  return { pts, wait, centre, from, leave, period, phase, startIdx };
}

/** The lap (s) of a route at sweep pace (Campaign's S1b tests tune lap lengths with it). */
export function sweepPeriod(route: PatrolRoute): number {
  return sweepPlan(route, 0, 0, 0).period;
}

/** The stop nearest (x, z) by straight distance (ties: the lower index). */
export function nearestStop(plan: SweepPlan, x: number, z: number): number {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < plan.pts.length; i++) {
    const p = plan.pts[i]!;
    const d = hyp2(p[0] - x, p[1] - z);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

/**
 * (N3, GA6-A11) The stop a guard at (x, z) rejoins at loop time `now`: the pan stop he can be back in step at soonest,
 * the smallest `wrap(leave[k] - now - dist_k / pace)` (ties: the nearest). Corners are never targets; a plan with no pan
 * stop: the nearest stop.
 */
export function rejoinStop(plan: SweepPlan, x: number, z: number, now: number): number {
  let best = -1;
  let bt = Infinity;
  let bd = Infinity;
  for (let k = 0; k < plan.pts.length; k++) {
    if (!(plan.wait[k]! > 0)) continue;
    const p = plan.pts[k]!;
    const d = hyp2(p[0] - x, p[1] - z);
    const t = wrapTime(plan.leave[k]! - now - d / SCENE_SWEEP.pace, plan.period);
    if (t < bt - 1e-6 || (t <= bt + 1e-6 && d < bd)) {
      best = k;
      bt = t;
      bd = d;
    }
  }
  return best < 0 ? nearestStop(plan, x, z) : best;
}
