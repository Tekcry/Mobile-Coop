/**
 * (locomotion step 10) The Chaos Theory elbow strike (bible 5.4): fire while the weapon is holstered. Pure and
 * unit-tested: the tuning, the result table, the 0.9 s timeline and the reach / cone test. The controller
 * (`strikeController.ts`) and the co-op host (`committedMoves.ts`) run on it.
 */
import { hyp2 } from '../core/mathx';

export const STRIKE = {
  /** Reach (m) from the striker's feet to the guard's. */
  reach: 1.2,
  /** Full cone (rad, 90 deg): the guard within 45 deg either side of the strike's facing. */
  cone: Math.PI / 2,
  /** Seconds from the press to contact. */
  hitAt: 0.5,
  /** Recovery after contact (s); a whiff leaves the striker exposed for all of it. */
  recover: 0.4,
  /** Anticipation (s) at the start: the wind-up the requester plays on the press. */
  anticipation: 0.15,
  /** A struck aware guard staggers this long (s); a second strike inside it knocks him out. */
  stagger: 1.0,
  /** Noise radius (m) of a strike that connects. */
  noise: 4,
  /** Root motion cap (m): the body never lunges further than this. */
  lunge: 0.3,
  /** Client prediction: no host reply in this long (s) cancels; the cancel blends back in `blendBack` s. */
  replyTimeout: 0.4,
  blendBack: 0.12,
  /** The host's lag slack (m) on the reach for a client's strike. */
  lagSlack: 0.6,
} as const;

/** The whole move (s): anticipation, the strike to contact at 0.5 s, the recovery to 0.9 s. */
export const STRIKE_DUR = STRIKE.hitAt + STRIKE.recover;

export type StrikeResult = 'ko' | 'stagger';

export interface StrikeVictimView {
  /** Not unaware (suspicious and above). */
  aware: boolean;
  /** Guard facing . direction guard -> striker: > 0.5 = he faces the striker (within 60 deg). */
  facingDot: number;
  heavy: boolean;
  /** Still staggered by an earlier strike. */
  staggered: boolean;
}

/** The bible 5.4 table: unaware (any side), side / behind, or a second strike inside the stagger -> knocked out;
 *  aware and facing -> staggered; a heavy from the front is only ever staggered. */
export function resolveStrike(v: StrikeVictimView): StrikeResult {
  const facing = v.facingDot > 0.5;
  if (v.heavy && facing) return 'stagger';
  if (v.staggered) return 'ko';
  if (!v.aware) return 'ko';
  return facing ? 'stagger' : 'ko';
}

/** Facing dot of a guard (yaw `gy`, at gx, gz) towards a striker at sx, sz (1 = looking straight at him). */
export function facingDot(gy: number, gx: number, gz: number, sx: number, sz: number): number {
  const dx = sx - gx;
  const dz = sz - gz;
  const d = hyp2(dx, dz);
  if (d < 1e-6) return 1;
  return (Math.sin(gy) * dx + Math.cos(gy) * dz) / d;
}

const COS_HALF = Math.cos(STRIKE.cone / 2);

/** Distance to a guard at (dx, dz) from the striker facing `yaw`, or -1 outside the reach (+ `slack`) or the cone. */
export function strikeReach(dx: number, dz: number, yaw: number, slack = 0): number {
  const d = hyp2(dx, dz);
  if (d > STRIKE.reach + slack) return -1;
  if (d < 0.25) return d;
  return (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / d >= COS_HALF ? d : -1;
}

export type StrikeStage = 'anticipation' | 'strike' | 'recover' | 'done';

/** Where `t` seconds into a strike is: its stage and the phase 0..1 the MoveState carries (`ph`). */
export function strikeStage(t: number): StrikeStage {
  if (t >= STRIKE_DUR) return 'done';
  if (t >= STRIKE.hitAt) return 'recover';
  return t >= STRIKE.anticipation ? 'strike' : 'anticipation';
}

export function strikePhase(t: number): number {
  return t <= 0 ? 0 : t >= STRIKE_DUR ? 1 : t / STRIKE_DUR;
}
