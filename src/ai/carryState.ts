/**
 * (guard-ai S21, Michael's walk of 4.72 G5: "they also dont always have to be low-ready, then can walk around holstered
 * if they are in a calm area.") Every guard stays armed (decision 2026-10-23 ~01:25); a calm guard in a calm area
 * carries his gun holstered / slung (the rifle across his back, the pistol on his right thigh), draws it (the draw clip)
 * as soon as anything raises him above calm, and holsters it again only after a calm hold, so it never flickers. Low
 * ready from suspicious / cautious up, raised in combat (the aim weights stay in `Enemy.frame`).
 *
 * Pure and Babylon-free: `calmArea` (the rule), `mayHolster` (who ever holsters), `carrySlotOf` (where), `GuardCarry`
 * (the fixed-step draw / holster machine the brain gates fire on and the rig poses from, `enemyRig.ts` GuardGunCarry).
 * No allocation per step.
 */
import type { AlertLevel } from './alertState';
import { DRAW_BEAT } from '../anim/drawMotion';
import { carryKind, type CarrySlot } from '../weapons/carrySlots';

/** (guard-ai S21, A120-A126) The numbers. Undo: `enabled` false (every guard at low ready, as before S21). */
export const GUARD_CARRY = {
  enabled: true,
  /** Calm this long (s, without a break) before he holsters again (A122). */
  calmHold: 15,
  /** Draw time (s) per carry kind (A123: quicker than the player's N3 1.1 / 0.75 s; CT guards shoulder fast). */
  draw: { long: 0.7, compact: 0.6, pistol: 0.5 },
  /** Holster time (s) per carry kind (the player's N3 deliberate holster, `drawState.ts`). */
  holster: { long: 1.0, compact: 0.9, pistol: 0.9 },
  /** A draw that reverses a holster takes the holster's share done so far of the draw, at least this (s). */
  reverseMin: 0.15,
  /** Kinds that never holster (A121): the sniper on his watch, the enforcer behind his shield. */
  never: ['sniper', 'enforcer'] as readonly string[],
};

/** Holstered / slung, hands empty (the ready-hands carry). */
export const CARRY_HOLSTERED = 0;
/** The draw clip runs (no fire until it ends). */
export const CARRY_DRAWING = 1;
/** In the hands: low ready or raised. */
export const CARRY_DRAWN = 2;
/** The holster clip runs. */
export const CARRY_HOLSTERING = 3;
export type CarryPhase = 0 | 1 | 2 | 3;

/**
 * (A120) A calm area for this guard: he is calm (unaware: no suspicion, investigation, search or combat; no caution, S4 /
 * S14 section alert; no board task or camera body), no alarm is raised (S6), he is not a high-security post (S5) and not
 * on a response (a device's responder S17, a response team S13).
 */
export function calmArea(level: AlertLevel, caution: number, busy: boolean, alarm: boolean, secure: boolean, response: boolean): boolean {
  return level === 'unaware' && caution === 0 && !busy && !alarm && !secure && !response;
}

/** (A121) Whether a guard of this kind ever holsters: a gun, no melee, not a dog, not a `GUARD_CARRY.never` kind. */
export function mayHolster(kind: string, gun: string | null, melee: boolean, quadruped: boolean): boolean {
  return GUARD_CARRY.enabled && gun !== null && !melee && !quadruped && !GUARD_CARRY.never.includes(kind);
}

/** (A124) Where the holstered gun rides (the player's slots, `carrySlots.ts`): a long gun slung across the back (backC),
 *  a compact on the hip sling, the pistol on the right thigh. */
export function carrySlotOf(cls: string): CarrySlot {
  const k = carryKind(cls);
  return k === 'pistol' ? 'thigh' : k === 'compact' ? 'sling' : 'backC';
}

/** The rig's raise (`RigPose.aim`) for the brain's aim weight `aim` (low ready 0.2-0.7, raised 1 in combat): none while
 *  holstered; through a draw the raise he wants (the travel ends in the pocket at the rig's raise, so the hand-over to
 *  the hold never jumps: gating it to 0 until drawn popped the gun 15-34 cm at the hand-over). */
export function carryRaise(aim: number, c: GuardCarry): number {
  return c.holstered ? 0 : aim;
}

/** The fixed-step draw / holster machine of one guard. */
export class GuardCarry {
  phase: CarryPhase = CARRY_DRAWN;
  /** Progress of the running draw / holster, 0..1. */
  u = 0;
  /** Calm without a break (s). */
  calmT = 0;
  /** Phase changes so far (the render side starts a travel on a change). */
  seq = 0;
  private dur = 1;
  private started = false;
  readonly drawTime: number;
  readonly holsterTime: number;

  /** `on` false: always drawn (a kind that never holsters, or S21 off). */
  constructor(
    readonly on: boolean,
    cls: string,
  ) {
    const k = carryKind(cls);
    this.drawTime = GUARD_CARRY.draw[k];
    this.holsterTime = GUARD_CARRY.holster[k];
  }

  /** In the hands, the draw done: he may fire. */
  get drawn(): boolean {
    return this.phase === CARRY_DRAWN;
  }

  /** Holstered / slung, no clip running. */
  get holstered(): boolean {
    return this.phase === CARRY_HOLSTERED;
  }

  /** One fixed step; `calm` is `calmArea` for him now. The first step takes the state he starts in (no clip). */
  step(dt: number, calm: boolean): void {
    if (!this.on) {
      if (this.phase !== CARRY_DRAWN) this.set(CARRY_DRAWN, 1);
      return;
    }
    if (!this.started) {
      this.started = true;
      this.calmT = calm ? GUARD_CARRY.calmHold : 0;
      this.set(calm ? CARRY_HOLSTERED : CARRY_DRAWN, 1);
      return;
    }
    this.calmT = calm ? this.calmT + dt : 0;
    switch (this.phase) {
      case CARRY_HOLSTERED:
        if (!calm) this.set(CARRY_DRAWING, this.drawTime);
        break;
      case CARRY_DRAWN:
        if (calm && this.calmT >= GUARD_CARRY.calmHold) this.set(CARRY_HOLSTERING, this.holsterTime);
        break;
      case CARRY_DRAWING:
        // calm again mid-draw: the draw ends, then the calm hold. The end (u 1) shows for a step before the hand-over, so
        // the travel's last pose (the settle in the pocket) is posed and the gun is never held from short of it
        if (this.u >= 1) this.set(CARRY_DRAWN, 1);
        else this.u = Math.min(1, this.u + dt / this.dur);
        break;
      case CARRY_HOLSTERING:
        if (!calm) {
          // stirred mid-holster: straight back up from where it is (the gun is still in his hand)
          this.set(CARRY_DRAWING, Math.max(GUARD_CARRY.reverseMin, this.drawTime * this.u));
          break;
        }
        if (this.u >= 1) this.set(CARRY_HOLSTERED, 1);
        else this.u = Math.min(1, this.u + dt / this.dur);
        break;
    }
  }

  /** The swap clip's time for the rig (`RigPose.swap`): a holster 0 .. DRAW_BEAT, a draw DRAW_BEAT .. 1, else -1. */
  swapClip(): number {
    const u = this.u < 0 ? 0 : this.u > 1 ? 1 : this.u;
    if (this.phase === CARRY_DRAWING) return DRAW_BEAT + u * (1 - DRAW_BEAT);
    if (this.phase === CARRY_HOLSTERING) return u * DRAW_BEAT;
    return -1;
  }

  private set(p: CarryPhase, dur: number): void {
    this.phase = p;
    this.u = 0;
    this.dur = dur > 1e-3 ? dur : 1e-3;
    this.seq++;
  }
}
