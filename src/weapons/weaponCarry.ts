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
  coverEdge: boolean;
  dashing: boolean;
  reloading: boolean;
  traversing: boolean;
  /** Cover pose wants the weapon up (peek, lean, blind fire). */
  coverRaise: boolean;
  /** Weapon mass factor (1 = rifle; pistol ~0.7, sniper ~1.35). */
  weight: number;
}

export const CARRY = {
  /** Seconds to raise from ready to shouldered for weight 1 (120-200 ms; trigger live just before). */
  raiseTime: 0.16,
  /** Seconds to lower back to ready for weight 1 (250-350 ms). */
  lowerTime: 0.3,
  /** Stay raised this long after the last shot. */
  holdAfterFire: 0.6,
  /** Ready-position cross-fade (s). */
  readyFade: 0.25,
  /** Fraction of the raise at which the trigger is live. */
  fireThreshold: 0.85,
};

export function emptyCarryInput(): CarryInput {
  return {
    ads: false,
    fire: false,
    sinceShot: 99,
    nearWall: false,
    tight: false,
    doorway: false,
    coverEdge: false,
    dashing: false,
    reloading: false,
    traversing: false,
    coverRaise: false,
    weight: 1,
  };
}

/** Which ready position the context calls for (when not raised). */
export function pickReady(i: CarryInput): ReadyPos {
  if (i.reloading || i.nearWall || i.doorway || i.coverEdge) return 'compressed';
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
    // raise faster than lower; heavier weapons are slower both ways
    const time = (want > this.raise ? C.raiseTime : C.lowerTime) * Math.max(0.5, i.weight);
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
