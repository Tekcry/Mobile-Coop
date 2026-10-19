/**
 * Weapon carry state (SWAT ready positions). Pure, unit-tested.
 *
 * At rest the weapon sits in a ready position, chosen by context and blended by weight:
 *  - low ready (default in the open): muzzle 35-45 degrees down, slightly inboard
 *  - high ready (tight corridors, traversal): muzzle up
 *  - compressed ready (near walls, doorways, cover edges, reloading): pulled to the chest
 *    (sprinting keeps the low ready: the tuck would drive the gun into the chest at full stride)
 * It is raised (shouldered, on the aim line) only while aiming or firing. Firing from a ready position
 * first raises the weapon (time scaled by weapon weight); after the last shot it stays up briefly, then
 * eases back down. `canFire` gates the trigger until the weapon is up.
 */
export type ReadyPos = 'low' | 'high' | 'compressed';

export interface CarryInput {
  /** ADS held / toggled. */
  ads: boolean;
  /** Trigger held. */
  fire: boolean;
  /** Seconds since the last shot. */
  sinceShot: number;
  /** Wall or obstacle within a weapon length in front (muzzle would clip). */
  nearWall: boolean;
  /** Walls close on both sides (corridor, doorway). */
  tight: boolean;
  doorway: boolean;
  dashing: boolean;
  reloading: boolean;
  traversing: boolean;
  /** Cover pose wants the weapon up (peek, lean, blind fire). */
  coverRaise: boolean;
  /** Weapon mass factor (1 = rifle; pistol ~0.7, sniper ~1.35). */
  weight: number;
  /** (F6) Seconds for this raise instead of `raiseTime` x weight (0 = the default): a long gun's draw raises with its travel. */
  raiseTime: number;
}

export const CARRY = {
  /** Seconds to raise from ready to shouldered for weight 1 (F1a: about half of G103, 0.3 pistol / 0.4 rifle draw: the pistol scaled by its weight 0.7 gives ~0.32). Starting value. */
  raiseTime: 0.45,
  /**
   * Seconds to lower back to ready, every weapon. (G2, AUDIT-AIM row 2) 0.55 -> 0.3 with the 0.15 s holster: the gun is on
   * the back in one footage frame, so the cheek weld and the raised shoulders let go soon after (G103's 0.5-0.6 was the
   * camera pull-out). (G2 fix r1) 0.2 stepped the weapon pitch channel ~0.1 rad a frame toward the low ready (0.8 rad)
   * on the sprint holster (e2e-anim continuity); 0.3 keeps it near 0.065. Starting value.
   */
  lowerTime: 0.3,
  /** Stay raised this long after the last shot. */
  holdAfterFire: 0.6,
  /** Ready-position cross-fade (s). */
  readyFade: 0.25,
  /** Fraction of the raise at which the trigger is live. */
  fireThreshold: 0.85,
};

/**
 * (F6, playtest 2 "rifle has a weird low ready before holding up to shoulder") A long gun's draw raises with its travel:
 * the swap / draw blocks the raise only until the swap clip reaches `from`, then the raise runs over `time` s.
 * (CT prototype G2, AUDIT-AIM rows 1 / 17, replaces F6's 0.5 / 0.45) from 0.5 -> 0.3: a draw from the back enters the clip
 * at its holstered beat (0.38), so the raise starts with the draw and the weapon target is already rising while the gun
 * comes over the shoulder: no 0.3 s hold at the chest (shots/f/draw-side 0.25-0.55 s), which CT never shows (105845
 * 2.77-3.7: over the shoulder, muzzle up, down onto the line, settled). time 0.45 -> 0.25: shouldered (0.9) about 0.25 s
 * after the press, the whole draw with the 0.3 s travel about 0.55 s to settled. Starting values (G10).
 */
export const DRAW_RAISE = { from: 0.3, time: 0.25 };

export function emptyCarryInput(): CarryInput {
  return {
    ads: false,
    fire: false,
    sinceShot: 99,
    nearWall: false,
    tight: false,
    doorway: false,
    dashing: false,
    reloading: false,
    traversing: false,
    coverRaise: false,
    weight: 1,
    raiseTime: 0,
  };
}

/** Which ready position the context calls for (when not raised). */
export function pickReady(i: CarryInput): ReadyPos {
  if (i.reloading || i.nearWall || i.doorway) return 'compressed';
  if (i.traversing || i.tight) return 'high';
  return 'low';
}

export class WeaponCarry {
  ready: ReadyPos = 'low';
  /** 0 = at the ready position, 1 = shouldered on the aim line. Eased. */
  raise = 0;
  private raiseV = 0;
  readonly w: Record<ReadyPos, number> = { low: 1, high: 0, compressed: 0 };

  /** True if the weapon must not be raised at all right now. */
  static blocked(i: CarryInput): boolean {
    return i.dashing || i.traversing || i.reloading;
  }

  update(dt: number, i: CarryInput, C = CARRY): void {
    const blocked = WeaponCarry.blocked(i);
    const want = !blocked && (i.ads || i.fire || i.coverRaise || i.sinceShot < C.holdAfterFire) ? 1 : 0;
    // heavier weapons raise slower; the lower is the same for every weapon (G103)
    const time = want > this.raise ? (i.raiseTime > 0 ? i.raiseTime : C.raiseTime * Math.max(0.5, i.weight)) : C.lowerTime;
    const omega = 4 / Math.max(0.05, time);
    // critically damped: anticipation-free but eased in/out, never overshoots past fully raised
    const e = Math.exp(-omega * dt);
    const d = this.raise - want;
    const t1 = (this.raiseV + omega * d) * dt;
    this.raise = Math.max(0, Math.min(1, want + (d + t1) * e));
    this.raiseV = (this.raiseV - omega * t1) * e;
    this.ready = pickReady(i);
    const step = dt / C.readyFade;
    let sum = 0;
    for (const k of ['low', 'high', 'compressed'] as const) {
      this.w[k] = k === this.ready ? Math.min(1, this.w[k] + step) : Math.max(0, this.w[k] - step);
      sum += this.w[k];
    }
    for (const k of ['low', 'high', 'compressed'] as const) this.w[k] /= sum || 1;
  }

  /** The trigger is live once the weapon is (nearly) shouldered. */
  canFire(i: CarryInput, C = CARRY): boolean {
    return !WeaponCarry.blocked(i) && this.raise >= C.fireThreshold;
  }
}

/** Weapon mass factor by class (data default; weapons.json may override with `weight`). */
export function classWeight(cls: string): number {
  switch (cls) {
    case 'pistol':
      return 0.7;
    case 'smg':
      return 0.85;
    case 'shotgun':
      return 1.15;
    case 'sniper':
      return 1.35;
    default:
      return 1;
  }
}
