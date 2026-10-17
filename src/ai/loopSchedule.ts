/**
 * Timed guard loops (pure), unit-tested. The Trunk Annex runs every guard on the exchange's master clock: a loop is a
 * list of waypoints, each with a dwell, walked at the guard's speed with a short turn at every waypoint. Two waypoints
 * walk out and back (as `PatrolWalker` does); three or more close the loop. A guard "arrives at waypoint 0" at master
 * time `phase`, so loop time is `(master - phase) mod period`.
 */
import { hyp2 } from '../core/mathx';

export interface LoopWp {
  x: number;
  z: number;
  /** Dwell (s), not counting the turn. */
  d: number;
}

/** Turn time at every waypoint (s); the engine feel value the design sheets use. */
export const LOOP_TURN = 0.5;

/** The waypoint order walked in one period: out and back for two points, a closed loop for three or more. */
function order(n: number): number[] {
  if (n === 2) return [0, 1];
  return Array.from({ length: n }, (_, i) => i);
}

/** Leg lengths in walking order: leg k goes from `order[k]` to the next one (wrapping; two points: there and back). */
export function loopLegs(wps: readonly LoopWp[]): number[] {
  const o = order(wps.length);
  return o.map((a, k) => {
    const p = wps[a]!;
    const q = wps[o[(k + 1) % o.length]!]!;
    return hyp2(q.x - p.x, q.z - p.z);
  });
}

/** Walking distance of one period (m). */
export function loopPath(wps: readonly LoopWp[]): number {
  return loopLegs(wps).reduce((s, l) => s + l, 0);
}

/** Pause at each waypoint: the dwell plus the turn. */
export function loopWaits(wps: readonly LoopWp[], turn = LOOP_TURN): number[] {
  return wps.map((w) => w.d + turn);
}

/** Period of one loop (s). */
export function loopPeriod(wps: readonly LoopWp[], speed: number, turn = LOOP_TURN): number {
  return loopPath(wps) / speed + loopWaits(wps, turn).reduce((s, w) => s + w, 0);
}

export interface LoopState {
  x: number;
  z: number;
  /** Waypoint index being paused at, or the one being walked to. */
  idx: number;
  /** Seconds of pause left at `idx` (0 while walking). */
  wait: number;
  /** Seconds since the guard arrived at waypoint 0 (0 .. period). */
  t: number;
}

/** Where a guard is `t` seconds after arriving at waypoint 0 (any t; wraps by the period). */
export function loopStateAt(wps: readonly LoopWp[], speed: number, t: number, turn = LOOP_TURN): LoopState {
  const period = loopPeriod(wps, speed, turn);
  const tt = ((t % period) + period) % period;
  const o = order(wps.length);
  const waits = loopWaits(wps, turn);
  const legs = loopLegs(wps);
  let at = 0;
  for (let k = 0; k < o.length; k++) {
    const a = o[k]!;
    const p = wps[a]!;
    if (tt < at + waits[a]!) return { x: p.x, z: p.z, idx: a, wait: at + waits[a]! - tt, t: tt };
    at += waits[a]!;
    const dur = legs[k]! / speed;
    const nxt = o[(k + 1) % o.length]!;
    if (tt < at + dur) {
      const q = wps[nxt]!;
      const f = dur > 0 ? (tt - at) / dur : 1;
      return { x: p.x + (q.x - p.x) * f, z: p.z + (q.z - p.z) * f, idx: nxt, wait: 0, t: tt };
    }
    at += dur;
  }
  const p = wps[0]!;
  return { x: p.x, z: p.z, idx: 0, wait: 0, t: tt };
}

/** Loop time at the start of the master clock for a guard with this phase (it arrives at waypoint 0 at master time `phase`). */
export function loopTimeAtMaster(phase: number, master = 0): number {
  return master - phase;
}

/** Loop time (s since arriving at each waypoint) in walking order, for the design tables: arrival time at every waypoint. */
export function loopArrivals(wps: readonly LoopWp[], speed: number, turn = LOOP_TURN): number[] {
  const o = order(wps.length);
  const waits = loopWaits(wps, turn);
  const legs = loopLegs(wps);
  const out: number[] = new Array<number>(wps.length).fill(0);
  let at = 0;
  for (let k = 0; k < o.length; k++) {
    out[o[k]!] = at;
    at += waits[o[k]!]! + legs[k]! / speed;
  }
  return out;
}
