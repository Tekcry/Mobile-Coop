/**
 * (anim-rework S1, BRIEF section 1; Michael 2026-10-20: "i want to make LT the aim, held, not toggled. There should be 3
 * character states. Holstered, low ready, aiming. There should be a button to holster the gun which enables
 * traversal.") The player's weapon state, pure and Babylon-free (unit-tested in `tests/weaponStance.test.ts`):
 *
 * - holstered: the gun on the sling / in the holster, hands free (traversal, strikes, grabs, gadgets, doors);
 * - low ready: the gun out, carried down and in, the explore camera;
 * - aiming: LT (RMB) held: the over-the-shoulder aim; let go and the gun drops to low ready (no toggle; the
 *   `gameplay.adsToggle` setting can make it one);
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
  /** (M2) LT from holstered: the draw takes this many times the class's draw time (the sling draw). */
  slingDrawMult: 1.6,
  /** (M3) RT / LMB held this long (s) holstered or holding a guard: the kill; released sooner: the knockout. */
  rtHold: 0.35,
} as const;

export interface StanceInput {
  /** X / the draw key held. */
  xDown: boolean;
  /** LT / RMB held (the `ads` action). */
  aimDown: boolean;
  /** `gameplay.adsToggle`: a press toggles the aim instead of holding it. */
  aimToggle: boolean;
  alive: boolean;
  /** A traversal or busy move holds the state (the gun is away for it; M4). */
  suspended: boolean;
  /** Holding a guard: X does nothing; the aim is the pistol shield. */
  locked: boolean;
  /** The gun is fully out (`PlayerWeapons.drawPhase` 2): the sling draw is over. */
  gunOut: boolean;
  /** Tests and tools (`Player.forceAds`): aim regardless of the input, without changing the base state. */
  forceAim: boolean;
}

export function emptyStanceInput(): StanceInput {
  return { xDown: false, aimDown: false, aimToggle: false, alive: true, suspended: false, locked: false, gunOut: false, forceAim: false };
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
  /** X reached its hold time this step while drawn (A2): the weapons reload, or holster when nothing needs it. */
  holdAsk = false;
  /** X taps / holds seen (tests). */
  taps = 0;
  holds = 0;
  private xT = -1;
  private xUsed = false;
  private aimWas = false;
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
    // the aim: held (default) or toggled
    const pressed = i.aimDown && !this.aimWas;
    this.aimWas = i.aimDown;
    if (i.aimToggle) {
      if (pressed) this.aimLatch = !this.aimLatch;
    } else this.aimLatch = i.aimDown;
    if (!this.aimLatch) this.aimBlock = false;
    const aimRaw = this.aimLatch && !this.aimBlock;
    const free = !i.suspended && !i.locked;
    // X: a press from holstered draws now; else a tap holsters and a hold asks for the reload
    if (i.xDown) {
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
    this.holdAsk = false;
    this.xT = -1;
    this.xUsed = false;
    this.aimWas = false;
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
