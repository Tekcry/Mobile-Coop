/**
 * (anim-rework S1, BRIEF section 1; Michael 2026-10-20: "i want to make LT the aim, held, not toggled. There should be 3
 * character states. Holstered, low ready, aiming. There should be a button to holster the gun which enables
 * traversal.") The player's weapon state, pure and Babylon-free (unit-tested in `tests/weaponStance.test.ts`):
 *
 * - holstered: the gun on the sling / in the holster, hands free (traversal, strikes, grabs, gadgets, doors);
 * - low ready: the gun out, carried down and in, the explore camera;
 * - aiming: LT (RMB) held: the over-the-shoulder aim; let go and the gun drops to low ready (no toggle; the
 *   Michael 15:25 on a toggle option: "Remove it");
 * - sling draw (M2): LT from holstered draws straight to the aim, slower than from low ready (the gun comes off the
 *   sling first; `STANCE.slingDrawMult`), its own state until the gun is out.
 *
 * X (M1, A2): a tap toggles holstered <-> low ready (from holstered the draw starts on the press, so a held X draws
 * too); held `STANCE.xHold` s while drawn it asks for a reload (`holdAsk`: the weapons reload, or holster when there is
 * nothing to reload). An X tap while aiming holsters (the aim is blocked until LT is let go).
 * Traversal and the attached / busy moves (`suspended`, M4) hold the state: the gun goes away for the move and the
 * state it had (low ready, or aiming with LT still held) comes back when the move ends. Holding a guard (`locked`)
 * ignores X; LT there is the pistol over his shoulder (the aim, not a stance change).
 * Every number is a starting value.
 */

export type WeaponStateId = 'holstered' | 'lowReady' | 'aiming' | 'slingDraw';

export const STANCE = {
  /** X held this long (s) while drawn: the reload (A2); shorter is the holster / draw tap (M1). */
  xHold: 0.4,
  /** (M2) LT from holstered: the draw takes this many times the class's draw time (the sling draw): the pistol. */
  slingDrawMult: 1.6,
  /** (anim-rework S3, M2) A long gun's sling draw: its own path (WeaponModel TRAVEL_VIA.sling, backDiag.diagTurnSling),
   *  2.5 x the 0.3 s draw = 0.75 s: off the sling round the right side, under the arm, swung up into the shoulder.
   *  (anim-natural N3) 1.36 x the 1.1 s draw (DRAW_TIME_PRIMARY) = 1.5 s: the draw plus the raise to the shoulder
   *  (`docs/archive/anim-natural/n3/DRAW-TIMES.md`). Undo: 2.5 with the 0.3 s draw. */
  slingDrawLong: 1.36,
  /** (M3) RT / LMB held this long (s) holstered or holding a guard: the kill; released sooner: the knockout. */
  rtHold: 0.35,
} as const;

export interface StanceInput {
  /** X / the draw key held. */
  xDown: boolean;
  /** LT / RMB held (the `ads` action). */
  aimDown: boolean;
  alive: boolean;
  /** A traversal or busy move holds the state (the gun is away for it; M4). */
  suspended: boolean;
  /** Holding a guard: X does nothing; the aim is the pistol shield. */
  locked: boolean;
  /** The gun is fully out (`PlayerWeapons.drawPhase` 2): the sling draw is over. */
  gunOut: boolean;
  /** Tests and tools (`Player.forceAds`): aim regardless of the input, without changing the base state. */
  forceAim: boolean;
  /** The input is blanked this step (a held context menu, the gadget wheel): X is neither pressed nor released; a press
   *  that runs into it is spent (no tap, no hold). */
  blank: boolean;
}

export function emptyStanceInput(): StanceInput {
  return { xDown: false, aimDown: false, alive: true, suspended: false, locked: false, gunOut: false, forceAim: false, blank: false };
}

export class WeaponStance {
  /** The state LT falls back to: holstered or low ready (X toggles it; LT from holstered sets low ready). */
  base: 'holstered' | 'lowReady' = 'holstered';
  /** The aim is wanted (LT held or toggled, not blocked; or forced). */
  aimWanted = false;
  /** (M2) The draw started from holstered by LT: slower, until the gun is out. */
  slingDraw = false;
  /** This step's state. */
  state: WeaponStateId = 'holstered';
  /** (anim-natural N3) A traversal or busy move holds the state this step (the weapons holster quickly for it). */
  suspended = false;
  /** X reached its hold time this step while drawn (A2): the weapons reload, or holster when nothing needs it. */
  holdAsk = false;
  /** X taps / holds seen (tests). */
  taps = 0;
  holds = 0;
  private xT = -1;
  private xUsed = false;
  private aimLatch = false;
  /** An X holster while LT is held: no aim until LT is let go. */
  private aimBlock = false;

  /** The gun is wanted out (low ready or aiming) and nothing holds it away. */
  get drawWanted(): boolean {
    return this.state !== 'holstered';
  }

  update(dt: number, i: StanceInput): void {
    this.holdAsk = false;
    if (!i.alive) {
      this.reset();
      return;
    }
    // the aim: held only (no toggle, Michael 15:25)
    this.aimLatch = i.aimDown;
    if (!this.aimLatch) this.aimBlock = false;
    const aimRaw = this.aimLatch && !this.aimBlock;
    const free = !i.suspended && !i.locked;
    this.suspended = i.suspended;
    // X: a press from holstered draws now; else a tap holsters and a hold asks for the reload
    if (i.blank) {
      if (this.xT >= 0) this.xUsed = true;
    } else if (i.xDown) {
      if (this.xT < 0) {
        this.xT = 0;
        this.xUsed = !free;
        if (free && this.base === 'holstered') {
          this.base = 'lowReady';
          this.aimBlock = false;
          this.xUsed = true;
          this.taps++;
        }
      } else this.xT += dt;
      if (!this.xUsed && this.xT >= STANCE.xHold) {
        this.xUsed = true;
        this.holdAsk = true;
        this.holds++;
      }
    } else {
      if (this.xT >= 0 && !this.xUsed && free) {
        this.taps++;
        this.holster();
      }
      this.xT = -1;
      this.xUsed = false;
    }
    // LT from holstered (free): straight to the aim through the sling draw; its release drops to low ready
    const aim = aimRaw && !this.aimBlock;
    if (aim && free && this.base === 'holstered') {
      this.base = 'lowReady';
      if (!i.gunOut) this.slingDraw = true;
    }
    if (i.gunOut || !aim) this.slingDraw = false;
    this.aimWanted = (aim && !this.aimBlock) || i.forceAim;
    if (i.suspended) this.state = 'holstered';
    else if (this.aimWanted) this.state = this.slingDraw ? 'slingDraw' : 'aiming';
    else this.state = i.locked ? 'holstered' : this.base;
  }

  /** (A43) A reload asked for while holstered (KBM R): the gun comes out for it and stays at low ready. */
  readyForReload(): void {
    if (this.base === 'holstered') this.base = 'lowReady';
  }

  /** Holster now (an X tap, an X hold with nothing to reload, the host's forced holster). */
  holster(): void {
    this.base = 'holstered';
    this.slingDraw = false;
    if (this.aimLatch) this.aimBlock = true;
    this.aimLatch = false;
    this.aimWanted = false;
    if (this.state !== 'holstered') this.state = 'holstered';
  }

  /** Death, respawn, a new match: holstered, nothing held. */
  reset(): void {
    this.base = 'holstered';
    this.aimWanted = false;
    this.slingDraw = false;
    this.state = 'holstered';
    this.suspended = false;
    this.holdAsk = false;
    this.xT = -1;
    this.xUsed = false;
    this.aimLatch = false;
    this.aimBlock = false;
  }
}

/**
 * (M3) The trigger's tap / hold on its own (pure, dt-based): `armed` at the press decides whether this press is a
 * strike / finisher press at all (holstered, or holding a guard and not aiming); an unarmed press is ignored to its
 * release. A release before `hold` is a tap (reported on the release), reaching `hold` is a hold (once per press).
 */
export class TriggerTapHold {
  private t = -1;
  private armed = false;
  private fired = false;

  constructor(readonly hold: number = STANCE.rtHold) {}

  /** The trigger is down and armed, with no result yet (a strike may follow). */
  get pending(): boolean {
    return this.t >= 0 && this.armed && !this.fired;
  }

  update(down: boolean, dt: number, armed: boolean): 'tap' | 'hold' | null {
    if (down) {
      if (this.t < 0) {
        this.t = 0;
        this.armed = armed;
        this.fired = false;
      } else this.t += dt;
      if (this.armed && !this.fired && this.t >= this.hold) {
        this.fired = true;
        return 'hold';
      }
      return null;
    }
    const tap = this.t >= 0 && this.armed && !this.fired;
    this.t = -1;
    this.armed = false;
    this.fired = false;
    return tap ? 'tap' : null;
  }

  reset(): void {
    this.t = -1;
    this.armed = false;
    this.fired = false;
  }
}

/** (anim-natural N3 fix) The draw phases the strike trigger reads (`weapons/drawState`: 0 holstered, 3 holstering). */
const PH_HOLSTERED = 0;
const PH_HOLSTERING = 3;

/**
 * (anim-natural N3 fix, check finding 1: RT during the 0.9-1.0 s holster was dropped) The strike trigger (RT / LMB) over
 * the draw phase, pure: a press arms when holstered, holding a guard, or holstering (X pressed, the gun on its way to the
 * slot). Its tap / hold is decided from the press as always (`TriggerTapHold`); decided while holstering it waits
 * (`pending`: the weapons finish the holster as a busy move, HOLSTER_TIME_MOVE) and `strike` hands it over once the phase
 * is holstered. Drawing or drawn again (X), the waiting strike is dropped. One `update` then one `strike` per step.
 */
export class StrikeTrigger {
  readonly tapHold = new TriggerTapHold();
  private queued: 'tap' | 'hold' | null = null;
  /** This step's result for a press decided now and not waiting on the holster (the grab menu reads it too). */
  now: 'tap' | 'hold' | null = null;
  /** A strike waits on the holster (pressed or decided while holstering). */
  pending = false;

  /** `free`: alive, not aiming, the stance holstered; `holding`: a guard held and not aiming. */
  update(down: boolean, dt: number, phase: number, free: boolean, holding: boolean): 'tap' | 'hold' | null {
    const holstering = free && phase === PH_HOLSTERING;
    let r = this.tapHold.update(down, dt, (free && phase === PH_HOLSTERED) || holding || holstering);
    if (phase !== PH_HOLSTERED && phase !== PH_HOLSTERING) this.queued = null;
    if (r !== null && phase === PH_HOLSTERING && !holding) {
      this.queued = r;
      r = null;
    }
    this.pending = phase === PH_HOLSTERING && (this.queued !== null || (holstering && this.tapHold.pending));
    this.now = r;
    return r;
  }

  /** The strike to start this step (`now`, or the one that waited, once `phase` is holstered); null: none. */
  strike(phase: number): 'tap' | 'hold' | null {
    const q = phase === PH_HOLSTERED ? this.queued : null;
    if (phase === PH_HOLSTERED) this.queued = null;
    return this.now ?? q;
  }
}
