/**
 * Goggle vision modes (pure), unit-tested. One button toggles off <-> night vision (step 14 adds thermal / electro).
 *
 * Night vision brightens the dark (rendering only; gameplay light is unchanged: being seen still depends on the light
 * on you). (Step 4b fix round 3, Michael 2026-10-09) it does not fade: the goggles flip down (or up) in front of the
 * eyes over `VISION.flip` s, and the image switches at the middle, while the housing covers the view.
 */

export type VisionMode = 'off' | 'night';

export const VISION = {
  /** The goggles flipping down / up in front of the eyes (s); night vision switches at the middle. */
  flip: 0.2,
} as const;

export class VisionState {
  mode: VisionMode = 'off';
  /** Night vision on (1) or off (0): no fade, it switches at the middle of the flip. */
  night = 0;
  /** Time into the goggles' flip (s; `VISION.flip` = done) and its direction (true: flipping down, on). */
  private flipT: number = VISION.flip;
  private flipDown = true;

  /** The vision button: off <-> night. */
  cycle(): VisionMode {
    this.mode = this.mode === 'off' ? 'night' : 'off';
    return this.mode;
  }

  set(m: VisionMode): void {
    this.mode = m;
  }

  /** Advance the goggles' flip. */
  step(dt: number): void {
    const want = this.mode === 'night' ? 1 : 0;
    if (want !== this.night && this.flipT >= VISION.flip) {
      this.flipT = 0;
      this.flipDown = want === 1;
    }
    if (this.flipT < VISION.flip) {
      this.flipT = Math.min(VISION.flip, this.flipT + dt);
      if (this.flipT >= VISION.flip / 2) this.night = want;
    }
  }

  /** The flip in progress: 0..1 (1 = none). */
  get flipPhase(): number {
    return this.flipT / VISION.flip;
  }

  /**
   * The goggles' housing across the view, as the centre of a dark band in screen height (0 bottom, 1 top): flipping
   * down it sweeps from above the screen to below it, flipping up the other way; it covers the whole view at the middle.
   * NaN when no flip is running.
   */
  get flipCentre(): number {
    const t = this.flipPhase;
    if (t >= 1) return NaN;
    return this.flipDown ? 1.7 - 2.4 * t : -0.7 + 2.4 * t;
  }
}
