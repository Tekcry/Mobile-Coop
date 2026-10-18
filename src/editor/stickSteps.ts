/**
 * Stick and D-pad to menu steps (ON0a decision 8b), pure: one helper every editor menu uses (the hub, the tile menu,
 * the selection card, the side panel, the name list and the on-screen keyboard). A push past the dead zone steps once
 * at once; held, it repeats after FIRST seconds and speeds up the longer it is held and the further it is pushed.
 * Babylon- and DOM-free (tests/editor/stickSteps.test.ts).
 */

/** Seconds and stick fractions. DEAD is the menu dead zone (a clear push, not a drift). */
export const STEPS = { DEAD: 0.5, FIRST: 0.35, EVERY: 0.16, FASTEST: 0.04, ACCEL: 1.5 } as const;
/** "Repeat speed" in the hub's Settings scales the repeat rate. */
export const REPEAT_SPEED = { MIN: 0.5, MAX: 2, STEP: 0.25 } as const;

/** One axis: feed it the axis value each frame; it returns -1, 0 or 1 steps. */
export class StepRepeat {
  private dir = 0;
  private since = 0;
  private next = 0;
  /** Repeat speed (1 = normal). */
  speed = 1;

  update(v: number, now: number): -1 | 0 | 1 {
    const a = Math.abs(v);
    const d = a > STEPS.DEAD ? (v > 0 ? 1 : -1) : 0;
    if (d === 0) {
      this.dir = 0;
      return 0;
    }
    if (d !== this.dir) {
      this.dir = d;
      this.since = now;
      this.next = now + STEPS.FIRST / this.speed;
      return d;
    }
    if (now < this.next) return 0;
    this.next = now + repeatEvery(now - this.since - STEPS.FIRST / this.speed, a) / this.speed;
    return d;
  }

  /** Forget the held direction (a menu opened or closed). */
  reset(): void {
    this.dir = 0;
  }
}

/** Seconds to the next repeat after `held` seconds of repeating at push `a` (0..1): faster when held longer or pushed further. */
export function repeatEvery(held: number, a: number): number {
  const t = Math.min(1, Math.max(0, held) / STEPS.ACCEL);
  const push = Math.min(1, Math.max(0, (a - STEPS.DEAD) / (1 - STEPS.DEAD)));
  return (STEPS.EVERY + (STEPS.FASTEST - STEPS.EVERY) * t) * (2 - push);
}

/** The D-pad wins over the stick; on the stick only the stronger axis counts (no diagonal double steps). */
export function navAxes(dpadX: number, dpadY: number, sx: number, sy: number): { x: number; y: number } {
  if (dpadX || dpadY) return { x: dpadX, y: dpadY };
  return Math.abs(sx) >= Math.abs(sy) ? { x: sx, y: 0 } : { x: 0, y: sy };
}
