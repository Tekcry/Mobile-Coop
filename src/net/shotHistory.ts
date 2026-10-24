/**
 * (rig-pose-fix S3, audit G7 / G20) The host's shot history of each guard and the geometry half of its judge, pure (no
 * Babylon). The host records, at `HISTORY_HZ`, each live guard's sim feet, crouch and two heads:
 * - `h*`: the sim head (`Enemy.simHead`: `guardHead`, the dog's `dogHead`), the head the host's own rounds hit;
 * - `w*`: the head the client is shown (`Enemy.wireHead`: `guardHead` on the inputs the wire carries, which is what the
 *   client's puppet computes, `enemyPuppet.ts`). They differ by what the wire does not carry: the lean round an edge (up
 *   to ~1 m sideways), the wall stance, the aim pitch, the stride's bob.
 * A client's head claim is judged against the rewound heads (at the claim's `rt`), never a stance constant: it passes
 * within `tolerance x 0.7` of either (`checkShot`'s head tolerance, unchanged). A body claim keeps the stance centre.
 * The old dead `rig` branch (posed head / pelvis of a rig nobody passed) is gone.
 */
import { checkShot, type ShotClaim, type ShotVerdict, type V3 } from './validate';

export interface Hist {
  t: number;
  /** Feet and crouch blend. */
  x: number;
  y: number;
  z: number;
  c: number;
  /** The sim head (`Enemy.simHead`). */
  hx: number;
  hy: number;
  hz: number;
  /** The head the client is shown (`Enemy.wireHead`). */
  wx: number;
  wy: number;
  wz: number;
}

/** A guard's place at a rewound time: feet, crouch, both heads (plain numbers; `rewindHist` fills it). */
export interface Rewound {
  feet: V3;
  crouch: number;
  head: V3;
  wire: V3;
}

export function newRewound(): Rewound {
  return { feet: { x: 0, y: 0, z: 0 }, crouch: 0, head: { x: 0, y: 0, z: 0 }, wire: { x: 0, y: 0, z: 0 } };
}

/** Append one sample, keeping at most `max` (the oldest entry is reused: no allocation once full). */
export function pushHist(h: Hist[], max: number, t: number, feet: V3, c: number, head: V3, wire: V3): void {
  const e: Hist = h.length >= max ? h.shift()! : { t: 0, x: 0, y: 0, z: 0, c: 0, hx: 0, hy: 0, hz: 0, wx: 0, wy: 0, wz: 0 };
  e.t = t;
  e.x = feet.x;
  e.y = feet.y;
  e.z = feet.z;
  e.c = c;
  e.hx = head.x;
  e.hy = head.y;
  e.hz = head.z;
  e.wx = wire.x;
  e.wy = wire.y;
  e.wz = wire.z;
  h.push(e);
}

/**
 * The history at host time `t` (clamped to `now - maxRewind .. now`), linearly between the two samples around it (the
 * newest past the end). Fills `out`; false when there is no history.
 */
export function rewindHist(h: readonly Hist[] | undefined, t: number, now: number, maxRewind: number, out: Rewound): boolean {
  if (!h || !h.length) return false;
  const tt = Math.max(now - maxRewind, Math.min(now, t));
  let a = h[0]!;
  let b = h[h.length - 1]!;
  let k = 0;
  if (tt >= b.t) a = b;
  else {
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1]!.t <= tt) {
        a = h[i - 1]!;
        b = h[i]!;
        break;
      }
    }
    k = b.t > a.t ? Math.max(0, Math.min(1, (tt - a.t) / (b.t - a.t))) : 0;
  }
  const f = out.feet;
  f.x = a.x + (b.x - a.x) * k;
  f.y = a.y + (b.y - a.y) * k;
  f.z = a.z + (b.z - a.z) * k;
  out.crouch = a.c + (b.c - a.c) * k;
  const hd = out.head;
  hd.x = a.hx + (b.hx - a.hx) * k;
  hd.y = a.hy + (b.hy - a.hy) * k;
  hd.z = a.hz + (b.hz - a.hz) * k;
  const w = out.wire;
  w.x = a.wx + (b.wx - a.wx) * k;
  w.y = a.wy + (b.wy - a.wy) * k;
  w.z = a.wz + (b.wz - a.wz) * k;
  return true;
}

/** The stance body centre over the feet (body claims; players and guards without a history). */
export function stanceBody(feet: V3, crouch: number, scale: number, out: V3): V3 {
  out.x = feet.x;
  out.y = feet.y + (crouch > 0.5 ? 0.7 : 1.0) * scale;
  out.z = feet.z;
  return out;
}

/** The stance head over the feet: only where no sim head exists (a course friendly-fire claim on a player). */
export function stanceHead(feet: V3, crouch: number, scale: number, out: V3): V3 {
  out.x = feet.x;
  out.y = feet.y + (crouch > 0.5 ? 1.15 : 1.62) * scale;
  out.z = feet.z;
  return out;
}

/**
 * The geometry of a claim on a guard against his rewound place: a body claim against the stance body centre, a head
 * claim against the rewound sim head, else the rewound shown head (both within `checkShot`'s head tolerance). Writes
 * the point judged into `aimOut` (the line of sight and the hit point use it). `tolerance` as `checkShot` (1.1 x scale).
 */
export function judgeRewound(c: ShotClaim, shooterFeet: V3, rw: Rewound, scale: number, range: number, tolerance: number, under: number, bodyOut: V3, aimOut: V3): ShotVerdict {
  const body = stanceBody(rw.feet, rw.crouch, scale, bodyOut);
  let v = checkShot(c, shooterFeet, body, rw.head, range, tolerance, under);
  let aim = c.part === 'head' ? rw.head : body;
  if (!v.ok && v.reason === 'miss' && c.part === 'head') {
    const w = checkShot(c, shooterFeet, body, rw.wire, range, tolerance, under);
    if (w.ok) {
      v = w;
      aim = rw.wire;
    }
  }
  aimOut.x = aim.x;
  aimOut.y = aim.y;
  aimOut.z = aim.z;
  return v;
}
