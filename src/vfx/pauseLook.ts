/**
 * The pause look (menu-ui MD14, SPEC 7.20). Render-only: depth of field opens on the local player (focus distance =
 * camera to the player's chest) so the world behind blurs while the operator stays sharp. `PostStack` reads `level`
 * (0..1) and draws the aperture; gameplay never reads it. Low preset / no depth of field: the pause screen's CSS
 * overlay covers the frame instead (the `no-dof` class), no blur and no `backdrop-filter`.
 */

/** Ease time (ms) of the blur in (SPEC 2: pause blur 250 ms); reduced motion is instant. */
export const PAUSE_EASE_MS = 250;
/** The pause aperture (1 / f-stop): f/1.8, shallower than aiming (f/2.8), so the background reads clearly blurred. */
export const PAUSE_APERTURE = 1 / 1.8;

/** One step of the level toward its target: linear over `PAUSE_EASE_MS`, instant when `reduced`. Pure. */
export function stepPauseLevel(level: number, on: boolean, dtMs: number, reduced: boolean): number {
  const want = on ? 1 : 0;
  if (reduced) return want;
  const d = dtMs / PAUSE_EASE_MS;
  return want > level ? Math.min(want, level + d) : Math.max(want, level - d);
}

/** The aperture the pause look asks the depth of field for at `level`. */
export function pauseAperture(level: number): number {
  return level * PAUSE_APERTURE;
}

/** Tracks the look by wall-clock time (the sim is frozen while paused, so its dt is 0). */
export class PauseLook {
  level = 0;
  private on = false;
  private last = 0;

  get active(): boolean {
    return this.on || this.level > 0;
  }

  set(on: boolean, now = performance.now()): void {
    if (on && !this.on) this.last = now;
    this.on = on;
  }

  /** Advance to `now` (ms); returns the level. */
  step(reduced: boolean, now = performance.now()): number {
    const dt = Math.min(100, Math.max(0, now - this.last));
    this.last = now;
    this.level = stepPauseLevel(this.level, this.on, dt, reduced);
    return this.level;
  }
}
