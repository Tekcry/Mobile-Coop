/**
 * (guard-ai S16, A80-A86) The armour fire gate: a guard decides to fire on sight (`MASK.SIGHT`, which clear armoured glass
 * passes, E10), so before a burst and before each round he tests the fire line, muzzle -> aim point, on the enemy shot
 * mask. When the first thing on it carries the armour bit (an armoured pane or door leaf, `G.GLASS_ARMOURED`) he holds
 * fire: he keeps seeing, tracking and reporting the target, never shoots into the armour, and after a moment repositions
 * (another cover spot with a clear line, else round by the nav) or, held to a room or a post, holds.
 *
 * Pure and Babylon-free. The verdict is cached per guard for `recheck` s while neither his own nav cell nor the aim's
 * changes, so the ray is cast at most ~4 times a second per guard in a fight; nothing here allocates.
 */

export interface ArmourP3 {
  x: number;
  y: number;
  z: number;
}

/** The one physics query the gate needs (`Ballistics.armouredFirst`; tests pass a stand-in). */
export interface ArmourRay {
  /** The first hit in `mask` from `from` to `to` carries the armour bit (false: nothing hit, or something else first). */
  armouredFirst(from: ArmourP3, to: ArmourP3, mask: number): boolean;
}

export const ARMOUR_FIRE = {
  /** s a verdict is kept while the guard's own cell and the aim cell stay the same (A81). */
  recheck: 0.25,
  /** s of held fire at armour, the target in sight, before he repositions (A82). */
  moveAfter: 1.0,
  /** s a reposition lasts at most (a cover spot with a clear line, or round by the nav) before he holds again (A82). */
  moveT: 8,
  /** s after a reposition ends before another may start; in between he holds (A82). */
  retry: 6,
  /** Fire-line casts one cover pick may spend testing spots for a clear line (A83). */
  coverCasts: 6,
} as const;

/** What the guard does about the fire line: shoot, hold (track, no rounds), start a reposition, or keep repositioning. */
export type ArmourPlan = 'fire' | 'hold' | 'move' | 'moving';

/** One guard's gate state (a field on the guard; reused, never reallocated). */
export class ArmourGate {
  /** The last verdict: the fire line's first hit is armoured. */
  blocked = false;
  /** s the cached verdict stays valid. */
  t = 0;
  /** The cells the verdict was cast for (his own nav cell, the aim's). */
  fromCell = -1;
  toCell = -1;
  /** s he has held fire with the line armoured (reset by a clear line). */
  held = 0;
  /** s left of the reposition under way (0: none). */
  moveT = 0;
  /** s until another reposition may start. */
  cool = 0;
  /** Rays cast so far (debug / tests). */
  casts = 0;
  /** Ticks he wanted to fire and held at armour (debug / tests). */
  heldTicks = 0;

  /** Timers: one sim step. */
  step(dt: number): void {
    this.t -= dt;
    if (this.moveT > 0) this.moveT = Math.max(0, this.moveT - dt);
    if (this.cool > 0) this.cool = Math.max(0, this.cool - dt);
  }

  /** The verdict for this fire line: cached while fresh and the cells match, else one cast. */
  check(ray: ArmourRay, from: ArmourP3, to: ArmourP3, mask: number, fromCell: number, toCell: number): boolean {
    if (this.t > 0 && fromCell === this.fromCell && toCell === this.toCell) return this.blocked;
    this.blocked = ray.armouredFirst(from, to, mask);
    this.t = ARMOUR_FIRE.recheck;
    this.fromCell = fromCell;
    this.toCell = toCell;
    this.casts++;
    return this.blocked;
  }

  /** The fire gate (each call is one tick he wants to shoot): true holds fire. A clear line ends a reposition. */
  gate(ray: ArmourRay, from: ArmourP3, to: ArmourP3, mask: number, fromCell: number, toCell: number, dt: number): boolean {
    if (this.check(ray, from, to, mask, fromCell, toCell)) {
      this.held += dt;
      this.heldTicks++;
      return true;
    }
    this.held = 0;
    this.moveT = 0;
    return false;
  }

  /**
   * What he does with the target in sight. `canMove` false (held to a room or a post leash): he only holds. A move
   * starts after `moveAfter` s of held fire and not within `retry` s of the last one ending.
   */
  plan(canMove: boolean): ArmourPlan {
    if (!this.blocked) return 'fire';
    if (this.moveT > 0) return 'moving';
    if (canMove && this.held >= ARMOUR_FIRE.moveAfter && this.cool <= 0) {
      this.moveT = ARMOUR_FIRE.moveT;
      this.cool = ARMOUR_FIRE.moveT + ARMOUR_FIRE.retry;
      this.held = 0;
      return 'move';
    }
    return 'hold';
  }

  /** Combat over (or a fresh guard): forget the line. */
  reset(): void {
    this.blocked = false;
    this.t = 0;
    this.fromCell = -1;
    this.toCell = -1;
    this.held = 0;
    this.moveT = 0;
    this.cool = 0;
  }
}
