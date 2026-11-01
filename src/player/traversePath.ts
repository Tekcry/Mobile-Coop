/**
 * Feet path of a committed traversal (pure): step up, vault, mantle, roll, hop, drop. The local player plays it
 * (`TraversalController`); a co-op remote replays the same path from the move's start (`MoveCommit`,
 * 3.2.0 phase 1), so it never lags or cuts corners through the obstacle.
 */
export interface PathPoint {
  x: number;
  y: number;
  z: number;
}

export type PathKind = 'step' | 'vault' | 'mantle' | 'drop' | 'hop' | 'roll';

const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * (anim-n4b, PASS2 row 61 / AUDIT fix 26) The mantle's root path shares ('mantle' below; the anim graph's hand plant,
 * `anim/clips/traverse` mantlePlant, reads them too): the feet rise to the top (+ `MANTLE_PATH.topLift`) over 0 - 0.65
 * and move along to the end (`standIn` past the edge) over 0.35 - 1. (anim-n4b fix: here, so the path never imports
 * animation.)
 */
export const MANTLE_PATH = { riseEnd: 0.65, alongFrom: 0.35, topLift: 0.04, standIn: 0.4 } as const;
export function mantleRise(k: number): number {
  return smooth(k / MANTLE_PATH.riseEnd);
}
export function mantleAlong(k: number): number {
  return smooth((k - MANTLE_PATH.alongFrom) / (1 - MANTLE_PATH.alongFrom));
}

/** The roll path's ride (m): the root rises a little over the roll ('roll' below; shared so the rig can take it back out
 *  of the body: the anim graph's `tumbleDrop`). */
export function rollRide(k: number): number {
  return 0.16 * Math.sin(Math.PI * Math.min(1, Math.max(0, (k - 0.1) / 0.75)));
}

/** Feet at progress `k` (0..1) of a move from `f` to `e` over an obstacle top `top`, entered at `speed0` (m/s). */
export function traversePath(kind: PathKind, f: PathPoint, e: PathPoint, top: number, speed0: number, k: number, out: PathPoint): PathPoint {
  let h: number;
  let y: number;
  switch (kind) {
    case 'mantle': {
      // hands on top, pull up (rise first), then step onto it ((anim-n4b) the shares the hand plant reads)
      const up = mantleRise(k);
      h = mantleAlong(k);
      y = f.y + (e.y + MANTLE_PATH.topLift - f.y) * up;
      break;
    }
    case 'vault': {
      // plant, swing the legs over the top, land; in stride the momentum carries straight through
      const run = Math.min(1, Math.max(0, (speed0 - 1) / 2));
      h = smooth(k) * (1 - run) + k * run;
      const clear = top + 0.12;
      const arc = Math.sin(Math.PI * Math.min(1, k * 1.15));
      y = f.y + (e.y - f.y) * h + Math.max(0, clear - Math.max(f.y, e.y)) * arc;
      break;
    }
    case 'roll': {
      // momentum carries through, easing out as the body comes back up; the curled body rides up a little
      // over its back (the tumble pivot is at the hips) so the shoulders roll over the floor, not through it
      // ((anim-n4b) the grounded roll's rig takes the ride back out of the body: `rollRide`, characterRig tumbleDrop)
      h = k * (2 - k);
      y = f.y + (e.y - f.y) * h + rollRide(k);
      break;
    }
    case 'hop': {
      // a low, quick leap: carried by momentum (near linear), a short arc
      h = k;
      y = f.y + (e.y - f.y) * smooth(k) + 0.45 * Math.sin(Math.PI * k);
      break;
    }
    case 'drop': {
      // step off the edge; gravity takes over after the release
      h = smooth(k);
      y = f.y - 0.05 * k;
      break;
    }
    default: {
      // step up: lift then forward
      const up = smooth(k / 0.6);
      h = smooth((k - 0.2) / 0.8);
      y = f.y + (e.y + 0.03 - f.y) * up;
    }
  }
  out.x = f.x + (e.x - f.x) * h;
  out.y = y;
  out.z = f.z + (e.z - f.z) * h;
  return out;
}
