/**
 * (locomotion step 10) The Chaos Theory palm strike (G42 / G155, prototype A4; the file keeps its old name): fire while the weapon is holstered. Pure and
 * unit-tested: the tuning, the result table, the 1.48 s timeline (J19 R8) and the reach / cone test. The controller
 * (`strikeController.ts`) and the co-op host (`committedMoves.ts`) run on it.
 */
import { hyp2 } from '../core/mathx';

export const STRIKE = {
  /** Reach (m) from the striker's feet to the guard's. */
  reach: 1.3,
  /** Full cone (rad, 140 deg, F1b): the guard within 70 deg either side of the strike's facing, any side of him. */
  cone: (Math.PI * 140) / 180,
  /** Seconds from the press to contact (F1b: shorter wind-up, strike-2 "too slow"). */
  hitAt: 0.08,
  /** (J19 R8, Michael Q34 2026-10-25 "About 1.4 s") Recovery after contact (s): free 1.4 s after contact, as the
   *  footage / loco M25 (F1b had 0.6). The pose's follow-through and settle fill it (`strikeBody.ts` `strikeArcAt`). */
  recover: 1.4,
  /** A whiff (the guard left the reach during the wind-up) frees the operator this long after the contact time (s). */
  whiffRecover: 0.3,
  /** Extra reach (m) at contact for the local player: a guard who stepped away during the wind-up is still hit. */
  contactSlack: 0.3,
  /** Anticipation (s) at the start: the wind-up the requester plays on the press. */
  anticipation: 0.06,
  /** Noise radius (m) of a strike that connects. */
  noise: 4,
  /** Root motion cap (m): the body never lunges further than this. */
  lunge: 0.4,
  /** Client prediction: no host reply in this long (s) cancels; the cancel blends back in `blendBack` s. */
  replyTimeout: 0.4,
  blendBack: 0.12,
  /** The host's lag slack (m) on the reach for a client's strike. */
  lagSlack: 0.8,
} as const;

/** The whole move (s): contact at 0.08 s, free at 1.48 s (J19 R8); a whiff ends at 0.38 s. */
export const STRIKE_DUR = STRIKE.hitAt + STRIKE.recover;
/** A whiff's length (s). */
export const STRIKE_WHIFF_DUR = STRIKE.hitAt + STRIKE.whiffRecover;

export type StrikeResult = 'ko';

/** Kept for callers; unused (G42 / G155: the palm strike is a one-hit knockout from any side on every guard). */
export interface StrikeVictimView {
  aware?: boolean;
  facingDot?: number;
}

/** G42 / G155: the palm strike knocks out any guard in one hit, from any side, aware or not. No stagger, no heavies. */
export function resolveStrike(_v?: StrikeVictimView): StrikeResult {
  return 'ko';
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

/** (G42, sector-redesign G20) Can the palm strike take this guard? Every human guard; never a dog (four-legged). */
export function strikeTargetable(def: { readonly quadruped: boolean }): boolean {
  return !def.quadruped;
}

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
