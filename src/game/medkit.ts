/**
 * (locomotion step 15) Chaos Theory medkits (bible 5.13): health 100, a kit heals 40 over 1.5 s (2.0 s on a team-mate,
 * C14), any damage interrupts it (the kit is still spent, A56), carry 2 (3 at Rookie). Pure and unit-tested: the
 * controller (`medkitController.ts`) and the co-op host (`coopHost.ts`) run on it.
 */

export const MEDKIT = {
  /** Health a kit restores (hp, of 100). */
  heal: 40,
  /** Seconds to use one on yourself. */
  time: 1.5,
  /** Seconds to use one on a team-mate (H2, bible C14). */
  mateTime: 2.0,
  /** Kits carried (Normal and up) and at Rookie. */
  carry: 2,
  carryRookie: 3,
  /** The most anyone carries (the wire clamp of `mk`). */
  max: 3,
  /** Pad: X held this long (s) while not aiming uses a kit (a tap stays reload). */
  padHold: 0.4,
  /** Wall medkit station: hold to take a kit (s). */
  wallHold: 0.6,
  /** Client prediction: no host reply in this long (s) cancels. */
  replyTimeout: 0.4,
  /** The host reads a client's cancel from its MoveState leaving `medkit`, only from a snapshot that arrived after the
   *  start: once one showed the use, or from the second such snapshot (one reordered or stale state is tolerated). */
  hostStates: 2,
  /** Near the end (s left) the host lets the use finish: the client's own end (clock-aligned) may arrive first. */
  hostEndSlack: 0.25,
} as const;

/** Who a kit is used on: yourself, or a team-mate by player id (H2: any target; only self is wired). */
export interface MedkitTarget {
  /** Player id ('' = self). */
  id: string;
  mate: boolean;
}

export const SELF_TARGET: MedkitTarget = { id: '', mate: false };

/** Kits carried at the start for a difficulty (`DifficultyDef.medkits`). */
export function medkitCarry(def: { medkits?: number } | null | undefined): number {
  const n = def?.medkits ?? MEDKIT.carry;
  return Math.max(0, Math.min(MEDKIT.max, Math.floor(n)));
}

/** One more kit, up to `max`; returns the new count (unchanged when full). */
export function addKit(count: number, max: number): number {
  return count >= max ? count : count + 1;
}

/** Why a kit cannot be used now: no kits, at full health, dead; null = may use. */
export function medkitDenial(kits: number, hp: number, maxHp: number, alive: boolean): 'none' | 'full' | 'dead' | null {
  if (!alive) return 'dead';
  if (kits <= 0) return 'none';
  if (hp >= maxHp) return 'full';
  return null;
}

export interface HealTarget {
  hp: number;
  readonly maxHp: number;
  readonly alive: boolean;
  heal(n: number): void;
}

export type MedkitStep = 'run' | 'done' | 'hit';

/**
 * One kit in use: heals linearly over its time onto a `HealTarget`. Damage (hp below what the heal left) interrupts:
 * the heal so far stays, the kit is spent. A player cancel (aim, jump, sprint) takes the heal so far back and does not
 * spend the kit (A56).
 */
export class MedkitUse {
  /** Seconds into the use (-1 = none). */
  t = -1;
  dur: number = MEDKIT.time;
  /** Health actually given so far (a heal clamped at maxHp counts only what was added). */
  healed = 0;
  /** The kit's heal reached so far (MEDKIT.heal x progress), clamped or not. */
  private given = 0;
  target: MedkitTarget = SELF_TARGET;
  private lastHp = 0;

  get active(): boolean {
    return this.t >= 0;
  }

  /** Progress 0..1 (the MoveState `ph`, the HUD fill). */
  get progress(): number {
    return this.t < 0 ? 0 : Math.min(1, this.t / this.dur);
  }

  start(target: MedkitTarget, hpNow: number): void {
    this.target = target;
    this.dur = target.mate ? MEDKIT.mateTime : MEDKIT.time;
    this.t = 0;
    this.healed = 0;
    this.given = 0;
    this.lastHp = hpNow;
  }

  /** Advance `dt` s healing `h`: 'run', 'done' (the full 40 given) or 'hit' (damage interrupted it). */
  step(dt: number, h: HealTarget): MedkitStep {
    if (this.t < 0) return 'done';
    if (!h.alive || h.hp < this.lastHp - 1e-6) {
      this.t = -1;
      return 'hit';
    }
    this.t += dt;
    const want = MEDKIT.heal * Math.min(1, this.t / this.dur);
    const add = want - this.given;
    if (add > 0) {
      const before = h.hp;
      h.heal(add);
      if (h.hp > before) this.healed += h.hp - before;
    }
    this.given = want;
    this.lastHp = h.hp;
    if (this.t >= this.dur) {
      this.t = -1;
      return 'done';
    }
    return 'run';
  }

  /** A player cancel: the heal so far is taken back (never below 1 hp), the kit not spent. */
  cancel(h: HealTarget | null): void {
    if (this.t < 0) return;
    if (h && h.alive) h.hp = Math.max(Math.min(h.hp, 1), h.hp - this.healed);
    this.t = -1;
    this.healed = 0;
    this.given = 0;
  }
}
